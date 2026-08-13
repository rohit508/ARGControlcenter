import { useMemo, useState } from "react";
import { useAuthStore } from "../../store/authStore";
import { PriorityBadge, StatusBadge } from "../../components/ui/Badge";
import { useEmployeeTasks } from "./useEmployeeTasks";
import StatusUpdateModal from "./StatusUpdateModal";
import { EmployeeTask, EmployeeTaskAssignment } from "../../types";
import { formatDueDateTime } from "../../utils/formatDateTime";

const STATUSES = ["Pending", "In Progress", "Completed", "Not Done", "Completed After Due Date"] as const;
type TaskStatus = typeof STATUSES[number];

interface TaskRow {
  task: EmployeeTask;
  assignment: EmployeeTaskAssignment;
}

// Per-status accent so tabs and card left-borders read at a glance — mirrors the icon/accent
// language used on the Dashboard and Task Analytics pages, kept in the page's own teal identity.
const STATUS_META: Record<TaskStatus, { icon: string; activeBg: string; activeText: string; dot: string; cardBar: string }> = {
  Pending: { icon: "🕐", activeBg: "bg-slate-600", activeText: "text-white", dot: "bg-slate-400", cardBar: "bg-slate-400" },
  "In Progress": { icon: "⚙️", activeBg: "bg-amber-500", activeText: "text-white", dot: "bg-amber-500", cardBar: "bg-amber-500" },
  Completed: { icon: "✅", activeBg: "bg-emerald-600", activeText: "text-white", dot: "bg-emerald-500", cardBar: "bg-emerald-500" },
  "Not Done": { icon: "⛔", activeBg: "bg-rose-600", activeText: "text-white", dot: "bg-rose-500", cardBar: "bg-rose-500" },
  "Completed After Due Date": { icon: "⏰", activeBg: "bg-orange-500", activeText: "text-white", dot: "bg-orange-500", cardBar: "bg-orange-500" },
};

