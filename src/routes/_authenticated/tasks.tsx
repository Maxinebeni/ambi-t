import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useProfile } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { StatusBadge, DeptBadge } from "@/components/StatusBadge";
import { Plus, Upload, Link as LinkIcon, Paperclip, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { useDepartments } from "@/lib/useDepartments";

export const Route = createFileRoute("/_authenticated/tasks")({
  head: () => ({ meta: [{ title: "My Week — Ambi-Tech" }] }),
  component: TasksPage,
});

const STATUS_OPTIONS: { value: string; label: string }[] = [
  { value: "pending", label: "Not started" },
  { value: "in_progress", label: "In progress" },
  { value: "paused", label: "Paused" },
  { value: "blocked", label: "Blocked" },
  { value: "submitted", label: "Pending approval" },
  { value: "approved", label: "Completed" },
];

function getWeekStart() {
  const d = new Date();
  const day = d.getDay() || 7;
  d.setDate(d.getDate() - (day - 1));
  return d.toISOString().slice(0, 10);
}

function TasksPage() {
  const { data: profile } = useProfile();
  const qc = useQueryClient();
  const isManager = !!profile?.isManager;
  const [filterDept, setFilterDept] = useState<string>("all");
  const [filterPerson, setFilterPerson] = useState<string>("all");
  const [scope, setScope] = useState<"all" | "week">("all");
  const { data: departments = [] } = useDepartments();
  const weekStart = getWeekStart();

  const { data: tasks = [] } = useQuery({
    queryKey: ["weekly-tasks", "all"],
    queryFn: async () =>
      (
        await supabase
          .from("tasks")
          .select("*, projects:project_id(id, title, quarterly_milestones:milestone_id(id, title, quarter, annual_goals:goal_id(id, title)))")
          .order("due_date", { ascending: true, nullsFirst: false })
      ).data ?? [],
  });
  const { data: team = [] } = useQuery({
    queryKey: ["team"],
    queryFn: async () => (await supabase.from("profiles").select("id, full_name, email, department")).data ?? [],
  });

  const isAssignedTo = (t: any, userId?: string) =>
    !!userId && (t.assignee_id === userId || (t.co_assignees ?? []).includes(userId));

  let visible: any[] = tasks;
  if (scope === "week") visible = visible.filter((t) => t.week_start === weekStart);
  if (!isManager && profile?.id) visible = visible.filter((t) => isAssignedTo(t, profile.id));
  if (isManager) {
    if (filterDept !== "all") visible = visible.filter((t) => t.department === filterDept);
    if (filterPerson !== "all") visible = visible.filter((t) => isAssignedTo(t, filterPerson));
  }

  const open = visible.filter((t) => t.status !== "approved");
  const completed = visible.filter((t) => t.status === "approved");
  const refetch = () => qc.invalidateQueries({ queryKey: ["weekly-tasks"] });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-semibold">{isManager ? "Tasks" : "My tasks"}</h1>
          <p className="text-muted-foreground mt-1">
            {scope === "week" ? `Week of ${weekStart}` : "All tasks"}
          </p>
        </div>
        {isManager && <NewTaskDialog team={team} onCreated={refetch} />}
      </div>

      <div className="flex gap-3 flex-wrap">
        <Select value={scope} onValueChange={(v) => setScope(v as any)}>
          <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All tasks</SelectItem>
            <SelectItem value="week">This week only</SelectItem>
          </SelectContent>
        </Select>
        {isManager && (
          <>
            <Select value={filterDept} onValueChange={setFilterDept}>
              <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All departments</SelectItem>
                {departments.map((d) => <SelectItem key={d.name} value={d.name}>{d.name}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={filterPerson} onValueChange={setFilterPerson}>
              <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Everyone</SelectItem>
                {team.map((m: any) => <SelectItem key={m.id} value={m.id}>{m.full_name || m.email}</SelectItem>)}
              </SelectContent>
            </Select>
          </>
        )}
      </div>

      <TaskTable
        title="Open"
        tasks={open}
        team={team}
        emptyMsg="No open tasks."
        canEditRow={(t) => isManager || isAssignedTo(t, profile?.id)}
        onChange={refetch}
      />

      <TaskTable
        title="Completed"
        tasks={completed}
        team={team}
        emptyMsg="No completed tasks yet."
        canEditRow={(t) => isManager || isAssignedTo(t, profile?.id)}
        onChange={refetch}
        muted
      />
    </div>
  );
}

function TaskTable({
  title, tasks, team, emptyMsg, canEditRow, onChange, muted,
}: {
  title: string; tasks: any[]; team: any[]; emptyMsg: string;
  canEditRow: (t: any) => boolean; onChange: () => void; muted?: boolean;
}) {
  return (
    <div className="space-y-2">
      <h2 className="text-lg font-semibold">{title} <span className="text-muted-foreground font-normal">· {tasks.length}</span></h2>
      <div className={`bg-card border rounded-xl overflow-hidden ${muted ? "opacity-90" : ""}`}>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Task</TableHead>
              <TableHead className="w-32">Due date</TableHead>
              <TableHead className="w-32">Department</TableHead>
              <TableHead className="w-44">Assignees</TableHead>
              <TableHead className="w-40">Status</TableHead>
              <TableHead className="w-32 text-right">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {tasks.map((t) => (
              <TaskRow key={t.id} task={t} team={team} canEdit={canEditRow(t)} onChange={onChange} />
            ))}
            {tasks.length === 0 && (
              <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-6">{emptyMsg}</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

function TaskRow({ task, team, canEdit, onChange }: { task: any; team: any[]; canEdit: boolean; onChange: () => void }) {
  const { data: profile } = useProfile();
  const [submitOpen, setSubmitOpen] = useState(false);
  const assignee = team.find((m) => m.id === task.assignee_id);
  const co = (task.co_assignees ?? []).map((id: string) => team.find((m) => m.id === id)).filter(Boolean);
  const isCompleted = task.status === "approved";
  const isSubmitted = task.status === "submitted";
  const isCreator = !!profile?.id && task.created_by === profile.id;
  const isAssigned = !!profile?.id && (task.assignee_id === profile.id || (task.co_assignees ?? []).includes(profile.id));

  async function updateStatus(newStatus: string) {
    if (newStatus === "submitted") { setSubmitOpen(true); return; }
    if (newStatus === "approved") {
      // Direct approve — only creator can shortcut
      if (!isCreator) { toast.error("Only the task creator can mark as complete."); return; }
      const now = new Date().toISOString();
      const { error } = await supabase.from("tasks").update({ status: "approved", approved_at: now, approved_by: profile?.id }).eq("id", task.id);
      if (error) { toast.error(error.message); return; }
      toast.success("Task completed"); onChange(); return;
    }
    const { error } = await supabase.from("tasks").update({ status: newStatus as any }).eq("id", task.id);
    if (error) { toast.error(error.message); return; }
    toast.success("Status updated");
    onChange();
  }

  async function approve() {
    const now = new Date().toISOString();
    const { error } = await supabase.from("tasks").update({ status: "approved", approved_at: now, approved_by: profile?.id }).eq("id", task.id);
    if (error) { toast.error(error.message); return; }
    toast.success("Approved"); onChange();
  }

  async function setCoAssignees(ids: string[]) {
    const { error } = await supabase.from("tasks").update({ co_assignees: ids }).eq("id", task.id);
    if (error) { toast.error(error.message); return; }
    onChange();
  }

  return (
    <TableRow>
      <TableCell>
        <div className="font-medium flex items-center gap-2">
          {task.title}
          {task.attachment_path && <Paperclip size={14} className="text-muted-foreground" />}
        </div>
        {task.projects?.title && (
          <div className="text-xs text-muted-foreground mt-0.5 flex flex-wrap gap-1 items-center">
            <span>📁 {task.projects.title}</span>
            {task.projects.quarterly_milestones && (
              <span className="text-primary">· {task.projects.quarterly_milestones.quarter} {task.projects.quarterly_milestones.title}</span>
            )}
            {task.projects.quarterly_milestones?.annual_goals && (
              <span>· 🎯 {task.projects.quarterly_milestones.annual_goals.title}</span>
            )}
          </div>
        )}
      </TableCell>
      <TableCell className="text-sm">{task.due_date ?? <span className="text-muted-foreground">—</span>}</TableCell>
      <TableCell>{task.department ? <DeptBadge dept={task.department} /> : <span className="text-muted-foreground text-sm">—</span>}</TableCell>
      <TableCell>
        <div className="flex items-center gap-1 flex-wrap text-xs">
          <span className="font-medium">{assignee?.full_name || assignee?.email || "—"}</span>
          {co.map((c: any) => (
            <span key={c.id} className="px-1.5 py-0.5 rounded bg-muted text-muted-foreground">+{(c.full_name || c.email || "").split(" ")[0]}</span>
          ))}
          {canEdit && (
            <Popover>
              <PopoverTrigger asChild>
                <button className="p-1 rounded hover:bg-muted text-muted-foreground" title="Add co-assignee"><UserPlus size={12} /></button>
              </PopoverTrigger>
              <PopoverContent className="w-64 p-2 max-h-64 overflow-auto">
                <div className="text-xs font-medium px-2 py-1 text-muted-foreground">Additional assignees</div>
                {team.filter((m) => m.id !== task.assignee_id).map((m) => {
                  const checked = (task.co_assignees ?? []).includes(m.id);
                  return (
                    <label key={m.id} className="flex items-center gap-2 px-2 py-1.5 hover:bg-muted rounded cursor-pointer text-sm">
                      <Checkbox
                        checked={checked}
                        onCheckedChange={(v) => {
                          const next = new Set<string>(task.co_assignees ?? []);
                          if (v) next.add(m.id); else next.delete(m.id);
                          setCoAssignees(Array.from(next));
                        }}
                      />
                      <span>{m.full_name || m.email}{m.department ? ` · ${m.department}` : ""}</span>
                    </label>
                  );
                })}
              </PopoverContent>
            </Popover>
          )}
        </div>
      </TableCell>
      <TableCell>
        {canEdit && !isSubmitted && !isCompleted ? (
          <Select value={task.status} onValueChange={updateStatus}>
            <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              {STATUS_OPTIONS.filter(s => s.value !== "approved").map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
            </SelectContent>
          </Select>
        ) : (
          <StatusBadge status={task.status} />
        )}
      </TableCell>
      <TableCell className="text-right">
        {isSubmitted && isCreator && (
          <Button size="sm" onClick={approve}>Approve</Button>
        )}
        {isSubmitted && !isCreator && (
          <span className="text-xs text-muted-foreground">Awaiting approval</span>
        )}
        {!isSubmitted && !isCompleted && isAssigned && (
          <Dialog open={submitOpen} onOpenChange={setSubmitOpen}>
            <DialogTrigger asChild>
              <Button size="sm" variant={isCreator ? "outline" : "default"}>Submit for approval</Button>
            </DialogTrigger>
            <DialogContent><CompletionForm task={task} onDone={() => { setSubmitOpen(false); onChange(); }} /></DialogContent>
          </Dialog>
        )}
        {!isSubmitted && !isCompleted && isCreator && (
          <Button size="sm" variant="ghost" className="ml-1" onClick={() => updateStatus("approved")}>Mark done</Button>
        )}
      </TableCell>
    </TableRow>
  );
}

function CompletionForm({ task, onDone }: { task: any; onDone: () => void }) {
  const [link, setLink] = useState(task.proof_url ?? "");
  const [notes, setNotes] = useState(task.proof_notes ?? "");
  const [file, setFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error("Not signed in");
      let filePath = task.proof_file_path ?? null;
      if (file) {
        const path = `${user.user.id}/${task.id}-${Date.now()}-${file.name}`;
        const { error: upErr } = await supabase.storage.from("proof-files").upload(path, file);
        if (upErr) throw upErr;
        filePath = path;
      }
      const now = new Date().toISOString();
      const { error } = await supabase.from("tasks").update({
        status: "submitted",
        proof_url: link || null,
        proof_file_path: filePath,
        proof_notes: notes || null,
        submitted_at: now,
      }).eq("id", task.id);
      if (error) throw error;
      toast.success("Submitted for approval");
      onDone();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed");
    } finally { setSubmitting(false); }
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <DialogHeader><DialogTitle>Submit: {task.title}</DialogTitle></DialogHeader>
      <p className="text-sm text-muted-foreground">Attach proof of work. Your manager will review and approve.</p>
      <div className="space-y-2">
        <Label className="flex items-center gap-2"><LinkIcon size={14}/> Link (optional)</Label>
        <Input type="url" placeholder="https://..." value={link} onChange={(e) => setLink(e.target.value)} />
      </div>
      <div className="space-y-2">
        <Label className="flex items-center gap-2"><Upload size={14}/> Upload file (optional)</Label>
        <Input type="file" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
      </div>
      <div className="space-y-2">
        <Label>Notes (optional)</Label>
        <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
      </div>
      <Button type="submit" size="lg" className="w-full" disabled={submitting}>
        {submitting ? "Submitting…" : "Submit for approval"}
      </Button>
    </form>
  );
}

function NewTaskDialog({ team, onCreated }: { team: any[]; onCreated: () => void }) {
  const { data: departments = [] } = useDepartments();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [department, setDepartment] = useState("");
  const [assigneeId, setAssigneeId] = useState("");
  const [coAssignees, setCoAssignees] = useState<string[]>([]);
  const [dueDate, setDueDate] = useState("");
  const [projectId, setProjectId] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);

  const { data: projects = [] } = useQuery({
    queryKey: ["projects-for-task"],
    queryFn: async () => (await supabase.from("projects").select("id, title").order("created_at", { ascending: false })).data ?? [],
    enabled: open,
  });

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) return;
      let attachment_path: string | null = null;
      if (file) {
        const path = `${user.user.id}/attach-${Date.now()}-${file.name}`;
        const { error: upErr } = await supabase.storage.from("proof-files").upload(path, file);
        if (upErr) throw upErr;
        attachment_path = path;
      }
      const { error } = await supabase.from("tasks").insert({
        title, description: description || null,
        department: (department || null) as any,
        assignee_id: assigneeId || null,
        co_assignees: coAssignees,
        due_date: dueDate || null,
        project_id: projectId || null,
        week_start: getWeekStart(),
        created_by: user.user.id,
        attachment_path,
      });
      if (error) throw error;
      toast.success("Task created");
      setOpen(false);
      setTitle(""); setDescription(""); setDepartment(""); setAssigneeId(""); setCoAssignees([]); setDueDate(""); setProjectId(""); setFile(null);
      onCreated();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create task");
    } finally { setBusy(false); }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button size="lg"><Plus size={18} className="mr-1" /> New task</Button></DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>New task</DialogTitle></DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-2"><Label>Title</Label><Input required value={title} onChange={(e) => setTitle(e.target.value)} /></div>
          <div className="space-y-2"><Label>Description</Label><Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Department</Label>
              <Select value={department} onValueChange={setDepartment}>
                <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                <SelectContent>
                  {departments.map((d) => <SelectItem key={d.name} value={d.name}>{d.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Primary assignee</Label>
              <Select value={assigneeId} onValueChange={setAssigneeId}>
                <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                <SelectContent>
                  {team.map((m) => <SelectItem key={m.id} value={m.id}>{m.full_name || m.email}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <Label>Additional assignees (optional)</Label>
            <div className="border rounded-md p-2 max-h-32 overflow-auto space-y-1">
              {team.filter((m) => m.id !== assigneeId).map((m) => {
                const checked = coAssignees.includes(m.id);
                return (
                  <label key={m.id} className="flex items-center gap-2 text-sm cursor-pointer hover:bg-muted px-1.5 py-1 rounded">
                    <Checkbox checked={checked} onCheckedChange={(v) => {
                      setCoAssignees((prev) => v ? [...prev, m.id] : prev.filter((x) => x !== m.id));
                    }} />
                    <span>{m.full_name || m.email}{m.department ? ` · ${m.department}` : ""}</span>
                  </label>
                );
              })}
              {team.length === 0 && <p className="text-xs text-muted-foreground p-2">No team members.</p>}
            </div>
          </div>
          <div className="space-y-2">
            <Label>Project (optional)</Label>
            <Select value={projectId} onValueChange={setProjectId}>
              <SelectTrigger><SelectValue placeholder="None" /></SelectTrigger>
              <SelectContent>
                {projects.map((p: any) => <SelectItem key={p.id} value={p.id}>{p.title}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2"><Label>Due date</Label><Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} /></div>
            <div className="space-y-2">
              <Label className="flex items-center gap-1"><Paperclip size={14}/> Attachment (optional)</Label>
              <Input type="file" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
            </div>
          </div>
          <Button type="submit" size="lg" className="w-full" disabled={busy}>{busy ? "Creating…" : "Create task"}</Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
