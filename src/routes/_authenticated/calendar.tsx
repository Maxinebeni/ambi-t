import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useProfile } from "@/lib/auth";
import { DeptBadge } from "@/components/StatusBadge";

export const Route = createFileRoute("/_authenticated/calendar")({
  head: () => ({ meta: [{ title: "Calendar — Ambi-Tech" }] }),
  component: CalendarPage,
});

function CalendarPage() {
  const { data: profile } = useProfile();
  const isManager = !!profile?.isManager;

  const { data: tasks = [] } = useQuery({
    queryKey: ["cal-tasks"],
    queryFn: async () => (await supabase.from("tasks").select("id, title, due_date, department, assignee_id, profiles:assignee_id(full_name)").not("due_date", "is", null).order("due_date")).data ?? [],
  });
  const { data: projects = [] } = useQuery({
    queryKey: ["cal-projects"],
    queryFn: async () => (await supabase.from("projects").select("id, title, due_date, department").not("due_date", "is", null).order("due_date")).data ?? [],
  });

  const myTasks = isManager ? tasks : tasks.filter((t: any) => t.assignee_id === profile?.id);
  const items = [
    ...myTasks.map((t: any) => ({ ...t, kind: "Task" })),
    ...projects.map((p: any) => ({ ...p, kind: "Project" })),
  ].sort((a, b) => (a.due_date < b.due_date ? -1 : 1));

  const grouped: Record<string, typeof items> = {};
  items.forEach((i: any) => { (grouped[i.due_date] ??= []).push(i); });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-semibold">Calendar</h1>
        <p className="text-muted-foreground mt-1">{isManager ? "All upcoming deadlines across the company." : "Your upcoming deadlines."}</p>
      </div>
      <div className="space-y-4">
        {Object.entries(grouped).map(([date, list]) => (
          <div key={date} className="bg-card border rounded-xl p-4">
            <div className="font-semibold mb-2">{new Date(date).toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })}</div>
            <ul className="space-y-2">
              {list.map((i: any) => (
                <li key={`${i.kind}-${i.id}`} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <span className="inline-block w-1.5 h-1.5 rounded-full bg-[color:var(--success)]" />
                    <span className="font-medium">{i.title}</span>
                    <span className="text-muted-foreground">· {i.kind}</span>
                    {i.profiles?.full_name && <span className="text-muted-foreground">· {i.profiles.full_name}</span>}
                  </div>
                  <DeptBadge dept={i.department} />
                </li>
              ))}
            </ul>
          </div>
        ))}
        {items.length === 0 && <p className="text-muted-foreground">No deadlines yet.</p>}
      </div>
    </div>
  );
}
