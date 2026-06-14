import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { setupStatus } from "@/lib/admin.functions";

export const Route = createFileRoute("/auth")({
  head: () => ({ meta: [{ title: "Sign in — Ambi-Tech" }] }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const checkSetup = useServerFn(setupStatus);
  const { data: status } = useQuery({ queryKey: ["setup-status"], queryFn: () => checkSetup() });

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/dashboard", replace: true });
    });
  }, [navigate]);

  async function handleSignIn(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Welcome back");
    navigate({ to: "/dashboard", replace: true });
  }

  return (
    <div className="min-h-screen grid lg:grid-cols-2 bg-background">
      <div className="hidden lg:flex flex-col justify-between p-12 bg-sidebar text-sidebar-foreground">
        <Logo variant="light" />
        <div>
          <h1 className="text-3xl font-semibold leading-tight">Run Ambi-Tech<br/>with clarity.</h1>
          <p className="mt-3 text-sidebar-foreground/70 max-w-sm">Projects, weekly tasks, meeting action items, and approvals — all in one calm place.</p>
        </div>
        <p className="text-xs text-sidebar-foreground/50">Finance · Operations · Marketing</p>
      </div>
      <div className="flex items-center justify-center p-6">
        <div className="w-full max-w-sm">
          <div className="lg:hidden mb-8"><Logo /></div>
          <h2 className="text-2xl font-semibold">Sign in</h2>
          <p className="text-sm text-muted-foreground mt-1">Use the email your manager invited you with.</p>

          <form onSubmit={handleSignIn} className="mt-6 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@ambi-tech.rw" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input id="password" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} />
            </div>
            <Button type="submit" className="w-full" size="lg" disabled={loading}>
              {loading ? "Signing in…" : "Sign in"}
            </Button>
          </form>

          {status?.needsSetup && (
            <div className="mt-6 p-4 rounded-lg border bg-accent/40 text-sm">
              <p className="font-medium">First time here?</p>
              <p className="text-muted-foreground mt-1">No admin has been set up yet.</p>
              <Link to="/setup" className="inline-block mt-2 text-primary font-medium hover:underline">Set up the first admin →</Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
