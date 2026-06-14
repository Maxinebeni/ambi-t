import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const Input = z.object({
  text: z.string().trim().max(50000).optional(),
  docUrl: z.string().trim().url().max(500).optional(),
}).refine((d) => d.text || d.docUrl, { message: "Provide text or a Google Doc URL" });

interface ParsedTask {
  title: string;
  description?: string;
  department?: "Finance" | "Operations" | "Marketing";
  assignee_name?: string;
  due_date?: string; // YYYY-MM-DD
}

async function fetchGoogleDoc(url: string): Promise<string> {
  // Accept /document/d/{id}/...
  const m = url.match(/\/document\/d\/([a-zA-Z0-9-_]+)/);
  if (!m) throw new Error("That doesn't look like a Google Doc link. Paste the full URL.");
  const id = m[1];
  const exportUrl = `https://docs.google.com/document/d/${id}/export?format=txt`;
  const res = await fetch(exportUrl);
  if (!res.ok) throw new Error("Could not read the Google Doc. Make sure it's set to 'Anyone with the link can view'.");
  return await res.text();
}

export const parseActionItems = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => Input.parse(d))
  .handler(async ({ data, context }) => {
    const { data: isMgr } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "manager",
    });
    if (!isMgr) throw new Error("Only managers can parse meeting notes.");

    const key = process.env.LOVABLE_API_KEY;
    if (!key) throw new Error("AI is not configured.");

    const content = data.docUrl ? await fetchGoogleDoc(data.docUrl) : data.text!;
    if (!content || content.trim().length < 5) throw new Error("Document appears empty.");

    // load team for assignee matching
    const { data: profiles } = await context.supabase
      .from("profiles")
      .select("id, full_name, email, department");

    const teamHint = (profiles ?? [])
      .map((p) => `- ${p.full_name || p.email} (${p.department ?? "no dept"})`)
      .join("\n");

    const today = new Date().toISOString().slice(0, 10);

    const systemPrompt = `You extract action items from meeting notes for a 15-person company called Ambi-Tech with three departments: Finance, Operations, Marketing.

Today is ${today}.

For each action item, output:
- title: short imperative (e.g. "Finalize Q3 budget")
- description: any extra context
- department: one of "Finance", "Operations", "Marketing" — infer if not stated
- assignee_name: the person's name as written in the notes, if mentioned (else omit)
- due_date: YYYY-MM-DD if mentioned ("next Friday", "by end of month", etc — resolve to a real date), else omit

Known team:
${teamHint || "(no team loaded)"}

Return ONLY JSON: {"tasks":[...]}`;

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${key}` },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content },
        ],
        response_format: { type: "json_object" },
      }),
    });

    if (res.status === 429) throw new Error("AI rate limit hit. Try again in a moment.");
    if (res.status === 402) throw new Error("AI credits exhausted. Add credits in your Lovable workspace.");
    if (!res.ok) throw new Error(`AI error (${res.status})`);

    const json = await res.json();
    const text = json.choices?.[0]?.message?.content ?? "{}";
    let parsed: { tasks?: ParsedTask[] };
    try { parsed = JSON.parse(text); } catch { parsed = { tasks: [] }; }
    const tasks = (parsed.tasks ?? []).filter((t) => t?.title);

    // Match assignees by name
    const byName = new Map<string, string>();
    (profiles ?? []).forEach((p) => {
      if (p.full_name) byName.set(p.full_name.toLowerCase(), p.id);
      if (p.email) byName.set(p.email.toLowerCase().split("@")[0], p.id);
    });

    const enriched = tasks.map((t) => ({
      ...t,
      assignee_id: t.assignee_name ? byName.get(t.assignee_name.toLowerCase()) ?? null : null,
    }));

    return { tasks: enriched };
  });

const CreateBatchInput = z.object({
  tasks: z.array(z.object({
    title: z.string().trim().min(1).max(255),
    description: z.string().trim().max(2000).optional().nullable(),
    department: z.enum(["Finance", "Operations", "Marketing"]).optional().nullable(),
    assignee_id: z.string().uuid().optional().nullable(),
    due_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable(),
  })).min(1).max(100),
});

export const createTasksBatch = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => CreateBatchInput.parse(d))
  .handler(async ({ data, context }) => {
    const { data: isMgr } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "manager",
    });
    if (!isMgr) throw new Error("Forbidden");

    const today = new Date();
    const day = today.getDay() || 7; // Mon=1..Sun=7
    const monday = new Date(today);
    monday.setDate(today.getDate() - (day - 1));
    const weekStart = monday.toISOString().slice(0, 10);

    const rows = data.tasks.map((t) => ({
      title: t.title,
      description: t.description ?? null,
      department: t.department ?? null,
      assignee_id: t.assignee_id ?? null,
      due_date: t.due_date ?? null,
      week_start: weekStart,
      created_by: context.userId,
    }));
    const { error, data: inserted } = await context.supabase.from("tasks").insert(rows).select("id");
    if (error) throw new Error(error.message);
    return { count: inserted?.length ?? 0 };
  });
