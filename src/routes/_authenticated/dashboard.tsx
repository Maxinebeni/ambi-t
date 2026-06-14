import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useProfile } from "@/lib/auth";
import { StatusBadge, DeptBadge } from "@/components/StatusBadge";
import { FolderKanban, ListChecks, CheckCircle2, AlertTriangle } from "lucide-react";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard — Ambi-Tech" }] }),
  component: Dashboard,
});

function StatCard({ label, value, icon: Icon, tone = "default" }: { label: string; value: number | string; icon: typeof FolderKanban; tone?: "default" | "warn" | "success" }) {
  const toneClass = tone === "warn" ? "text-destructive" : tone === "success" ? "text-[color:var(--success-foreground)]" : "text-primary";
  return (
    <div className="bg-card border rounded-xl p-5">
      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground">{label}</span>
        <Icon size={18} className={toneClass} />
      </div>
      <div className="mt-2 text-3xl font-semibold">{value}</div>
    </div>
  );
}

function Dashboard() {
  const { data: profile } = useProfile();
  const isManager = !!profile?.isManager;
  const userId = profile?.id;
  const today = new Date().toISOString().slice(0, 10);

  const { data: projects } = useQuery({
    queryKey: ["projects-all"],
    queryFn: async () => (await supabase.from("projects").select("*").order("due_date", { ascending: true })).data ?? [],
  });
  const { data: tasks } = useQuery({
    queryKey: ["tasks-all"],
    queryFn: async () => (await supabase.from("tasks").select("*, profiles:assignee_id(full_name)").order("due_date", { ascending: true })).data ?? [],
  });

  if (!projects || !tasks) return <div className="text-muted-foreground">Loading…</div>;

  const myTasks = userId ? tasks.filter((t: any) => t.assignee_id === userId) : [];
  const pendingApproval = tasks.filter((t: any) => t.status === "submitted");
  const overdue = tasks.filter((t: any) => t.due_date && t.due_date < today && t.status !== "approved");
  const completedThisWeek = tasks.filter((t: any) => t.status === "approved").length;

  const byDept = ["Finance", "Operations", "Marketing"].map((d) => {
    const dt = tasks.filter((t: any) => t.department === d);
    const done = dt.filter((t: any) => t.status === "approved").length;
    return { dept: d, total: dt.length, done, pct: dt.length ? Math.round((done / dt.length) * 100) : 0 };
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-semibold">
          {isManager ? `Hello, ${profile?.full_name?.split(" ")[0] || "there"}` : `This week's work`}
        </h1>
        <p className="text-muted-foreground mt-1">
          {isManager ? "Here's a snapshot of the whole company." : "Your tasks and projects at a glance."}
        </p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Active projects" value={projects.filter((p: any) => p.status !== "complete").length} icon={FolderKanban} />
        <StatCard label={isManager ? "Tasks done (approved)" : "My open tasks"} value={isManager ? completedThisWeek : myTasks.filter((t: any) => t.status !== "approved").length} icon={ListChecks} tone="success" />
        {isManager && <StatCard label="Pending approvals" value={pendingApproval.length} icon={CheckCircle2} />}
        <StatCard label="Overdue" value={overdue.length} icon={AlertTriangle} tone="warn" />
      </div>

      {isManager && (
        <div className="bg-card border rounded-xl p-5">
          <h2 className="font-semibold mb-4">Weekly task completion by department</h2>
          <div className="space-y-4">
            {byDept.map((d) => (
              <div key={d.dept}>
                <div className="flex items-center justify-between text-sm mb-1">
                  <DeptBadge dept={d.dept} />
                  <span className="text-muted-foreground">{d.done}/{d.total} · {d.pct}%</span>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div className="h-full bg-[color:var(--success)]" style={{ width: `${d.pct}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid lg:grid-cols-2 gap-6">
        <div className="bg-card border rounded-xl p-5">
          <h2 className="font-semibold mb-4">{isManager ? "Pending approvals" : "My tasks"}</h2>
          <div className="space-y-2">
            {(isManager ? pendingApproval : myTasks).slice(0, 6).map((t: any) => (
              <div key={t.id} className="flex items-center justify-between p-3 rounded-lg border bg-background">
                <div className="min-w-0">
                  <div className="font-medium truncate">{t.title}</div>
                  <div className="text-xs text-muted-foreground flex gap-2 mt-1">
                    <DeptBadge dept={t.department} />
                    {t.due_date && <span>Due {t.due_date}</span>}
                  </div>
                </div>
                <StatusBadge status={t.status} />
              </div>
            ))}
            {(isManager ? pendingApproval : myTasks).length === 0 && <p className="text-sm text-muted-foreground">Nothing here right now.</p>}
          </div>
        </div>

        <div className="bg-card border rounded-xl p-5">
          <h2 className="font-semibold mb-4">Overdue</h2>
          <div className="space-y-2">
            {overdue.slice(0, 6).map((t: any) => (
              <div key={t.id} className="flex items-center justify-between p-3 rounded-lg border bg-background">
                <div className="min-w-0">
                  <div className="font-medium truncate">{t.title}</div>
                  <div className="text-xs text-muted-foreground flex gap-2 mt-1">
                    <DeptBadge dept={t.department} />
                    <span className="text-destructive">Due {t.due_date}</span>
                  </div>
                </div>
                <StatusBadge status={t.status} />
              </div>
            ))}
            {overdue.length === 0 && <p className="text-sm text-muted-foreground">Nothing overdue. </p>}
          </div>
        </div>
      </div>
    </div>
  );
}