export default function MyTasksPage() {
  const user = useAuthStore((s) => s.user);
  const { data, isLoading } = useEmployeeTasks();
  const [selected, setSelected] = useState<TaskRow | null>(null);
  const [activeTab, setActiveTab] = useState<TaskStatus>("Pending");

  const { myRows, statusCounts } = useMemo(() => {
    if (!user?.employeeId) return { myRows: new Map<TaskStatus, TaskRow[]>(), statusCounts: {} };

    const allRows = (data?.data ?? [])
      .map((task) => {
        const mine = task.assignments.find((a) => a.employeeId === user.employeeId);
        return mine ? { task, assignment: mine } : null;
      })
      .filter((r): r is TaskRow => r !== null)
      .sort((a, b) => (a.task.dueDate || "9999").localeCompare(b.task.dueDate || "9999"));

    const grouped = new Map<TaskStatus, TaskRow[]>();
    const counts: Record<string, number> = {};

    for (const status of STATUSES) {
      const filtered = allRows.filter((r) => r.assignment.status === status);
      grouped.set(status, filtered);
      counts[status] = filtered.length;
    }

    return { myRows: grouped, statusCounts: counts };
  }, [data, user]);

  if (isLoading) return <div className="text-slate-400">Loading…</div>;

  if (!user?.employeeId) {
    return (
      <div className="text-sm text-slate-400 border border-dashed border-slate-300 dark:border-slate-700 rounded-lg py-12 text-center">
        Your login isn't linked to an employee record, so there are no personal tasks to show here.
      </div>
    );
  }

  const currentTasks = myRows.get(activeTab) || [];
  const employeeName = user?.employeeName || "Employee";
  const totalTasks = Array.from(myRows.values()).reduce((sum, tasks) => sum + tasks.length, 0);

  return (
    <div>
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-teal-600 via-teal-600 to-emerald-700 px-6 py-6 mb-6 text-white shadow-lg">
        <div className="absolute -right-10 -top-12 w-48 h-48 rounded-full bg-white/10" aria-hidden />
        <div className="absolute right-20 bottom-0 w-20 h-20 rounded-full bg-white/10" aria-hidden />
        <div className="relative flex items-center gap-3">
          <span className="w-11 h-11 rounded-xl bg-white/15 flex items-center justify-center text-xl shrink-0" aria-hidden>
            👋
          </span>
          <div>
            <h1 className="text-2xl font-bold">My Tasks</h1>
            <p className="text-sm text-white/80 mt-0.5">
              {employeeName} — {totalTasks} total task{totalTasks === 1 ? "" : "s"} assigned
            </p>
          </div>
        </div>
      </div>

      {totalTasks === 0 ? (
        <div className="text-sm text-slate-400 border border-dashed border-slate-300 dark:border-slate-700 rounded-2xl py-14 text-center bg-white dark:bg-slate-900">
          <div className="text-3xl mb-2" aria-hidden>🎉</div>
          No tasks assigned to you right now.
        </div>
      ) : (
        <>
          {/* Tabs */}
          <div className="flex gap-2 mb-6 overflow-x-auto pb-1">
            {STATUSES.map((status) => {
              const meta = STATUS_META[status];
              const active = activeTab === status;
              return (
                <button
                  key={status}
                  onClick={() => setActiveTab(status)}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium whitespace-nowrap transition-all shrink-0 ${
                    active
                      ? `${meta.activeBg} ${meta.activeText} shadow-md`
                      : "bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700"
                  }`}
                >
                  <span aria-hidden>{meta.icon}</span>
                  <span>{status}</span>
                  <span
                    className={`text-xs rounded-full px-2 py-0.5 font-semibold ${
                      active ? "bg-white/25" : "bg-slate-100 dark:bg-slate-800"
                    }`}
                  >
                    {statusCounts[status] || 0}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Task Grid */}
          {currentTasks.length === 0 ? (
            <div className="text-sm text-slate-400 border border-dashed border-slate-300 dark:border-slate-700 rounded-2xl py-14 text-center bg-white dark:bg-slate-900">
              No {activeTab.toLowerCase()} tasks right now.
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {currentTasks.map(({ task, assignment }) => {
                const meta = STATUS_META[assignment.status as TaskStatus] ?? STATUS_META.Pending;
                return (
                  <button
                    key={assignment.id}
                    onClick={() => setSelected({ task, assignment })}
                    className="relative text-left overflow-hidden bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 pl-5 shadow-sm hover:shadow-lg hover:-translate-y-0.5 hover:border-slate-300 dark:hover:border-slate-700 transition-all"
                  >
                    <span className={`absolute inset-y-0 left-0 w-1.5 ${meta.cardBar}`} aria-hidden />
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <span className="text-xs font-mono text-slate-400">{task.taskCode}</span>
                      <PriorityBadge priority={task.priority} />
                    </div>
                    <div className="font-semibold text-sm mb-1 line-clamp-2 text-slate-800 dark:text-slate-100">{task.title}</div>
                    {task.departmentName && (
                      <div className="text-[11px] text-teal-600 dark:text-teal-400 font-medium mb-1">{task.departmentName}</div>
                    )}
                    {task.description && <p className="text-xs text-slate-500 dark:text-slate-400 mb-3 line-clamp-2">{task.description}</p>}
                    <div className="flex items-center justify-between mt-auto pt-2">
                      <StatusBadge status={assignment.status} />
                      <span className="text-xs text-slate-400 flex items-center gap-1">
                        <span aria-hidden>📅</span>
                        {task.dueDate ? formatDueDateTime(task.dueDate, task.dueTime) : "No due date"}
                      </span>
                    </div>
                    {assignment.status === "Not Done" && assignment.notDoneReason && (
                      <div className="mt-2 text-xs text-danger-600 dark:text-danger-400 bg-danger-50 dark:bg-danger-950 rounded-md px-2 py-1 line-clamp-2">
                        {assignment.notDoneReason}
                      </div>
                    )}
                    {assignment.progressNotes && (
                      <div className="mt-2 text-xs text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-800 rounded-md px-2 py-1 line-clamp-2">
                        📝 {assignment.progressNotes}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </>
      )}

      <StatusUpdateModal
        open={!!selected}
        onClose={() => setSelected(null)}
        task={selected?.task ?? null}
        assignment={selected?.assignment ?? null}
      />
    </div>
  );
}
