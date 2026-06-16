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
import { StatusBadge, DeptBadge } from "@/components/StatusBadge";
import { Plus, Upload, Link as LinkIcon } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/tasks")({
  head: () => ({ meta: [{ title: "My Week — Ambi-Tech" }] }),
  component: TasksPage,
});

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
  const weekStart = getWeekStart();

  const { data: tasks = [] } = useQuery({
    queryKey: ["weekly-tasks", weekStart],
    queryFn: async () => (await supabase.from("tasks").select("*, profiles:assignee_id(full_name, email), projects:project_id(id, title, quarterly_milestones:milestone_id(title, quarter, annual_goals:goal_id(title)))").eq("week_start", weekStart).order("due_date", { ascending: true })).data ?? [],
  });
  const { data: team = [] } = useQuery({
    queryKey: ["team"],
    queryFn: async () => (await supabase.from("profiles").select("id, full_name, email")).data ?? [],
  });

  // Hide completed (approved) tasks — they stay saved in the database but disappear from the list
  let visible = tasks.filter((t: any) => t.status !== "approved");
  if (!isManager && profile?.id) visible = visible.filter((t: any) => t.assignee_id === profile.id);
  if (isManager) {
    if (filterDept !== "all") visible = visible.filter((t: any) => t.department === filterDept);
    if (filterPerson !== "all") visible = visible.filter((t: any) => t.assignee_id === filterPerson);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-semibold">{isManager ? "All tasks this week" : "My week"}</h1>
          <p className="text-muted-foreground mt-1">Week of {weekStart}</p>
        </div>
        {isManager && <NewTaskDialog team={team} onCreated={() => qc.invalidateQueries({ queryKey: ["weekly-tasks"] })} />}
      </div>

      {isManager && (
        <div className="flex gap-3 flex-wrap">
          <Select value={filterDept} onValueChange={setFilterDept}>
            <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All departments</SelectItem>
              <SelectItem value="Finance">Finance</SelectItem>
              <SelectItem value="Operations">Operations</SelectItem>
              <SelectItem value="Marketing">Marketing</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filterPerson} onValueChange={setFilterPerson}>
            <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Everyone</SelectItem>
              {team.map((m: any) => <SelectItem key={m.id} value={m.id}>{m.full_name || m.email}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      )}

      <div className="space-y-3">
        {visible.map((t: any) => <TaskRow key={t.id} task={t} canEdit={isManager || t.assignee_id === profile?.id} onChange={() => qc.invalidateQueries({ queryKey: ["weekly-tasks"] })} />)}
        {visible.length === 0 && <p className="text-muted-foreground">No tasks for this week yet.</p>}
      </div>
    </div>
  );
}

function TaskRow({ task, canEdit, onChange }: { task: any; canEdit: boolean; onChange: () => void }) {
  const [open, setOpen] = useState(false);
  const project = task.projects;
  const milestone = project?.quarterly_milestones;
  const goal = milestone?.annual_goals;
  return (
    <div className="bg-card border rounded-xl p-4 flex items-center justify-between gap-3 flex-wrap">
      <div className="min-w-0 flex-1">
        <div className="font-medium">{task.title}</div>
        <div className="text-xs text-muted-foreground flex gap-2 mt-1 items-center flex-wrap">
          <DeptBadge dept={task.department} />
          {task.profiles?.full_name && <span>· {task.profiles.full_name}</span>}
          {task.due_date && <span>· Due {task.due_date}</span>}
        </div>
        {project && (
          <div className="text-xs mt-2 px-2 py-1 rounded bg-primary/5 border border-primary/15 text-primary inline-flex items-center gap-1 max-w-full">
            <span className="font-medium">{project.title}</span>
            {milestone && <span className="text-muted-foreground truncate">· {milestone.quarter} {milestone.title}</span>}
            {goal && <span className="text-muted-foreground truncate">· ↑ {goal.title}</span>}
          </div>
        )}
      </div>
      <div className="flex items-center gap-2">
        <StatusBadge status={task.status} />
        {canEdit && task.status !== "approved" && (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button size="sm" variant={task.status === "submitted" ? "secondary" : "default"}>
                {task.status === "submitted" ? "Update" : "Mark done"}
              </Button>
            </DialogTrigger>
            <DialogContent><CompletionForm task={task} onDone={() => { setOpen(false); onChange(); }} /></DialogContent>
          </Dialog>
        )}
      </div>
    </div>
  );
}

function CompletionForm({ task, onDone }: { task: any; onDone: () => void }) {
  const [link, setLink] = useState(task.proof_url ?? "");
  const [notes, setNotes] = useState(task.proof_notes ?? "");
  const [file, setFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!link && !file && !task.proof_file_path) { toast.error("Add a link or upload a file as proof."); return; }
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
      const { error } = await supabase.from("tasks").update({
        status: "submitted",
        proof_url: link || null,
        proof_file_path: filePath,
        proof_notes: notes || null,
        submitted_at: new Date().toISOString(),
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
      <DialogHeader><DialogTitle>Mark done: {task.title}</DialogTitle></DialogHeader>
      <p className="text-sm text-muted-foreground">Add proof — a link (social post, doc) or upload a file.</p>
      <div className="space-y-2">
        <Label className="flex items-center gap-2"><LinkIcon size={14}/> Link</Label>
        <Input type="url" placeholder="https://..." value={link} onChange={(e) => setLink(e.target.value)} />
      </div>
      <div className="space-y-2">
        <Label className="flex items-center gap-2"><Upload size={14}/> Or upload file</Label>
        <Input type="file" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
        {task.proof_file_path && !file && <p className="text-xs text-muted-foreground">Current file uploaded.</p>}
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
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [department, setDepartment] = useState("");
  const [assigneeId, setAssigneeId] = useState("");
  const [dueDate, setDueDate] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const { data: user } = await supabase.auth.getUser();
    if (!user.user) return;
    const { error } = await supabase.from("tasks").insert({
      title, description: description || null,
      department: (department || null) as any,
      assignee_id: assigneeId || null,
      due_date: dueDate || null,
      week_start: getWeekStart(),
      created_by: user.user.id,
    });
    if (error) { toast.error(error.message); return; }
    toast.success("Task created");
    setOpen(false); setTitle(""); setDescription(""); setDepartment(""); setAssigneeId(""); setDueDate("");
    onCreated();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button size="lg"><Plus size={18} className="mr-1" /> New task</Button></DialogTrigger>
      <DialogContent>
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
                  <SelectItem value="Finance">Finance</SelectItem>
                  <SelectItem value="Operations">Operations</SelectItem>
                  <SelectItem value="Marketing">Marketing</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Assignee</Label>
              <Select value={assigneeId} onValueChange={setAssigneeId}>
                <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                <SelectContent>
                  {team.map((m) => <SelectItem key={m.id} value={m.id}>{m.full_name || m.email}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2"><Label>Due date</Label><Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} /></div>
          <Button type="submit" size="lg" className="w-full">Create task</Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
