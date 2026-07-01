import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useProfile } from "@/lib/auth";
import { StatusBadge, DeptBadge, GoalStatusBadge } from "@/components/StatusBadge";
import { FolderKanban, ListChecks, Target, ArrowRight } from "lucide-react";

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
  const { data: plans = [] } = useQuery({
    queryKey: ["annual_plans"],
    queryFn: async () => (await supabase.from("annual_plans").select("*").order("year", { ascending: false })).data ?? [],
    enabled: isManager,
  });
  const { data: goals = [] } = useQuery({
    queryKey: ["annual_goals"],
    queryFn: async () => (await supabase.from("annual_goals").select("*")).data ?? [],
    enabled: isManager,
  });
  const { data: milestones = [] } = useQuery({
    queryKey: ["quarterly_milestones"],
    queryFn: async () => (await supabase.from("quarterly_milestones").select("*")).data ?? [],
    enabled: isManager,
  });
  const { data: depts = [] } = useQuery({
    queryKey: ["departments"],
    queryFn: async () => (await supabase.from("departments").select("name")).data ?? [],
    enabled: isManager,
  });

  if (!projects || !tasks) return <div className="text-muted-foreground">Loading…</div>;

  const myTasks = userId ? tasks.filter((t: any) => t.assignee_id === userId || (t.co_assignees ?? []).includes(userId)) : [];
  const pendingApproval = tasks.filter((t: any) => t.status === "submitted" && (!isManager || t.created_by === userId));
  const overdue = tasks.filter((t: any) => t.due_date && t.due_date < today && t.status !== "approved");
  const completedThisWeek = tasks.filter((t: any) => t.status === "approved").length;

  const byDept = (depts as any[]).map((d) => d.name).map((d: string) => {
    const dt = tasks.filter((t: any) => t.department === d);
    const done = dt.filter((t: any) => t.status === "approved").length;
    return { dept: d, total: dt.length, done, pct: dt.length ? Math.round((done / dt.length) * 100) : 0 };
  }).filter((d) => d.total > 0);

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

      <div className="grid grid-cols-2 gap-4">
        <StatCard label="Active projects" value={projects.filter((p: any) => p.status !== "complete").length} icon={FolderKanban} />
        <StatCard label={isManager ? "Tasks completed" : "My open tasks"} value={isManager ? completedThisWeek : myTasks.filter((t: any) => t.status !== "approved").length} icon={ListChecks} tone="success" />
      </div>

      {isManager && plans.length > 0 && (() => {
        const plan = plans[0];
        const planGoals = goals.filter((g: any) => g.plan_id === plan.id);
        const planMils = milestones.filter((m: any) =>
          m.plan_id === plan.id || (m.goal_id && planGoals.some((g: any) => g.id === m.goal_id))
        );
        const onTrack = planGoals.filter((g: any) => g.status === "on_track" || g.status === "complete").length;
        const month = new Date().getMonth();
        const currentQuarter = `Q${Math.floor(month / 3) + 1}`;
        const thisQuarterMils = planMils.filter((m: any) => m.quarter === currentQuarter);
        return (
          <div className="bg-card border rounded-xl p-5 space-y-5">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <h2 className="font-semibold flex items-center gap-2"><Target size={18} className="text-primary" /> Strategy — {plan.title}</h2>
              <Link to="/strategy" className="text-sm text-primary inline-flex items-center gap-1 hover:underline">Open <ArrowRight size={14} /></Link>
            </div>
            <p className="text-sm text-muted-foreground">{onTrack} of {planGoals.length} annual goals on track.</p>
            <div className="space-y-3">
              {planGoals.slice(0, 5).map((g: any) => {
                const mils = planMils.filter((m: any) => m.goal_id === g.id);
                const done = mils.filter((m: any) => m.completed || m.status === "complete").length;
                const pct = mils.length ? Math.round((done / mils.length) * 100) : 0;
                return (
                  <div key={g.id}>
                    <div className="flex items-center justify-between text-sm mb-1 gap-2">
                      <span className="truncate font-medium">{g.title}</span>
                      <div className="flex items-center gap-2 shrink-0">
                        <GoalStatusBadge status={g.status} />
                        <span className="text-xs text-muted-foreground">{done}/{mils.length}</span>
                      </div>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div className="h-full bg-[color:var(--success)]" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
              {planGoals.length === 0 && <p className="text-sm text-muted-foreground">No goals yet — add some in Strategy.</p>}
            </div>

            <div className="pt-4 border-t">
              <h3 className="font-medium text-sm mb-3">This quarter ({currentQuarter}) · {thisQuarterMils.length} milestones</h3>
              <div className="space-y-2">
                {thisQuarterMils.slice(0, 6).map((m: any) => {
                  const g = planGoals.find((x: any) => x.id === m.goal_id);
                  return (
                    <div key={m.id} className="flex items-center justify-between p-2.5 border rounded-lg bg-background gap-2">
                      <div className="min-w-0">
                        <div className="text-sm font-medium truncate">{m.title}</div>
                        <div className="text-xs text-muted-foreground truncate">
                          {g ? `↑ ${g.title}` : "Standalone milestone"}
                          {m.due_date && ` · Due ${m.due_date}`}
                        </div>
                      </div>
                      <GoalStatusBadge status={m.completed ? "complete" : m.status} />
                    </div>
                  );
                })}
                {thisQuarterMils.length === 0 && <p className="text-sm text-muted-foreground">No milestones for {currentQuarter} yet.</p>}
              </div>
            </div>
          </div>
        );
      })()}


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
