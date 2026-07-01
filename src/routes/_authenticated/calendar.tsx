import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useProfile } from "@/lib/auth";
import { DeptBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { useDepartments } from "@/lib/useDepartments";

export const Route = createFileRoute("/_authenticated/calendar")({
  head: () => ({ meta: [{ title: "Calendar — Ambi-Tech" }] }),
  component: CalendarPage,
});

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function startOfMonth(d: Date) { return new Date(d.getFullYear(), d.getMonth(), 1); }
function addMonths(d: Date, n: number) { return new Date(d.getFullYear(), d.getMonth() + n, 1); }
function ymd(d: Date) { return d.toISOString().slice(0, 10); }

function buildMonthGrid(monthStart: Date): Date[] {
  const first = startOfMonth(monthStart);
  const offset = (first.getDay() + 6) % 7; // Mon=0
  const start = new Date(first);
  start.setDate(first.getDate() - offset);
  return Array.from({ length: 42 }, (_, i) => {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    return d;
  });
}

function CalendarPage() {
  const { data: profile } = useProfile();
  const isManager = !!profile?.isManager;
  const [cursor, setCursor] = useState(() => startOfMonth(new Date()));
  const [view, setView] = useState<"all" | "mine" | string>(isManager ? "all" : "mine");

  const { data: tasks = [] } = useQuery({
    queryKey: ["cal-tasks"],
    queryFn: async () =>
      (await supabase.from("tasks").select("id, title, due_date, department, assignee_id, co_assignees, status").not("due_date", "is", null)).data ?? [],
  });
  const { data: projects = [] } = useQuery({
    queryKey: ["cal-projects"],
    queryFn: async () =>
      (await supabase.from("projects").select("id, title, due_date, department").not("due_date", "is", null)).data ?? [],
  });

  const filteredTasks = tasks.filter((t: any) => {
    if (view === "mine") return t.assignee_id === profile?.id || (t.co_assignees ?? []).includes(profile?.id);
    if (view === "all") return true;
    return t.department === view;
  });
  const filteredProjects = projects.filter((p: any) => {
    if (view === "mine") return true; // projects shown for context
    if (view === "all") return true;
    return p.department === view;
  });

  const byDay: Record<string, { kind: "Task" | "Project"; id: string; title: string; department?: string; status?: string }[]> = {};
  for (const t of filteredTasks) (byDay[t.due_date] ??= []).push({ kind: "Task", id: t.id, title: t.title, department: t.department ?? undefined, status: t.status });
  for (const p of filteredProjects) (byDay[p.due_date] ??= []).push({ kind: "Project", id: p.id, title: p.title, department: p.department ?? undefined });

  const grid = buildMonthGrid(cursor);
  const monthLabel = cursor.toLocaleDateString(undefined, { month: "long", year: "numeric" });
  const todayStr = ymd(new Date());

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-semibold">Calendar</h1>
          <p className="text-muted-foreground mt-1">Deadlines across the company.</p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={view} onValueChange={setView}>
            <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All departments</SelectItem>
              <SelectItem value="mine">My tasks</SelectItem>
              <SelectItem value="Finance">Finance</SelectItem>
              <SelectItem value="Operations">Operations</SelectItem>
              <SelectItem value="Marketing">Marketing</SelectItem>
              <SelectItem value="IT">IT</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="bg-card border rounded-xl p-4">
        <div className="flex items-center justify-between mb-3">
          <Button variant="ghost" size="sm" onClick={() => setCursor(addMonths(cursor, -1))}><ChevronLeft size={16} /></Button>
          <div className="font-semibold">{monthLabel}</div>
          <div className="flex gap-1">
            <Button variant="ghost" size="sm" onClick={() => setCursor(startOfMonth(new Date()))}>Today</Button>
            <Button variant="ghost" size="sm" onClick={() => setCursor(addMonths(cursor, 1))}><ChevronRight size={16} /></Button>
          </div>
        </div>
        <div className="grid grid-cols-7 gap-px bg-border rounded-lg overflow-hidden">
          {WEEKDAYS.map((d) => (
            <div key={d} className="bg-muted text-muted-foreground text-xs font-medium text-center py-2">{d}</div>
          ))}
          {grid.map((day, i) => {
            const key = ymd(day);
            const inMonth = day.getMonth() === cursor.getMonth();
            const isToday = key === todayStr;
            const items = byDay[key] ?? [];
            return (
              <div key={i} className={cn(
                "bg-card min-h-24 md:min-h-28 p-1.5 flex flex-col gap-1",
                !inMonth && "opacity-40",
              )}>
                <div className={cn(
                  "text-xs font-medium self-end px-1.5 rounded",
                  isToday && "bg-primary text-primary-foreground",
                )}>{day.getDate()}</div>
                <div className="flex-1 space-y-1 overflow-hidden">
                  {items.slice(0, 3).map((it) => (
                    <div key={`${it.kind}-${it.id}`} className={cn(
                      "text-[11px] leading-tight px-1.5 py-0.5 rounded truncate",
                      it.kind === "Project" ? "bg-primary/10 text-primary" :
                      it.status === "approved" ? "bg-success/20 text-[color:var(--success-foreground)] line-through" :
                      "bg-warning/20 text-warning-foreground",
                    )} title={`${it.kind}: ${it.title}`}>{it.title}</div>
                  ))}
                  {items.length > 3 && <div className="text-[10px] text-muted-foreground px-1.5">+{items.length - 3} more</div>}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="bg-card border rounded-xl p-4 space-y-2">
        <h3 className="font-semibold text-sm mb-2">{monthLabel} — upcoming</h3>
        {Object.entries(byDay)
          .filter(([d]) => d >= todayStr && new Date(d).getMonth() === cursor.getMonth())
          .sort(([a], [b]) => (a < b ? -1 : 1))
          .slice(0, 10)
          .map(([date, list]) => (
            <div key={date} className="flex items-start justify-between text-sm border-b last:border-0 py-1.5">
              <div className="flex-1">
                <div className="font-medium">{new Date(date).toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })}</div>
                <ul className="text-muted-foreground text-xs mt-0.5">
                  {list.map((i) => <li key={`${i.kind}-${i.id}`}>· {i.title} <span className="opacity-70">({i.kind})</span></li>)}
                </ul>
              </div>
              {list[0].department && <DeptBadge dept={list[0].department} />}
            </div>
          ))}
        {Object.keys(byDay).length === 0 && <p className="text-muted-foreground text-sm">No deadlines this month.</p>}
      </div>
    </div>
  );
}
