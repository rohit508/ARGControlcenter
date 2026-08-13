import { FormEvent, useEffect, useState } from "react";
import Modal from "../../components/ui/Modal";
import { ApiClientError } from "../../services/apiClient";
import { useUpdateAssignmentStatus } from "./useEmployeeTasks";
import CommentsThread from "./CommentsThread";
import { EmployeeTask, EmployeeTaskAssignment } from "../../types";
import { formatDateTime, formatDueDateTime } from "../../utils/formatDateTime";

// "Completed After Due Date" is never a user-selectable target — the server decides that
// automatically when a "Completed" submission arrives after the due date has passed (see
// updateAssignmentStatus in employee-tasks.service.ts). When an assignment is already in that
// state, the dropdown below is replaced with a read-only note instead of being offered here.
const USER_SELECTABLE_STATUSES = ["Pending", "In Progress", "Completed", "Not Done"];

interface Props {
  open: boolean;
  onClose: () => void;
  task: EmployeeTask | null;
  assignment: EmployeeTaskAssignment | null;
}

export default function StatusUpdateModal({ open, onClose, task, assignment }: Props) {
  const updateStatus = useUpdateAssignmentStatus();
  const [status, setStatus] = useState("Pending");
  const [notDoneReason, setNotDoneReason] = useState("");
  const [progressNotes, setProgressNotes] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !assignment) return;
    setStatus(assignment.status);
    setNotDoneReason(assignment.notDoneReason ?? "");
    setProgressNotes("");
    setError(null);
  }, [open, assignment]);

  if (!assignment || !task) return null;

  // Mirrors the backend's superRefine — disables Save rather than letting an invalid submission
  // round-trip to the server just to bounce back with the same message.
  const reasonMissing = status === "Not Done" && !notDoneReason.trim();

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (reasonMissing || !assignment) return;
    const assignmentId = assignment.id;
    setError(null);
    try {
      await updateStatus.mutateAsync({
        assignmentId,
        payload: {
          status,
          notDoneReason: status === "Not Done" ? notDoneReason.trim() : undefined,
          progressNotes: progressNotes.trim() || undefined,
        },
      });
      onClose();
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Could not update status");
    }
  }

  // Workflow shortcuts
  async function quickAction(newStatus: string) {
    if (!assignment) return;
    const assignmentId = assignment.id;
    setError(null);
    try {
      await updateStatus.mutateAsync({
        assignmentId,
        payload: {
          status: newStatus,
          progressNotes: progressNotes.trim() || undefined,
        },
      });
      onClose();
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Could not update status");
    }
  }

  const canMarkInProgress = status === "Pending";
  const canMarkCompleted = status === "In Progress";

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={task.title}
      widthClassName="max-w-2xl"
      footer={
        <>
          <button onClick={onClose} className="text-sm px-3 py-1.5 rounded-md border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800">
            Cancel
          </button>
          {canMarkInProgress && (
            <button
              type="button"
              onClick={() => quickAction("In Progress")}
              disabled={updateStatus.isPending}
              className="text-sm px-3 py-1.5 rounded-md bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50"
            >
              Mark as In Progress
            </button>
          )}
          {canMarkCompleted && (
            <button
              type="button"
              onClick={() => quickAction("Completed")}
              disabled={updateStatus.isPending}
              className="text-sm px-3 py-1.5 rounded-md bg-green-600 hover:bg-green-700 text-white disabled:opacity-50"
            >
              Mark as Completed
            </button>
          )}
          {assignment.status !== "Completed After Due Date" && (
            <button
              type="submit"
              form="status-form"
              disabled={updateStatus.isPending || reasonMissing}
              className="text-sm px-3 py-1.5 rounded-md bg-brand-600 hover:bg-brand-700 text-white disabled:opacity-50"
            >
              {updateStatus.isPending ? "Saving…" : "Save"}
            </button>
          )}
        </>
      }
    >
      <form id="status-form" onSubmit={submit} className="space-y-4">
        {error && <div className="text-sm text-danger-500 bg-danger-100 dark:bg-danger-950 rounded-md px-3 py-2">{error}</div>}
        
        <div>
          <h3 className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Task Details</h3>
          <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-3">
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">{task.taskCode}</p>
            {task.departmentName && <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Department: {task.departmentName}</p>}
            {task.description && <p className="text-sm text-slate-600 dark:text-slate-300">{task.description}</p>}
            {task.dueDate && <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">Due: {formatDueDateTime(task.dueDate, task.dueTime)}</p>}
          </div>
        </div>

        <div>
          <h3 className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Timeline</h3>
          <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-3 grid grid-cols-2 gap-2 text-xs text-slate-600 dark:text-slate-300">
            <div>
              <span className="text-slate-400 dark:text-slate-500">Start Time</span>
              <div className="font-medium">{formatDateTime(assignment.startedAt)}</div>
            </div>
            <div>
              <span className="text-slate-400 dark:text-slate-500">Completed Time</span>
              <div className="font-medium">{formatDateTime(assignment.completedAt)}</div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm mb-1 text-slate-600 dark:text-slate-300">Current Status</label>
            <div className="w-full rounded-md border border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 px-3 py-2 text-sm font-medium">
              {assignment.status}
            </div>
          </div>
          <div>
            <label className="block text-sm mb-1 text-slate-600 dark:text-slate-300">New Status</label>
            {assignment.status === "Completed After Due Date" ? (
              <div className="w-full rounded-md border border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 px-3 py-2 text-sm text-slate-500 dark:text-slate-400">
                Completed (late) — no further changes
              </div>
            ) : (
              <select
                className="w-full rounded-md border border-slate-300 dark:border-slate-700 bg-transparent px-3 py-2 text-sm"
                value={status}
                onChange={(e) => setStatus(e.target.value)}
              >
                {USER_SELECTABLE_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            )}
          </div>
        </div>

        {status === "Not Done" && (
          <div>
            <label className="block text-sm mb-1 text-slate-600 dark:text-slate-300">
              Reason / Comment <span className="text-danger-500">*</span>
            </label>
            <textarea
              className={`w-full rounded-md border bg-transparent px-3 py-2 text-sm ${reasonMissing ? "border-danger-500" : "border-slate-300 dark:border-slate-700"}`}
              rows={3}
              value={notDoneReason}
              onChange={(e) => setNotDoneReason(e.target.value)}
              placeholder="Required — explain why this task isn't done"
            />
            {reasonMissing && <div className="text-xs text-danger-500 mt-1">A reason is required to mark this task as Not Done.</div>}
          </div>
        )}

        <div>
          <label className="block text-sm mb-1 text-slate-600 dark:text-slate-300">Progress Notes (optional)</label>
          <textarea
            className="w-full rounded-md border border-slate-300 dark:border-slate-700 bg-transparent px-3 py-2 text-sm"
            rows={3}
            value={progressNotes}
            onChange={(e) => setProgressNotes(e.target.value)}
            placeholder="What did you get done? Any blockers or updates?"
          />
        </div>

        <div className="pt-2 border-t border-slate-200 dark:border-slate-800">
          <CommentsThread assignmentId={assignment.id} />
        </div>
      </form>
    </Modal>
  );
}
