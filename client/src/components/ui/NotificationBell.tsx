import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "../../store/authStore";
import { useEmployeeTaskStats } from "../../modules/employee-tasks/useEmployeeTasks";

// Shows how many tasks are assigned to the logged-in user (Pending + In Progress — the ones
// still needing action). Reuses useEmployeeTaskStats with no employeeId: the backend
// (getStats in employee-tasks.service.ts) already scopes that call to "my own tasks" for anyone
// who isn't Admin/CEO, and Admin gets the org-wide total — same rule the rest of the app follows.
export default function NotificationBell() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const { data } = useEmployeeTaskStats();
  const stats = data?.data;
  const pending = stats?.statusCounts.Pending ?? 0;
  const inProgress = stats?.statusCounts["In Progress"] ?? 0;
  const assignedCount = pending + inProgress;

  useEffect(() => {
    if (!open) return;
    const onClickAway = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    window.addEventListener("mousedown", onClickAway);
    return () => window.removeEventListener("mousedown", onClickAway);
  }, [open]);

  if (!user?.employeeId) return null; // no linked employee record -> nothing personal to show

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label={`Notifications: ${assignedCount} task${assignedCount === 1 ? "" : "s"} assigned to you`}
        className="relative text-lg px-2 py-1 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
      >
        <span aria-hidden>🔔</span>
        {assignedCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-rose-500 text-white text-[10px] font-bold flex items-center justify-center shadow">
            {assignedCount > 99 ? "99+" : assignedCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-72 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-lg z-50 overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-800 bg-gradient-to-br from-teal-600 to-emerald-700 text-white">
            <div className="text-sm font-semibold">Your Tasks</div>
            <div className="text-xs text-white/80 mt-0.5">
              {assignedCount > 0
                ? `${assignedCount} task${assignedCount === 1 ? "" : "s"} need your attention`
                : "You're all caught up"}
            </div>
          </div>
          <div className="p-3 space-y-1.5">
            <div className="flex items-center justify-between text-sm px-2 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-800/60">
              <span className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                <span aria-hidden>🕐</span> Pending
              </span>
              <span className="font-semibold text-slate-800 dark:text-slate-100">{pending}</span>
            </div>
            <div className="flex items-center justify-between text-sm px-2 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-800/60">
              <span className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                <span aria-hidden>⚙️</span> In Progress
              </span>
              <span className="font-semibold text-slate-800 dark:text-slate-100">{inProgress}</span>
            </div>
          </div>
          <button
            onClick={() => {
              setOpen(false);
              navigate("/my-tasks");
            }}
            className="w-full text-center text-sm font-medium text-teal-700 dark:text-teal-300 bg-teal-50 dark:bg-teal-500/10 hover:bg-teal-100 dark:hover:bg-teal-500/20 px-4 py-2.5 transition-colors"
          >
            View My Tasks →
          </button>
        </div>
      )}
    </div>
  );
}
