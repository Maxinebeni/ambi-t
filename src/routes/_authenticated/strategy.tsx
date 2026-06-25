import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useProfile } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { DeptBadge, GoalStatusBadge } from "@/components/StatusBadge";
import { Plus, Trash2, Target, ChevronRight, X } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/strategy")({
  head: () => ({ meta: [{ title: "Strategy — Ambi-Tech" }] }),
  component: StrategyPage,
});

const DEPTS = ["Finance", "Operations", "Marketing", "IT"] as const;
const QUARTERS = ["Q1", "Q2", "Q3", "Q4"] as const;
const STATUSES = [
  { v: "on_track", l: "On Track" },
  { v: "at_risk", l: "At Risk" },
  { v: "behind", l: "Behind" },
  { v: "complete", l: "Complete" },
];

function StrategyPage() {
  const { data: profile } = useProfile();
  const qc = useQueryClient();
  const isManager = !!profile?.isManager;

  const { data: plans = [] } = useQuery({
    queryKey: ["annual_plans"],
    queryFn: async () => (await supabase.from("annual_plans").select("*").order("year", { ascending: false })).data ?? [],
  });
  const { data: goals = [] } = useQuery({
    queryKey: ["annual_goals"],
    queryFn: async () => (await supabase.from("annual_goals").select("*, profiles:owner_id(full_name)")).data ?? [],
  });
  const { data: milestones = [] } = useQuery({
    queryKey: ["quarterly_milestones"],
    queryFn: async () => (await supabase.from("quarterly_milestones").select("*, profiles:owner_id(full_name)")).data ?? [],
  });
  const { data: team = [] } = useQuery({
    queryKey: ["team"],
    queryFn: async () => (await supabase.from("profiles").select("id, full_name, email")).data ?? [],
  });
  const { data: projects = [] } = useQuery({
    queryKey: ["projects-strat"],
    queryFn: async () => (await supabase.from("projects").select("id, title, milestone_id, status, department")).data ?? [],
  });
  const { data: tasks = [] } = useQuery({
    queryKey: ["tasks-strat"],
    queryFn: async () => (await supabase.from("tasks").select("id, title, project_id, status, due_date, department")).data ?? [],
  });

  const [planId, setPlanId] = useState<string | null>(null);
  const activePlan = plans.find((p: any) => p.id === planId) ?? plans[0];
  const activePlanId = activePlan?.id;

  const planGoals = useMemo(() => goals.filter((g: any) => g.plan_id === activePlanId), [goals, activePlanId]);
  const planMilestones = useMemo(
    () => milestones.filter((m: any) =>
      m.plan_id === activePlanId ||
      (m.goal_id && planGoals.some((g: any) => g.id === m.goal_id))
    ),
    [milestones, planGoals, activePlanId]
  );

  const [quarter, setQuarter] = useState<string>("Q1");
  const [drillMilestone, setDrillMilestone] = useState<any | null>(null);

  const invalidate = (k: string) => qc.invalidateQueries({ queryKey: [k] });

  // Summary
  const onTrackCount = planGoals.filter((g: any) => g.status === "on_track" || g.status === "complete").length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-semibold flex items-center gap-2"><Target className="text-primary" /> Strategy</h1>
          <p className="text-muted-foreground mt-1">Annual goals → quarterly milestones → projects → weekly tasks.</p>
        </div>
        <div className="flex gap-2">
          {plans.length > 0 && (
            <Select value={activePlanId ?? ""} onValueChange={setPlanId}>
              <SelectTrigger className="w-56"><SelectValue /></SelectTrigger>
              <SelectContent>
                {plans.map((p: any) => <SelectItem key={p.id} value={p.id}>{p.title} ({p.year})</SelectItem>)}
              </SelectContent>
            </Select>
          )}
          {isManager && <NewPlanDialog onCreated={() => invalidate("annual_plans")} />}
        </div>
      </div>

      {!activePlan && (
        <div className="bg-card border rounded-xl p-10 text-center">
          <Target className="mx-auto text-muted-foreground" size={32} />
          <h2 className="font-semibold mt-3">No annual plan yet</h2>
          <p className="text-muted-foreground text-sm mt-1">Start by creating this year's plan, then add 3–6 goals.</p>
        </div>
      )}

      {activePlan && (
        <>
          {/* Summary */}
          <div className="bg-gradient-to-br from-primary to-primary/80 text-primary-foreground rounded-xl p-6">
            <div className="text-sm opacity-90">{activePlan.title}</div>
            <div className="text-3xl font-semibold mt-1">
              {onTrackCount} of {planGoals.length} annual goals on track
            </div>
            {activePlan.notes && <p className="text-sm opacity-90 mt-2 max-w-2xl">{activePlan.notes}</p>}
          </div>

          {/* Annual goals tracker */}
          <div className="bg-card border rounded-xl p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold">Annual goals</h2>
              {isManager && <NewGoalDialog planId={activePlan.id} team={team} onCreated={() => invalidate("annual_goals")} />}
            </div>
            <div className="space-y-3">
              {planGoals.map((g: any) => {
                const mils = planMilestones.filter((m: any) => m.goal_id === g.id);
                const done = mils.filter((m: any) => m.completed || m.status === "complete").length;
                const pct = mils.length ? Math.round((done / mils.length) * 100) : 0;
                return (
                  <div key={g.id} className="border rounded-lg p-4 bg-background">
                    <div className="flex items-start justify-between gap-3 flex-wrap">
                      <div className="min-w-0 flex-1">
                        <div className="font-medium">{g.title}</div>
                        <div className="flex flex-wrap gap-2 mt-1 text-xs text-muted-foreground items-center">
                          <DeptBadge dept={g.department} />
                          {g.profiles?.full_name && <span>· {g.profiles.full_name}</span>}
                          <span>· {done}/{mils.length} milestones</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {isManager ? (
                          <Select value={g.status} onValueChange={async (v) => {
                            await supabase.from("annual_goals").update({ status: v as any }).eq("id", g.id);
                            invalidate("annual_goals");
                          }}>
                            <SelectTrigger className="h-8 w-32 text-xs"><SelectValue /></SelectTrigger>
                            <SelectContent>{STATUSES.map(s => <SelectItem key={s.v} value={s.v}>{s.l}</SelectItem>)}</SelectContent>
                          </Select>
                        ) : <GoalStatusBadge status={g.status} />}
                        {isManager && (
                          <Button size="icon" variant="ghost" onClick={async () => {
                            if (!confirm("Delete this goal and all its milestones?")) return;
                            await supabase.from("annual_goals").delete().eq("id", g.id);
                            invalidate("annual_goals"); invalidate("quarterly_milestones");
                          }}><Trash2 size={14} /></Button>
                        )}
                      </div>
                    </div>
                    <div className="mt-3 h-2 bg-muted rounded-full overflow-hidden">
                      <div className="h-full bg-[color:var(--success)] transition-all" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
              {planGoals.length === 0 && <p className="text-sm text-muted-foreground">No goals yet. {isManager && "Add 3–6 to define this year."}</p>}
            </div>
          </div>

          {/* Quarterly view */}
          <div className="bg-card border rounded-xl p-5">
            <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
              <h2 className="font-semibold">Quarterly milestones</h2>
              {isManager && <NewMilestoneDialog planId={activePlan.id} goals={planGoals} team={team} defaultQuarter={quarter} onCreated={() => invalidate("quarterly_milestones")} />}
            </div>
            <Tabs value={quarter} onValueChange={setQuarter}>
              <TabsList>{QUARTERS.map(q => <TabsTrigger key={q} value={q}>{q}</TabsTrigger>)}</TabsList>
              {QUARTERS.map(q => (
                <TabsContent key={q} value={q} className="mt-4 space-y-2">
                  {planMilestones.filter((m: any) => m.quarter === q).map((m: any) => {
                    const goal = planGoals.find((g: any) => g.id === m.goal_id);
                    return (
                      <button key={m.id} onClick={() => setDrillMilestone(m)} className="w-full text-left border rounded-lg p-3 bg-background hover:bg-muted/40 transition-colors flex items-center justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <div className="font-medium truncate">{m.title}</div>
                          <div className="text-xs text-muted-foreground flex flex-wrap gap-2 mt-1 items-center">
                            <DeptBadge dept={m.department} />
                            {goal && <span>· {goal.title}</span>}
                            {m.due_date && <span>· Due {m.due_date}</span>}
                            {m.profiles?.full_name && <span>· {m.profiles.full_name}</span>}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <GoalStatusBadge status={m.completed ? "complete" : m.status} />
                          <ChevronRight size={16} className="text-muted-foreground" />
                        </div>
                      </button>
                    );
                  })}
                  {planMilestones.filter((m: any) => m.quarter === q).length === 0 && <p className="text-sm text-muted-foreground">No milestones for {q} yet.</p>}
                </TabsContent>
              ))}
            </Tabs>
          </div>
        </>
      )}

      {/* Drill-down */}
      <Dialog open={!!drillMilestone} onOpenChange={(o) => !o && setDrillMilestone(null)}>
        <DialogContent className="max-w-2xl">
          {drillMilestone && (
            <MilestoneDrill
              milestone={drillMilestone}
              goal={planGoals.find((g: any) => g.id === drillMilestone.goal_id)}
              projects={projects.filter((p: any) => p.milestone_id === drillMilestone.id)}
              tasks={tasks}
              isManager={isManager}
              onChanged={() => { invalidate("quarterly_milestones"); }}
              onClose={() => setDrillMilestone(null)}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function MilestoneDrill({ milestone, goal, projects, tasks, isManager, onChanged, onClose }: any) {
  const projectIds = projects.map((p: any) => p.id);
  const linkedTasks = tasks.filter((t: any) => t.project_id && projectIds.includes(t.project_id));
  return (
    <div className="space-y-4">
      <DialogHeader>
        <DialogTitle className="flex items-start justify-between gap-2 pr-6">
          <span>{milestone.title}</span>
          <button onClick={onClose}><X size={18} /></button>
        </DialogTitle>
      </DialogHeader>
      <div className="text-sm text-muted-foreground flex flex-wrap gap-2 items-center">
        <DeptBadge dept={milestone.department} />
        <GoalStatusBadge status={milestone.completed ? "complete" : milestone.status} />
        {milestone.due_date && <span>· Due {milestone.due_date}</span>}
        {goal && <span>· Feeds: {goal.title}</span>}
      </div>
      {milestone.description && <p className="text-sm">{milestone.description}</p>}

      {isManager && (
        <div className="flex flex-wrap gap-2 items-center">
          <Label className="text-xs">Status:</Label>
          <Select value={milestone.status} onValueChange={async (v) => {
            await supabase.from("quarterly_milestones").update({ status: v as any, completed: v === "complete" }).eq("id", milestone.id);
            onChanged();
            onClose();
          }}>
            <SelectTrigger className="h-8 w-36 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>{STATUSES.map(s => <SelectItem key={s.v} value={s.v}>{s.l}</SelectItem>)}</SelectContent>
          </Select>
          <Button size="sm" variant="ghost" onClick={async () => {
            if (!confirm("Delete this milestone?")) return;
            await supabase.from("quarterly_milestones").delete().eq("id", milestone.id);
            onChanged(); onClose();
          }}><Trash2 size={14} /></Button>
        </div>
      )}

      <div>
        <h3 className="font-medium text-sm mb-2">Projects feeding this milestone ({projects.length})</h3>
        <div className="space-y-1">
          {projects.map((p: any) => (
            <div key={p.id} className="text-sm p-2 border rounded bg-background flex justify-between">
              <span>{p.title}</span>
              <span className="text-xs text-muted-foreground">{p.status}</span>
            </div>
          ))}
          {projects.length === 0 && <p className="text-xs text-muted-foreground">No projects linked yet. Link projects on the Projects page.</p>}
        </div>
      </div>

      <div>
        <h3 className="font-medium text-sm mb-2">Weekly tasks under those projects ({linkedTasks.length})</h3>
        <div className="space-y-1">
          {linkedTasks.slice(0, 20).map((t: any) => (
            <div key={t.id} className="text-sm p-2 border rounded bg-background flex justify-between">
              <span>{t.title}</span>
              <span className="text-xs text-muted-foreground">{t.due_date || "—"}</span>
            </div>
          ))}
          {linkedTasks.length === 0 && <p className="text-xs text-muted-foreground">No tasks yet.</p>}
        </div>
      </div>
    </div>
  );
}

function NewPlanDialog({ onCreated }: { onCreated: () => void }) {
  const [open, setOpen] = useState(false);
  const [year, setYear] = useState<string>(String(new Date().getFullYear()));
  const [title, setTitle] = useState("");
  const [notes, setNotes] = useState("");
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const { data: user } = await supabase.auth.getUser();
    if (!user.user) return;
    const { error } = await supabase.from("annual_plans").insert({
      year: parseInt(year, 10), title, notes: notes || null, created_by: user.user.id,
    });
    if (error) { toast.error(error.message); return; }
    toast.success("Annual plan created");
    setOpen(false); setTitle(""); setNotes("");
    onCreated();
  }
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button><Plus size={16} className="mr-1" /> New plan</Button></DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>New annual plan</DialogTitle></DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-2"><Label>Year</Label><Input type="number" required value={year} onChange={(e) => setYear(e.target.value)} /></div>
          <div className="space-y-2"><Label>Title</Label><Input required placeholder="Ambi-Tech 2026" value={title} onChange={(e) => setTitle(e.target.value)} /></div>
          <div className="space-y-2"><Label>Notes</Label><Textarea rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} /></div>
          <Button type="submit" className="w-full" size="lg">Create plan</Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function NewGoalDialog({ planId, team, onCreated }: { planId: string; team: any[]; onCreated: () => void }) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [department, setDepartment] = useState("");
  const [ownerId, setOwnerId] = useState("");
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const { data: user } = await supabase.auth.getUser();
    if (!user.user) return;
    const { error } = await supabase.from("annual_goals").insert({
      plan_id: planId, title, description: description || null,
      department: (department || null) as any, owner_id: ownerId || null,
      created_by: user.user.id,
    });
    if (error) { toast.error(error.message); return; }
    toast.success("Goal added");
    setOpen(false); setTitle(""); setDescription(""); setDepartment(""); setOwnerId("");
    onCreated();
  }
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button size="sm"><Plus size={14} className="mr-1" /> Goal</Button></DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>New annual goal</DialogTitle></DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-2"><Label>Title</Label><Input required placeholder="Grow agent registrations to 50,000" value={title} onChange={(e) => setTitle(e.target.value)} /></div>
          <div className="space-y-2"><Label>Description</Label><Textarea rows={2} value={description} onChange={(e) => setDescription(e.target.value)} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Department</Label>
              <Select value={department} onValueChange={setDepartment}>
                <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                <SelectContent>{DEPTS.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Owner</Label>
              <Select value={ownerId} onValueChange={setOwnerId}>
                <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                <SelectContent>{team.map((m) => <SelectItem key={m.id} value={m.id}>{m.full_name || m.email}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          <Button type="submit" className="w-full" size="lg">Add goal</Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function NewMilestoneDialog({ goals, team, defaultQuarter, onCreated }: { goals: any[]; team: any[]; defaultQuarter: string; onCreated: () => void }) {
  const [open, setOpen] = useState(false);
  const [goalId, setGoalId] = useState("");
  const [quarter, setQuarter] = useState(defaultQuarter);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [department, setDepartment] = useState("");
  const [ownerId, setOwnerId] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const { data: user } = await supabase.auth.getUser();
    if (!user.user) return;
    if (!goalId) { toast.error("Pick a goal"); return; }
    const { error } = await supabase.from("quarterly_milestones").insert({
      goal_id: goalId, quarter: quarter as any, title, description: description || null,
      due_date: dueDate || null, department: (department || null) as any,
      owner_id: ownerId || null, created_by: user.user.id,
    });
    if (error) { toast.error(error.message); return; }
    toast.success("Milestone added");
    setOpen(false); setTitle(""); setDescription(""); setDueDate(""); setDepartment(""); setOwnerId(""); setGoalId("");
    onCreated();
  }
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button size="sm"><Plus size={14} className="mr-1" /> Milestone</Button></DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>New quarterly milestone</DialogTitle></DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Goal</Label>
              <Select value={goalId} onValueChange={setGoalId}>
                <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                <SelectContent>{goals.map(g => <SelectItem key={g.id} value={g.id}>{g.title}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Quarter</Label>
              <Select value={quarter} onValueChange={setQuarter}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{QUARTERS.map(q => <SelectItem key={q} value={q}>{q}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2"><Label>Title</Label><Input required placeholder="Register 12,000 new agents by June 30" value={title} onChange={(e) => setTitle(e.target.value)} /></div>
          <div className="space-y-2"><Label>Description</Label><Textarea rows={2} value={description} onChange={(e) => setDescription(e.target.value)} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2"><Label>Due date</Label><Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} /></div>
            <div className="space-y-2">
              <Label>Department</Label>
              <Select value={department} onValueChange={setDepartment}>
                <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                <SelectContent>{DEPTS.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <Label>Owner</Label>
            <Select value={ownerId} onValueChange={setOwnerId}>
              <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
              <SelectContent>{team.map((m) => <SelectItem key={m.id} value={m.id}>{m.full_name || m.email}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <Button type="submit" className="w-full" size="lg">Add milestone</Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
