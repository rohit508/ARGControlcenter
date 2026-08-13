import { useQuery } from "@tanstack/react-query";
import { api } from "../../services/apiClient";

interface GanttTask {
  id: number;
  taskCode: string;
  name: string;
  status: string;
  startDate: string | null;
  finishDate: string | null;
  progressPct: number;
  isCriticalCache: boolean;
  isMilestone: boolean;
}

function barColor(t: GanttTask): string {
  if (t.status === "Completed") return "bg-success-500";
  if (t.status === "Delayed" || t.status === "Blocked") return "bg-danger-500";
  if (t.isCriticalCache) return "bg-warning-500";
  return "bg-brand-400";
}

export default function GanttChart({ projectId }: { projectId: number }) {
  const { data, isLoading } = useQuery({
    queryKey: ["gantt", projectId],
    queryFn: () => api.get<{ data: GanttTask[] }>(`/gantt?projectId=${projectId}`),
  });

  if (isLoading) return <div className="text-slate-400 text-sm">Loading Gantt…</div>;
  const tasks = data!.data.filter((t) => t.startDate && t.finishDate);
  if (tasks.length === 0) return <div className="text-slate-400 text-sm">No scheduled tasks yet.</div>;

  const allDates = tasks.flatMap((t) => [new Date(t.startDate!).getTime(), new Date(t.finishDate!).getTime()]);
  const min = Math.min(...allDates);
  const max = Math.max(...allDates);
  const span = Math.max(1, max - min);
  const pct = (d: string) => ((new Date(d).getTime() - min) / span) * 100;

  return (
    <div className="border border-slate-200 dark:border-slate-800 rounded-lg p-4 overflow-x-auto">
      <div className="min-w-[700px]">
        {tasks.map((t) => {
          const left = pct(t.startDate!);
          const width = Math.max(1, pct(t.finishDate!) - left);
          return (
            <div key={t.id} className="flex items-center gap-3 mb-2">
              <div className="w-56 shrink-0 text-xs truncate" title={t.name}>
                <span className="text-slate-400">{t.taskCode}</span> {t.name}
                {t.isMilestone && <span className="ml-1">◆</span>}
              </div>
              <div className="relative flex-1 h-5 bg-slate-100 dark:bg-slate-800 rounded">
                <div
                  className={`absolute h-5 rounded ${barColor(t)}`}
                  style={{ left: `${left}%`, width: `${width}%` }}
                  title={`${t.status} — ${(t.progressPct * 100).toFixed(0)}%`}
                >
                  <div className="h-full bg-black/20 rounded-l" style={{ width: `${t.progressPct * 100}%` }} />
                </div>
              </div>
            </div>
          );
        })}
      </div>
      <div className="flex gap-4 mt-3 text-xs text-slate-400">
        <Legend color="bg-brand-400" label="On track" />
        <Legend color="bg-success-500" label="Completed" />
        <Legend color="bg-warning-500" label="Critical" />
        <Legend color="bg-danger-500" label="Delayed / Blocked" />
      </div>
    </div>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <div className="flex items-center gap-1">
      <span className={`w-3 h-3 rounded ${color} inline-block`} />
      {label}
    </div>
  );
}
