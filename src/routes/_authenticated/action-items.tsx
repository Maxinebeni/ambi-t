import { createFileRoute, redirect } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DeptBadge } from "@/components/StatusBadge";
import { Sparkles } from "lucide-react";
import { toast } from "sonner";
import { parseActionItems, createTasksBatch } from "@/lib/ai.functions";

export const Route = createFileRoute("/_authenticated/action-items")({
  head: () => ({ meta: [{ title: "Meeting Notes — Ambi-Tech" }] }),
  beforeLoad: async () => {
    const { data } = await supabase.auth.getUser();
    if (!data.user) throw redirect({ to: "/auth" });
    const { data: roles } = await supabase.from("user_roles").select("role").eq("user_id", data.user.id);
    if (!roles?.some((r) => r.role === "manager")) throw redirect({ to: "/dashboard" });
  },
  component: ActionItemsPage,
});

function ActionItemsPage() {
  const parse = useServerFn(parseActionItems);
  const create = useServerFn(createTasksBatch);
  const qc = useQueryClient();
  const [text, setText] = useState("");
  const [url, setUrl] = useState("");
  const [parsed, setParsed] = useState<any[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  async function handleParse() {
    setLoading(true); setParsed(null);
    try {
      const res = await parse({ data: { text: text || undefined, docUrl: url || undefined } });
      setParsed(res.tasks);
      if (res.tasks.length === 0) toast.info("No action items found.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    } finally { setLoading(false); }
  }

  async function handleSave() {
    if (!parsed?.length) return;
    setSaving(true);
    try {
      const res = await create({ data: { tasks: parsed.map((t) => ({
        title: t.title, description: t.description ?? null,
        department: t.department ?? null, assignee_id: t.assignee_id ?? null,
        due_date: t.due_date ?? null,
      })) } });
      toast.success(`${res.count} tasks created`);
      setParsed(null); setText(""); setUrl("");
      qc.invalidateQueries();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    } finally { setSaving(false); }
  }

  const grouped = parsed ? (["Finance", "Operations", "Marketing", null] as const).map((d) => ({ dept: d, items: parsed.filter((t) => (t.department ?? null) === d) })).filter((g) => g.items.length) : [];

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl md:text-3xl font-semibold">Meeting Action Items</h1>
        <p className="text-muted-foreground mt-1">Paste notes or a Google Doc link. AI will pull out tasks, sort by department, and assign people where mentioned.</p>
      </div>

      <div className="bg-card border rounded-xl p-5 space-y-4">
        <div className="space-y-2">
          <Label>Google Doc URL (make sure it's "Anyone with link can view")</Label>
          <Input type="url" placeholder="https://docs.google.com/document/d/..." value={url} onChange={(e) => setUrl(e.target.value)} />
        </div>
        <div className="text-center text-xs text-muted-foreground">— or —</div>
        <div className="space-y-2">
          <Label>Paste meeting notes</Label>
          <Textarea rows={10} value={text} onChange={(e) => setText(e.target.value)} placeholder="Paste your meeting notes here..." />
        </div>
        <Button onClick={handleParse} disabled={loading || (!text && !url)} size="lg">
          <Sparkles size={16} className="mr-2" /> {loading ? "Reading…" : "Extract action items"}
        </Button>
      </div>

      {parsed && (
        <div className="bg-card border rounded-xl p-5 space-y-4">
          <h2 className="font-semibold">Found {parsed.length} action items</h2>
          {grouped.map((g) => (
            <div key={String(g.dept)} className="space-y-2">
              <div className="flex items-center gap-2"><DeptBadge dept={g.dept ?? undefined} />{!g.dept && <span className="text-xs text-muted-foreground">Unassigned department</span>}</div>
              <ul className="space-y-2">
                {g.items.map((t: any, i: number) => (
                  <li key={i} className="border rounded-lg p-3 bg-background">
                    <div className="font-medium">{t.title}</div>
                    {t.description && <div className="text-sm text-muted-foreground mt-1">{t.description}</div>}
                    <div className="text-xs text-muted-foreground mt-1 flex gap-3">
                      {t.assignee_name && <span>👤 {t.assignee_name}{t.assignee_id ? " (matched)" : " (no match)"}</span>}
                      {t.due_date && <span>📅 {t.due_date}</span>}
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          ))}
          <Button onClick={handleSave} disabled={saving} size="lg" className="w-full">{saving ? "Saving…" : `Create ${parsed.length} tasks`}</Button>
        </div>
      )}
    </div>
  );
}
