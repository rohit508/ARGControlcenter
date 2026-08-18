import { FormEvent, useEffect, useState } from "react";
import Modal from "../../components/ui/Modal";
import MicButton from "../../components/ui/MicButton";
import { ApiClientError } from "../../services/apiClient";
import { uploadFile } from "../../services/uploadClient";
import { useEmployees, useDepartments } from "../employees/useEmployees";
import { useCreateEmployeeTask, useUpdateEmployeeTask, useMyTeam } from "./useEmployeeTasks";
import { useSpeechToText } from "../../hooks/useSpeechToText";
import { useAuthStore } from "../../store/authStore";
import { EmployeeTask } from "../../types";

const PRIORITIES = ["Critical", "High", "Medium", "Low"];

interface Props {
  open: boolean;
  onClose: () => void;
  task: EmployeeTask | null; // null = create mode
}

export default function TaskFormModal({ open, onClose, task }: Props) {
  const user = useAuthStore((s) => s.user);
  const isDepartmentHead = user?.roles.includes("DepartmentHead") ?? false;
  // A DepartmentHead may only assign within their own team — the server also enforces this (see
  // assertAssigneesWithinDepartment in employee-tasks.service.ts), this just keeps the picker
  // from offering choices that would be rejected. Everyone else keeps seeing the full roster,
  // unchanged from before.
  const { data: employeesDataAll } = useEmployees(undefined, { enabled: !isDepartmentHead });
  const { data: myTeamData } = useMyTeam();
  const employeesData = isDepartmentHead
    ? { data: (myTeamData?.data.members ?? []).map((m) => ({ id: m.id, fullName: m.fullName, roleTitle: m.roleTitle })) }
    : employeesDataAll;
  const { data: deptData } = useDepartments();
  const createTask = useCreateEmployeeTask();
  const updateTask = useUpdateEmployeeTask();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState("Medium");
  const [dueDate, setDueDate] = useState("");
  const [dueTime, setDueTime] = useState("");
  const [departmentId, setDepartmentId] = useState<string>("");
  const [assigneeIds, setAssigneeIds] = useState<number[]>([]);
  const [assigneeSearch, setAssigneeSearch] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Each field gets its own recognizer instance so dictating into Title doesn't also feed
  // Description — appends rather than replaces, so re-clicking the mic continues rather than
  // wipes out whatever's already there (from typing or an earlier dictation pass).
  const titleSpeech = useSpeechToText((transcript) => {
    setTitle((prev) => (prev.trim() ? `${prev.trim()} ${transcript}` : transcript));
  });
  const descriptionSpeech = useSpeechToText((transcript) => {
    setDescription((prev) => (prev.trim() ? `${prev.trim()} ${transcript}` : transcript));
  });

  useEffect(() => {
    if (!open) {
      titleSpeech.stop();
      descriptionSpeech.stop();
      return;
    }
    setTitle(task?.title ?? "");
    setDescription(task?.description ?? "");
    setPriority(task?.priority ?? "Medium");
    setDueDate(task?.dueDate ?? "");
    // Pre-fill with the current time as a starting point (still editable) — only for new
    // tasks; editing an existing task keeps showing whatever was actually saved, including empty.
    if (task) {
      setDueTime(task.dueTime ?? "");
    } else {
      const now = new Date();
      setDueTime(`${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`);
    }
    // DepartmentHead always raises tickets under their own department — locked, not just
    // defaulted, since assignees are already restricted to that department (see
    // assertAssigneesWithinDepartment server-side); letting the field diverge would be confusing.
    // Editing an existing task keeps showing whatever was actually saved.
    if (!task && isDepartmentHead && myTeamData?.data.departmentId) {
      setDepartmentId(String(myTeamData.data.departmentId));
    } else {
      setDepartmentId(task?.departmentId ? String(task.departmentId) : "");
    }
    setAssigneeIds(task?.assignments.map((a) => a.employeeId) ?? []);
    setAssigneeSearch("");
    setFiles([]);
    setError(null);
  }, [open, task, isDepartmentHead, myTeamData]);

  function toggleAssignee(id: number) {
    setAssigneeIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  const filteredEmployees = (employeesData?.data ?? []).filter((emp) => {
    const q = assigneeSearch.trim().toLowerCase();
    if (!q) return true;
    return emp.fullName.toLowerCase().includes(q) || (emp.roleTitle ?? "").toLowerCase().includes(q);
  });

  const PRIORITY_DOT: Record<string, string> = {
    Critical: "bg-danger-500",
    High: "bg-warning-500",
    Medium: "bg-brand-500",
    Low: "bg-slate-400",
  };

  const busy = createTask.isPending || updateTask.isPending;

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (assigneeIds.length === 0) {
      setError("Assign at least one employee");
      return;
    }
    try {
      const payload = {
        title,
        description: description || undefined,
        priority,
        dueDate: dueDate || undefined,
        dueTime: dueTime || undefined,
        departmentId: departmentId ? Number(departmentId) : undefined,
        assigneeIds,
      };
      const result = task ? await updateTask.mutateAsync({ id: task.id, payload }) : await createTask.mutateAsync(payload);
      const taskId = result.data.id;
      for (const file of files) {
        await uploadFile(`/attachments?entityType=employee-task&entityId=${taskId}`, file);
      }
      onClose();
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Something went wrong");
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={task ? "Edit Task" : "Create Task"}
      widthClassName="max-w-xl"
      footer={
        <>
          <button onClick={onClose} className="text-sm px-3 py-1.5 rounded-md border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800">
            Cancel
          </button>
          <button
            type="submit"
            form="task-form"
            disabled={busy}
            className="text-sm px-3 py-1.5 rounded-md bg-brand-600 hover:bg-brand-700 text-white disabled:opacity-50"
          >
            {busy ? "Saving…" : task ? "Save Changes" : "Create Task"}
          </button>
        </>
      }
    >
      <form id="task-form" onSubmit={submit} className="space-y-5">
        {error && (
          <div className="text-sm text-danger-500 bg-danger-100 rounded-md px-3 py-2 flex items-center gap-2">
            <span aria-hidden>⚠</span>
            {error}
          </div>
        )}

        {/* ---- Task details ---- */}
        <div className="space-y-4">
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">
                Title <span className="text-danger-500">*</span>
              </label>
              <MicButton listening={titleSpeech.isListening} supported={titleSpeech.isSupported} onClick={() => (titleSpeech.isListening ? titleSpeech.stop() : titleSpeech.start())} label="Title" />
            </div>
            <input
              className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-500"
              placeholder="e.g. Prepare Q3 status report"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
            {titleSpeech.isListening && <p className="text-xs text-brand-600 dark:text-brand-400 mt-1">🎤 Listening…</p>}
            {titleSpeech.error && <p className="text-xs text-danger-500 mt-1">{titleSpeech.error}</p>}
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">Description</label>
              <MicButton
                listening={descriptionSpeech.isListening}
                supported={descriptionSpeech.isSupported}
                onClick={() => (descriptionSpeech.isListening ? descriptionSpeech.stop() : descriptionSpeech.start())}
                label="Description"
              />
            </div>
            <textarea
              className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-500 resize-y"
              rows={3}
              placeholder="Add context or instructions for the assignee(s)…"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
            {descriptionSpeech.isListening && <p className="text-xs text-brand-600 dark:text-brand-400 mt-1">🎤 Listening…</p>}
            {descriptionSpeech.error && <p className="text-xs text-danger-500 mt-1">{descriptionSpeech.error}</p>}
          </div>
        </div>

        {/* ---- Scheduling ---- */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1 text-slate-700 dark:text-slate-200">Priority</label>
            <div className="relative">
              <span className={`absolute left-3 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full ${PRIORITY_DOT[priority]}`} aria-hidden />
              <select
                className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 pl-7 pr-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-500 appearance-none"
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
              >
                {PRIORITIES.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1 text-slate-700 dark:text-slate-200">Department</label>
            {isDepartmentHead ? (
              // Locked to the DepartmentHead's own department — matches the assignee picker,
              // which is already restricted to that same department's team members.
              <div className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 px-3 py-2 text-sm text-slate-500 dark:text-slate-400">
                {myTeamData?.data.departmentName ?? "—"}
              </div>
            ) : (
              <select
                className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-500"
                value={departmentId}
                onChange={(e) => setDepartmentId(e.target.value)}
              >
                <option value="">—</option>
                {deptData?.data.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium mb-1 text-slate-700 dark:text-slate-200">Due Date</label>
            <input
              type="date"
              className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-500"
              value={dueDate}
              onChange={(e) => {
                setDueDate(e.target.value);
                if (!e.target.value) setDueTime("");
              }}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1 text-slate-700 dark:text-slate-200">Due Time (optional)</label>
            <input
              type="time"
              className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-500 disabled:opacity-50"
              value={dueTime}
              onChange={(e) => setDueTime(e.target.value)}
              disabled={!dueDate}
              title={!dueDate ? "Set a due date first" : undefined}
            />
          </div>
        </div>

        {/* ---- Assignees ---- */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">
              Assign To <span className="text-danger-500">*</span>
            </label>
            <span className="text-xs text-slate-400">
              {assigneeIds.length} selected
            </span>
          </div>

          {assigneeIds.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-2">
              {employeesData?.data
                .filter((emp) => assigneeIds.includes(emp.id))
                .map((emp) => (
                  <span
                    key={emp.id}
                    className="inline-flex items-center gap-1 text-xs bg-brand-100 text-brand-700 dark:bg-brand-500/20 dark:text-brand-100 rounded-full pl-2.5 pr-1 py-1"
                  >
                    {emp.fullName}
                    <button
                      type="button"
                      onClick={() => toggleAssignee(emp.id)}
                      aria-label={`Remove ${emp.fullName}`}
                      className="w-4 h-4 flex items-center justify-center rounded-full hover:bg-brand-200 dark:hover:bg-brand-500/40 leading-none"
                    >
                      ✕
                    </button>
                  </span>
                ))}
            </div>
          )}

          <input
            type="text"
            placeholder="Search by name or designation…"
            value={assigneeSearch}
            onChange={(e) => setAssigneeSearch(e.target.value)}
            className="w-full rounded-t-lg border border-b-0 border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-500"
          />
          <div className="max-h-44 overflow-y-auto border border-slate-300 dark:border-slate-700 rounded-b-lg divide-y divide-slate-100 dark:divide-slate-800">
            {filteredEmployees.length === 0 && (
              <div className="text-sm text-slate-400 px-3 py-3 text-center">No employees match "{assigneeSearch}"</div>
            )}
            {filteredEmployees.map((emp) => {
              const checked = assigneeIds.includes(emp.id);
              return (
                <label
                  key={emp.id}
                  className={`flex items-center gap-2.5 text-sm px-3 py-2 cursor-pointer transition-colors ${
                    checked ? "bg-brand-50 dark:bg-brand-500/10" : "hover:bg-slate-50 dark:hover:bg-slate-800"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggleAssignee(emp.id)}
                    className="w-4 h-4 rounded border-slate-300 dark:border-slate-600 text-brand-600 focus:ring-brand-500/40"
                  />
                  <span className="flex-1 min-w-0">
                    <span className="text-slate-700 dark:text-slate-200">{emp.fullName}</span>{" "}
                    <span className="text-slate-400 text-xs">({emp.roleTitle || "—"})</span>
                  </span>
                </label>
              );
            })}
          </div>
        </div>

        {/* ---- Attachments ---- */}
        <div>
          <label className="block text-sm font-medium mb-1 text-slate-700 dark:text-slate-200">Attachments (optional)</label>
          <label className="flex items-center justify-center gap-2 w-full rounded-lg border border-dashed border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 px-3 py-4 text-sm text-slate-500 dark:text-slate-400 cursor-pointer hover:border-brand-400 hover:text-brand-600 dark:hover:text-brand-300 transition-colors">
            <span aria-hidden>📎</span>
            <span>{files.length > 0 ? `${files.length} file${files.length === 1 ? "" : "s"} selected` : "Click to choose files, or drag and drop"}</span>
            <input
              type="file"
              multiple
              className="hidden"
              onChange={(e) => setFiles(e.target.files ? Array.from(e.target.files) : [])}
            />
          </label>
          {files.length > 0 && (
            <ul className="mt-2 space-y-1">
              {files.map((f, i) => (
                <li key={i} className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/60 rounded-md px-2.5 py-1.5">
                  <span className="truncate">{f.name}</span>
                  <button
                    type="button"
                    onClick={() => setFiles((prev) => prev.filter((_, idx) => idx !== i))}
                    aria-label={`Remove ${f.name}`}
                    className="text-slate-400 hover:text-danger-500 ml-2"
                  >
                    ✕
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </form>
    </Modal>
  );
}
