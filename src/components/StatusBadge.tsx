import { cn } from "@/lib/utils";

const PROJECT_STYLES: Record<string, string> = {
  not_started: "bg-muted text-muted-foreground",
  in_progress: "bg-warning/20 text-warning-foreground",
  complete: "bg-success/20 text-[color:var(--success-foreground)]",
};
const TASK_STYLES: Record<string, string> = {
  pending: "bg-muted text-muted-foreground",
  in_progress: "bg-warning/20 text-warning-foreground",
  paused: "bg-amber-100 text-amber-800",
  blocked: "bg-destructive/15 text-destructive",
  submitted: "bg-primary/10 text-primary",
  approved: "bg-success/20 text-[color:var(--success-foreground)]",
};
const LABELS: Record<string, string> = {
  not_started: "Not started",
  in_progress: "In progress",
  complete: "Complete",
  pending: "Not started",
  paused: "Paused",
  blocked: "Blocked",
  submitted: "Pending approval",
  approved: "Completed",
};

export function StatusBadge({ status, kind = "task" }: { status: string; kind?: "task" | "project" }) {
  const styles = kind === "project" ? PROJECT_STYLES : TASK_STYLES;
  return (
    <span className={cn("inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium", styles[status] || "bg-muted text-muted-foreground")}>
      {LABELS[status] || status}
    </span>
  );
}

const DEPT_PALETTE = [
  "bg-blue-100 text-blue-800",
  "bg-amber-100 text-amber-800",
  "bg-purple-100 text-purple-800",
  "bg-slate-200 text-slate-800",
  "bg-emerald-100 text-emerald-800",
  "bg-rose-100 text-rose-800",
  "bg-cyan-100 text-cyan-800",
  "bg-indigo-100 text-indigo-800",
  "bg-orange-100 text-orange-800",
  "bg-teal-100 text-teal-800",
];
function hashStr(s: string) { let h = 0; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0; return h; }
export function DeptBadge({ dept }: { dept: string | null | undefined }) {
  if (!dept) return null;
  const fixed: Record<string, string> = {
    Finance: "bg-blue-100 text-blue-800",
    Operations: "bg-amber-100 text-amber-800",
    Marketing: "bg-purple-100 text-purple-800",
    IT: "bg-slate-200 text-slate-800",
  };
  const cls = fixed[dept] || DEPT_PALETTE[hashStr(dept) % DEPT_PALETTE.length];
  return <span className={cn("inline-flex px-2 py-0.5 rounded text-xs font-medium", cls)}>{dept}</span>;
}

const GOAL_STYLES: Record<string, string> = {
  on_track: "bg-success/20 text-[color:var(--success-foreground)]",
  at_risk: "bg-warning/20 text-warning-foreground",
  behind: "bg-destructive/15 text-destructive",
  complete: "bg-primary/10 text-primary",
};
const GOAL_LABELS: Record<string, string> = {
  on_track: "On Track",
  at_risk: "At Risk",
  behind: "Behind",
  complete: "Complete",
};
export function GoalStatusBadge({ status }: { status: string }) {
  return (
    <span className={cn("inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium", GOAL_STYLES[status] || "bg-muted text-muted-foreground")}>
      {GOAL_LABELS[status] || status}
    </span>
  );
}
