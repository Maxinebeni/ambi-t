import { createFileRoute, redirect } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { DeptBadge } from "@/components/StatusBadge";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { inviteUser, removeUser } from "@/lib/admin.functions";
import { useDepartments } from "@/lib/useDepartments";

export const Route = createFileRoute("/_authenticated/team")({
  head: () => ({ meta: [{ title: "Team — Ambi-Tech" }] }),
  beforeLoad: async () => {
    const { data } = await supabase.auth.getUser();
    if (!data.user) throw redirect({ to: "/auth" });
    const { data: roles } = await supabase.from("user_roles").select("role").eq("user_id", data.user.id);
    if (!roles?.some((r) => r.role === "manager")) throw redirect({ to: "/dashboard" });
  },
  component: TeamPage,
});

function TeamPage() {
  const qc = useQueryClient();
  const invite = useServerFn(inviteUser);
  const remove = useServerFn(removeUser);
  const { data: departments = [] } = useDepartments();
  const [newDept, setNewDept] = useState("");

  const { data: members = [] } = useQuery({
    queryKey: ["team-full"],
    queryFn: async () => {
      const { data: profiles } = await supabase.from("profiles").select("*").order("full_name");
      const { data: roles } = await supabase.from("user_roles").select("*");
      return (profiles ?? []).map((p: any) => ({
        ...p, isManager: !!roles?.some((r) => r.user_id === p.id && r.role === "manager"),
      }));
    },
  });

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ email: "", fullName: "", department: "", role: "team_member", tempPassword: "" });
  const [submitting, setSubmitting] = useState(false);

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      await invite({ data: {
        email: form.email, fullName: form.fullName,
        department: form.department as any || undefined,
        role: form.role as any, tempPassword: form.tempPassword,
      }});
      toast.success(`${form.fullName} added. Share their temporary password.`);
      setOpen(false);
      setForm({ email: "", fullName: "", department: "", role: "team_member", tempPassword: "" });
      qc.invalidateQueries({ queryKey: ["team-full"] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    } finally { setSubmitting(false); }
  }

  async function handleRemove(userId: string, name: string) {
    if (!confirm(`Remove ${name} from the team?`)) return;
    try {
      await remove({ data: { userId } });
      toast.success("Removed");
      qc.invalidateQueries({ queryKey: ["team-full"] });
    } catch (e) { toast.error(e instanceof Error ? e.message : "Failed"); }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-semibold">Team</h1>
          <p className="text-muted-foreground mt-1">Invite people. They sign in with the email and temporary password you give them.</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button size="lg"><Plus size={18} className="mr-1"/> Invite member</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Invite team member</DialogTitle></DialogHeader>
            <form onSubmit={handleInvite} className="space-y-4">
              <div className="space-y-2"><Label>Full name</Label><Input required value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} /></div>
              <div className="space-y-2"><Label>Email</Label><Input type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Department</Label>
                  <Select value={form.department} onValueChange={(v) => setForm({ ...form, department: v })}>
                    <SelectTrigger><SelectValue placeholder="—"/></SelectTrigger>
                    <SelectContent>
                      {departments.map((d) => <SelectItem key={d.name} value={d.name}>{d.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Role</Label>
                  <Select value={form.role} onValueChange={(v) => setForm({ ...form, role: v })}>
                    <SelectTrigger><SelectValue/></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="team_member">Team Member</SelectItem>
                      <SelectItem value="manager">Manager / CEO</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2"><Label>Temporary password</Label><Input type="text" required minLength={8} value={form.tempPassword} onChange={(e) => setForm({ ...form, tempPassword: e.target.value })} placeholder="At least 8 characters" /><p className="text-xs text-muted-foreground">Share this with them. They can change it after signing in.</p></div>
              <Button type="submit" size="lg" className="w-full" disabled={submitting}>{submitting ? "Adding…" : "Add member"}</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="bg-card border rounded-xl divide-y">
        {members.map((m: any) => (
          <div key={m.id} className="p-4 flex items-center justify-between gap-3 flex-wrap">
            <div>
              <div className="font-medium">{m.full_name || m.email}</div>
              <div className="text-sm text-muted-foreground flex gap-2 items-center mt-1">
                <span>{m.email}</span>
                <DeptBadge dept={m.department} />
                {m.isManager && <span className="text-xs px-2 py-0.5 rounded bg-primary text-primary-foreground">Manager</span>}
              </div>
            </div>
            <Button variant="ghost" size="icon" onClick={() => handleRemove(m.id, m.full_name || m.email)}><Trash2 size={16}/></Button>
          </div>
        ))}
        {members.length === 0 && <p className="p-4 text-muted-foreground">No team members yet.</p>}
      </div>

      <div className="space-y-3">
        <div>
          <h2 className="text-lg font-semibold">Departments</h2>
          <p className="text-sm text-muted-foreground">The four defaults are locked. Add more if your company grows.</p>
        </div>
        <div className="bg-card border rounded-xl divide-y">
          {departments.map((d) => (
            <div key={d.name} className="p-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <DeptBadge dept={d.name} />
                {d.is_locked && <span className="text-xs text-muted-foreground">Default</span>}
              </div>
              {!d.is_locked && (
                <Button variant="ghost" size="icon" onClick={async () => {
                  if (!confirm(`Remove department "${d.name}"?`)) return;
                  const { error } = await supabase.from("departments").delete().eq("name", d.name);
                  if (error) { toast.error(error.message); return; }
                  toast.success("Removed");
                  qc.invalidateQueries({ queryKey: ["departments"] });
                }}><Trash2 size={16}/></Button>
              )}
            </div>
          ))}
        </div>
        <form className="flex gap-2" onSubmit={async (e) => {
          e.preventDefault();
          const name = newDept.trim();
          if (!name) return;
          const { error } = await supabase.from("departments").insert({ name });
          if (error) { toast.error(error.message); return; }
          setNewDept("");
          toast.success(`Added ${name}`);
          qc.invalidateQueries({ queryKey: ["departments"] });
        }}>
          <Input placeholder="e.g. Sales" value={newDept} onChange={(e) => setNewDept(e.target.value)} />
          <Button type="submit"><Plus size={16} className="mr-1"/> Add department</Button>
        </form>
      </div>
    </div>
  );
}
