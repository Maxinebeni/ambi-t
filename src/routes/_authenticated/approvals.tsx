import { createFileRoute, redirect } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { DeptBadge } from "@/components/StatusBadge";
import { Check, ExternalLink, FileText } from "lucide-react";
import { toast } from "sonner";
import { getProofSignedUrl } from "@/lib/proof.functions";

export const Route = createFileRoute("/_authenticated/approvals")({
  head: () => ({ meta: [{ title: "Approvals — Ambi-Tech" }] }),
  beforeLoad: async () => {
    const { data } = await supabase.auth.getUser();
    if (!data.user) throw redirect({ to: "/auth" });
    const { data: roles } = await supabase.from("user_roles").select("role").eq("user_id", data.user.id);
    if (!roles?.some((r) => r.role === "manager")) throw redirect({ to: "/dashboard" });
  },
  component: ApprovalsPage,
});

function ApprovalsPage() {
  const qc = useQueryClient();
  const sign = useServerFn(getProofSignedUrl);
  const { data: tasks = [] } = useQuery({
    queryKey: ["approvals"],
    queryFn: async () => {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) return [];
      return (await supabase.from("tasks").select("*, profiles:assignee_id(full_name, email)").eq("status", "submitted").eq("created_by", user.user.id).order("submitted_at", { ascending: false })).data ?? [];
    },
  });

  async function approve(id: string) {
    const { data: user } = await supabase.auth.getUser();
    const { error } = await supabase.from("tasks").update({ status: "approved", approved_at: new Date().toISOString(), approved_by: user.user?.id }).eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success("Approved");
    qc.invalidateQueries();
  }

  async function reopen(id: string) {
    const { error } = await supabase.from("tasks").update({ status: "in_progress", submitted_at: null }).eq("id", id);
    if (error) { toast.error(error.message); return; }
    qc.invalidateQueries();
  }

  async function viewFile(path: string) {
    try {
      const { url } = await sign({ data: { path } });
      window.open(url, "_blank");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-semibold">Pending approvals</h1>
        <p className="text-muted-foreground mt-1">Tasks submitted for your review.</p>
      </div>
      <div className="space-y-3">
        {tasks.map((t: any) => (
          <div key={t.id} className="bg-card border rounded-xl p-5">
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <div className="min-w-0 flex-1">
                <div className="font-semibold">{t.title}</div>
                <div className="text-sm text-muted-foreground flex gap-2 mt-1 items-center">
                  <DeptBadge dept={t.department} />
                  {t.profiles?.full_name && <span>· {t.profiles.full_name}</span>}
                  {t.due_date && <span>· Due {t.due_date}</span>}
                </div>
                {t.proof_notes && <p className="text-sm mt-3">{t.proof_notes}</p>}
                <div className="flex gap-2 mt-3 flex-wrap">
                  {t.proof_url && (
                    <a href={t.proof_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-sm text-primary hover:underline">
                      <ExternalLink size={14}/> Open link
                    </a>
                  )}
                  {t.proof_file_path && (
                    <button onClick={() => viewFile(t.proof_file_path)} className="inline-flex items-center gap-1 text-sm text-primary hover:underline">
                      <FileText size={14}/> View file
                    </button>
                  )}
                </div>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => reopen(t.id)}>Reopen</Button>
                <Button onClick={() => approve(t.id)}><Check size={16} className="mr-1"/> Approve</Button>
              </div>
            </div>
          </div>
        ))}
        {tasks.length === 0 && <p className="text-muted-foreground">No pending approvals. Nice and clear.</p>}
      </div>
    </div>
  );
}
