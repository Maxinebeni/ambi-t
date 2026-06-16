import { Link, useRouterState, useNavigate } from "@tanstack/react-router";
import { Logo } from "./Logo";
import { useAuth, useProfile } from "@/lib/auth";
import { LayoutDashboard, FolderKanban, ListChecks, CalendarDays, FileUp, CheckCircle2, Users, LogOut, Menu, Target } from "lucide-react";
import { useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface NavItem { to: string; label: string; icon: typeof LayoutDashboard; managerOnly?: boolean }

const NAV: NavItem[] = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/strategy", label: "Strategy", icon: Target, managerOnly: true },
  { to: "/projects", label: "Projects", icon: FolderKanban },
  { to: "/tasks", label: "My Week", icon: ListChecks },
  { to: "/calendar", label: "Calendar", icon: CalendarDays },
  { to: "/action-items", label: "Meeting Notes", icon: FileUp, managerOnly: true },
  { to: "/approvals", label: "Approvals", icon: CheckCircle2, managerOnly: true },
  { to: "/team", label: "Team", icon: Users, managerOnly: true },
];

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { signOut } = useAuth();
  const { data: profile } = useProfile();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  const items = NAV.filter((n) => !n.managerOnly || profile?.isManager);

  async function handleSignOut() {
    await signOut();
    navigate({ to: "/auth", replace: true });
  }

  return (
    <div className="min-h-screen flex bg-background">
      {/* Mobile top bar */}
      <header className="lg:hidden fixed top-0 inset-x-0 h-14 bg-sidebar text-sidebar-foreground flex items-center justify-between px-4 z-40">
        <Logo variant="light" />
        <button onClick={() => setOpen((v) => !v)} className="p-2 rounded-md hover:bg-sidebar-accent">
          <Menu size={20} />
        </button>
      </header>

      {/* Sidebar */}
      <aside className={cn(
        "fixed lg:static inset-y-0 left-0 z-50 w-64 bg-sidebar text-sidebar-foreground flex-col transition-transform",
        open ? "flex" : "hidden lg:flex"
      )}>
        <div className="h-16 flex items-center px-6 border-b border-sidebar-border">
          <Logo variant="light" />
        </div>
        <nav className="flex-1 px-3 py-4 space-y-1">
          {items.map((item) => {
            const active = pathname === item.to || pathname.startsWith(item.to + "/");
            const Icon = item.icon;
            return (
              <Link
                key={item.to}
                to={item.to}
                onClick={() => setOpen(false)}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                  active ? "bg-sidebar-accent text-sidebar-accent-foreground" : "text-sidebar-foreground/80 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground"
                )}
              >
                <Icon size={18} />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="p-4 border-t border-sidebar-border space-y-3">
          <div className="text-xs">
            <div className="font-medium truncate">{profile?.full_name || profile?.email}</div>
            <div className="text-sidebar-foreground/60">
              {profile?.isManager ? "Manager / CEO" : profile?.department || "Team Member"}
            </div>
          </div>
          <Button variant="secondary" size="sm" className="w-full justify-start" onClick={handleSignOut}>
            <LogOut size={16} className="mr-2" /> Sign out
          </Button>
        </div>
      </aside>

      <main className="flex-1 lg:ml-0 mt-14 lg:mt-0 min-w-0">
        <div className="max-w-7xl mx-auto p-4 md:p-8">{children}</div>
      </main>
    </div>
  );
}
