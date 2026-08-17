import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { useAuthStore } from "../../store/authStore";
import { PriorityBadge, StatusBadge } from "../../components/ui/Badge";
import { useEmployeeTasks, useUpdateAssignmentStatus } from "./useEmployeeTasks";
import VoiceCommentsThread from "./VoiceCommentsThread";
import { ApiClientError } from "../../services/apiClient";
import { formatDateTime, formatDueDateTime } from "../../utils/formatDateTime";

// "Completed After Due Date" is server-decided only — see updateAssignmentStatus on the server —
// never offered as a selectable target here.
const USER_SELECTABLE_STATUSES = ["Pending", "In Progress", "Completed", "Not Done"];

export default function TicketDetailPage() {
  const { assignmentId } = useParams<{ assignmentId: string }>();
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const isAdmin = user?.roles.includes("Admin") ?? false;
  const { data, isLoading } = useEmployeeTasks();
  const updateStatus = useUpdateAssignmentStatus();
  const commentBoxRef = useRef<HTMLTextAreaElement>(null);

  const match = useMemo(() => {
    const idNum = Number(assignmentId);
    for (const task of data?.data ?? []) {
      const assignment = task.assignments.find((a) => a.id === idNum);
      if (assignment) return { task, assignment };
    }
    return null;
  }, [data, assignmentId]);

  const [status, setStatus] = useState("Pending");
  const [notDoneReason, setNotDoneReason] = useState("");
  const [statusMenuOpen, setStatusMenuOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!match) return;
    setStatus(match.assignment.status);
    setNotDoneReason(match.assignment.notDoneReason ?? "");
    setError(null);
  }, [match?.assignment.id]);

  const backTo = isAdmin ? "/employee-tasks" : "/my-tasks";

  if (isLoading) return <div className="text-slate-400 p-6">Loading ticket…</div>;

  if (!match) {
    return (
      <div className="p-6">
        <div className="text-sm text-slate-400 border border-dashed border-slate-300 dark:border-slate-700 rounded-lg py-12 text-center">
          This ticket doesn't exist, or you don't have access to it.
          <div className="mt-3">
            <button onClick={() => navigate(backTo)} className="text-sm px-3 py-1.5 rounded-md border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800">
              Back
            </button>
          </div>
        </div>
      </div>
    );
  }

  const { task, assignment } = match;
  const isLocked = assignment.status === "Completed After Due Date";

  async function changeStatus(newStatus: string) {
    setError(null);
    setStatusMenuOpen(false);
    if (newStatus === "Not Done" && !assignment.notDoneReason) {
      // Reason is mandatory server-side — collect it inline instead of silently failing.
      const reason = window.prompt("A reason is required to mark this task as Not Done:");
      if (!reason || !reason.trim()) return;
      setNotDoneReason(reason.trim());
      try {
        await updateStatus.mutateAsync({ assignmentId: assignment.id, payload: { status: newStatus, notDoneReason: reason.trim() } });
        setStatus(newStatus);
      } catch (err) {
        setError(err instanceof ApiClientError ? err.message : "Could not update status");
      }
      return;
    }
    try {
      await updateStatus.mutateAsync({ assignmentId: assignment.id, payload: { status: newStatus } });
      setStatus(newStatus);
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Could not update status");
    }
  }

  return (
    <div className="max-w-6xl mx-auto p-4 sm:p-6">
      {/* Breadcrumb */}
      <div className="text-sm text-slate-500 dark:text-slate-400 mb-2">
        <Link to={backTo} className="text-brand-600 hover:underline">
          {isAdmin ? "Employee Tasks" : "My Tasks"}
        </Link>
        <span className="mx-1.5">/</span>
        <span>{task.taskCode}</span>
      </div>

      {/* Title */}
      <h1 className="text-2xl font-semibold text-slate-800 dark:text-slate-100 mb-4">{task.title}</h1>

      {/* Action bar */}
      {error && <div className="mb-3 text-sm text-danger-500 bg-danger-100 dark:bg-danger-950 rounded-md px-3 py-2">{error}</div>}
      <div className="flex flex-wrap items-center gap-2 mb-6 pb-4 border-b border-slate-200 dark:border-slate-800">
        <button
          onClick={() => commentBoxRef.current?.focus()}
          className="text-sm px-3 py-1.5 rounded-md border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800"
        >
          💬 Add comment
        </button>

        <div className="relative">
          <button
            onClick={() => !isLocked && setStatusMenuOpen((v) => !v)}
            disabled={isLocked}
            className="text-sm px-3 py-1.5 rounded-md bg-brand-600 hover:bg-brand-700 text-white disabled:opacity-50 flex items-center gap-1.5"
          >
            {status} <span aria-hidden>▾</span>
          </button>
          {statusMenuOpen && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setStatusMenuOpen(false)} />
              <div className="absolute z-20 mt-1 w-48 rounded-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-lg py-1">
                {USER_SELECTABLE_STATUSES.map((s) => (
                  <button
                    key={s}
                    onClick={() => changeStatus(s)}
                    className={`w-full text-left text-sm px-3 py-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 ${s === status ? "font-semibold" : ""}`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>

        <span className="ml-auto flex items-center gap-2">
          <PriorityBadge priority={task.priority} />
        </span>
      </div>

      {/* Two-column body */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-8">
        {/* Main column */}
        <div>
          <section className="mb-8">
            <h2 className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-2">Description</h2>
            <div className="text-sm text-slate-700 dark:text-slate-200 whitespace-pre-wrap">
              {task.description || <span className="text-slate-400">No description provided.</span>}
            </div>
            {assignment.notDoneReason && (
              <div className="mt-3 text-sm text-danger-600 dark:text-danger-400 bg-danger-50 dark:bg-danger-950 rounded-md px-3 py-2">
                <span className="font-medium">Not Done reason:</span> {assignment.notDoneReason}
              </div>
            )}
          </section>

          <section>
            <h2 className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-3">Activity</h2>
            <VoiceCommentsThread assignmentId={assignment.id} composerRef={commentBoxRef} />
          </section>
        </div>

        {/* Right metadata panel */}
        <aside className="space-y-5">
          <div>
            <h2 className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-2">Details</h2>
            <div className="rounded-lg border border-slate-200 dark:border-slate-800 divide-y divide-slate-200 dark:divide-slate-800 text-sm">
              <div className="flex justify-between px-3 py-2">
                <span className="text-slate-400">Status</span>
                <StatusBadge status={assignment.status} />
              </div>
              <div className="flex justify-between px-3 py-2">
                <span className="text-slate-400">Assignee</span>
                <span className="font-medium">{assignment.employeeName}</span>
              </div>
              <div className="flex justify-between px-3 py-2">
                <span className="text-slate-400">Department</span>
                <span className="font-medium">{task.departmentName || "—"}</span>
              </div>
              <div className="flex justify-between px-3 py-2">
                <span className="text-slate-400">Due Date</span>
                <span className="font-medium">{formatDueDateTime(task.dueDate, task.dueTime)}</span>
              </div>
            </div>
          </div>

          <div>
            <h2 className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-2">Timeline</h2>
            <div className="rounded-lg border border-slate-200 dark:border-slate-800 divide-y divide-slate-200 dark:divide-slate-800 text-sm">
              <div className="flex justify-between px-3 py-2">
                <span className="text-slate-400">Started</span>
                <span className="font-medium">{formatDateTime(assignment.startedAt)}</span>
              </div>
              <div className="flex justify-between px-3 py-2">
                <span className="text-slate-400">Completed</span>
                <span className="font-medium">{formatDateTime(assignment.completedAt)}</span>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
