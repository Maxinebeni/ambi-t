import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { bootstrapFirstManager, setupStatus } from "@/lib/admin.functions";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/setup")({
  head: () => ({ meta: [{ title: "Setup — Ambi-Tech" }] }),
  component: SetupPage,
});

function SetupPage() {
  const navigate = useNavigate();
  const check = useServerFn(setupStatus);
  const bootstrap = useServerFn(bootstrapFirstManager);
  const { data: status, isLoading } = useQuery({ queryKey: ["setup-status"], queryFn: () => check() });

  const [email, setEmail] = useState("maxine@ambi-tech.rw");
  const [fullName, setFullName] = useState("Maxine");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      await bootstrap({ data: { email, password, fullName } });
      await supabase.auth.signInWithPassword({ email, password });
      toast.success("Admin created. Welcome!");
      navigate({ to: "/dashboard", replace: true });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Setup failed");
    } finally {
      setSubmitting(false);
    }
  }

  if (isLoading) return null;
  if (status && !status.needsSetup) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-background">
        <div className="max-w-md text-center">
          <Logo className="justify-center mb-6" />
          <h1 className="text-xl font-semibold">Setup already complete</h1>
          <p className="text-muted-foreground mt-2 text-sm">An admin has been created. Sign in to continue.</p>
          <Button className="mt-6" onClick={() => navigate({ to: "/auth" })}>Go to sign in</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-background">
      <div className="w-full max-w-md">
        <Logo className="justify-center mb-8" />
        <div className="bg-card border rounded-xl p-6 shadow-sm">
          <h1 className="text-xl font-semibold">Create the first admin</h1>
          <p className="text-sm text-muted-foreground mt-1">This will become the CEO/Manager account.</p>
          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="fullName">Full name</Label>
              <Input id="fullName" required value={fullName} onChange={(e) => setFullName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input id="password" type="password" required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="At least 8 characters" />
            </div>
            <Button type="submit" className="w-full" size="lg" disabled={submitting}>
              {submitting ? "Creating…" : "Create admin & sign in"}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
