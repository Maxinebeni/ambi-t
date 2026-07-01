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
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useDepartments } from "@/lib/useDepartments";

export const Route = createFileRoute("/_authenticated/projects")({
  head: () => ({ meta: [{ title: "Projects — Ambi-Tech" }] }),
  component: ProjectsPage,
});

function ProjectsPage() {
  const { data: profile } = useProfile();
  const qc = useQueryClient();
  const isManager = !!profile?.isManager;

  const { data: projects = [] } = useQuery({
    queryKey: ["projects"],
    queryFn: async () => (await supabase.from("projects").select("*, quarterly_milestones:milestone_id(id, title, quarter, annual_goals:goal_id(id, title))").order("created_at", { ascending: false })).data ?? [],
  });
  const { data: team = [] } = useQuery({
    queryKey: ["team"],
    queryFn: async () => (await supabase.from("profiles").select("id, full_name, email")).data ?? [],
  });
  const { data: milestones = [] } = useQuery({
    queryKey: ["milestones-select"],
    queryFn: async () => (await supabase.from("quarterly_milestones").select("id, title, quarter, annual_goals:goal_id(title)").order("quarter")).data ?? [],
  });

  async function updateStatus(id: string, status: string) {
    const { error } = await supabase.from("projects").update({ status: status as any }).eq("id", id);
    if (error) { toast.error(error.message); return; }
    qc.invalidateQueries({ queryKey: ["projects"] });
  }

  async function deleteProject(id: string) {
    if (!confirm("Delete this project?")) return;
    const { error } = await supabase.from("projects").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    qc.invalidateQueries({ queryKey: ["projects"] });
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-semibold">Projects</h1>
          <p className="text-muted-foreground mt-1">{isManager ? "Track and assign work across the company." : "Projects you can see and update."}</p>
        </div>
        {isManager && <NewProjectDialog team={team} milestones={milestones} onCreated={() => qc.invalidateQueries({ queryKey: ["projects"] })} />}
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {projects.map((p: any) => (
          <div key={p.id} className="bg-card border rounded-xl p-5 flex flex-col gap-3">
            <div className="flex items-start justify-between gap-2">
              <h3 className="font-semibold leading-snug">{p.title}</h3>
              <StatusBadge status={p.status} kind="project" />
            </div>
            {p.description && <p className="text-sm text-muted-foreground line-clamp-3">{p.description}</p>}
            {p.quarterly_milestones && (
              <div className="text-xs bg-primary/5 border border-primary/20 rounded-md px-2 py-1.5 text-primary">
                <span className="font-medium">{p.quarterly_milestones.quarter}</span> · {p.quarterly_milestones.title}
                {p.quarterly_milestones.annual_goals && <div className="text-muted-foreground mt-0.5 truncate">↑ {p.quarterly_milestones.annual_goals.title}</div>}
              </div>
            )}
            <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
              <DeptBadge dept={p.department} />
              {p.assignee_id && <span>· {team.find((m: any) => m.id === p.assignee_id)?.full_name || "Assigned"}</span>}
              {p.due_date && <span>· Due {p.due_date}</span>}
            </div>
            <div className="flex gap-2 mt-auto pt-2">
              <Select value={p.status} onValueChange={(v) => updateStatus(p.id, v)}>
                <SelectTrigger className="h-9 flex-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="not_started">Not started</SelectItem>
                  <SelectItem value="in_progress">In progress</SelectItem>
                  <SelectItem value="complete">Complete</SelectItem>
                </SelectContent>
              </Select>
              {isManager && (
                <Button size="icon" variant="ghost" onClick={() => deleteProject(p.id)}><Trash2 size={16} /></Button>
              )}
            </div>
          </div>
        ))}
        {projects.length === 0 && <p className="text-muted-foreground col-span-full">No projects yet.</p>}
      </div>
    </div>
  );
}

function NewProjectDialog({ team, milestones, onCreated }: { team: any[]; milestones: any[]; onCreated: () => void }) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [department, setDepartment] = useState<string>("");
  const [assigneeId, setAssigneeId] = useState<string>("");
  const [dueDate, setDueDate] = useState("");
  const [milestoneId, setMilestoneId] = useState<string>("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const { data: user } = await supabase.auth.getUser();
    if (!user.user) return;
    const { error } = await supabase.from("projects").insert({
      title, description: description || null,
      department: (department || null) as any,
      assignee_id: assigneeId || null,
      due_date: dueDate || null,
      milestone_id: milestoneId || null,
      created_by: user.user.id,
    });
    if (error) { toast.error(error.message); return; }
    toast.success("Project created");
    setOpen(false); setTitle(""); setDescription(""); setDepartment(""); setAssigneeId(""); setDueDate(""); setMilestoneId("");
    onCreated();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button size="lg"><Plus size={18} className="mr-1" /> New project</Button></DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>New project</DialogTitle></DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-2"><Label>Title</Label><Input required value={title} onChange={(e) => setTitle(e.target.value)} /></div>
          <div className="space-y-2"><Label>Description</Label><Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Department</Label>
              <Select value={department} onValueChange={setDepartment}>
                <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Finance">Finance</SelectItem>
                  <SelectItem value="Operations">Operations</SelectItem>
                  <SelectItem value="Marketing">Marketing</SelectItem>
                  <SelectItem value="IT">IT</SelectItem>
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
          <div className="space-y-2">
            <Label>Quarterly milestone (optional)</Label>
            <Select value={milestoneId} onValueChange={setMilestoneId}>
              <SelectTrigger><SelectValue placeholder="None — not linked to strategy" /></SelectTrigger>
              <SelectContent>
                {milestones.length === 0 && <div className="px-2 py-1.5 text-xs text-muted-foreground">No milestones — create one in Strategy</div>}
                {milestones.map((m) => (
                  <SelectItem key={m.id} value={m.id}>
                    {m.quarter} · {m.title}{m.annual_goals?.title ? ` (${m.annual_goals.title})` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2"><Label>Due date</Label><Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} /></div>
          <Button type="submit" className="w-full" size="lg">Create project</Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
