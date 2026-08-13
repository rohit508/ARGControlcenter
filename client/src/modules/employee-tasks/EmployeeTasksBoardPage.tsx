import { useMemo, useState } from "react";
import DataTable from "../../components/data-table/DataTable";
import { PriorityBadge, StatusBadge } from "../../components/ui/Badge";
import ProgressBar from "../../components/ui/ProgressBar";
import ConfirmDialog from "../../components/ui/ConfirmDialog";
import { usePermissions } from "../../hooks/usePermissions";
import { ApiClientError } from "../../services/apiClient";
import { useEmployeeTasks, useDeleteEmployeeTask } from "./useEmployeeTasks";
import { useEmployees, useDepartments } from "../employees/useEmployees";
import TaskFormModal from "./TaskFormModal";
import { EmployeeTask } from "../../types";
import { formatDateTime, formatDueDateTime } from "../../utils/formatDateTime";

type SortKey = "dueDate" | "priority" | "completionPct" | "title";

const PRIORITY_ORDER: Record<string, number> = { Critical: 0, High: 1, Medium: 2, Low: 3 };

export default function EmployeeTasksBoardPage() {
  const { can } = usePermissions();
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>("");
  const [selectedDepartmentId, setSelectedDepartmentId] = useState<string>("");
  const { data: employeeData } = useEmployees();
  const { data: departmentData } = useDepartments();
  const { data, isLoading } = useEmployeeTasks(
    selectedEmployeeId ? Number(selectedEmployeeId) : undefined,
    selectedDepartmentId ? Number(selectedDepartmentId) : undefined
  );
  const deleteTask = useDeleteEmployeeTask();

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("dueDate");
  const [formOpen, setFormOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<EmployeeTask | null>(null);
  const [deletingTask, setDeletingTask] = useState<EmployeeTask | null>(null);
  const [error, setError] = useState<string | null>(null);

  const canCreate = can("employee-tasks", "create");
  const canUpdate = can("employee-tasks", "update");
  const canDelete = can("employee-tasks", "delete");

  const rows = useMemo(() => {
    let list = data?.data ?? [];
    if (search.trim()) {
      const term = search.trim().toLowerCase();
      list = list.filter((t) => t.title.toLowerCase().includes(term) || t.taskCode.toLowerCase().includes(term));
    }
    if (statusFilter) {
      list = list.filter((t) => t.assignments.some((a) => a.status === statusFilter));
    }
    return [...list].sort((a, b) => {
      if (sortKey === "dueDate") return (a.dueDate || "9999").localeCompare(b.dueDate || "9999");
      if (sortKey === "priority") return PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority];
      if (sortKey === "completionPct") return b.completionPct - a.completionPct;
      return a.title.localeCompare(b.title);
    });
  }, [data, search, statusFilter, sortKey]);

  function openCreate() {
    setEditingTask(null);
    setFormOpen(true);
  }

  function openEdit(task: EmployeeTask) {
    setEditingTask(task);
    setFormOpen(true);
  }

  async function confirmDelete() {
    if (!deletingTask) return;
    setError(null);
    try {
      await deleteTask.mutateAsync(deletingTask.id);
      setDeletingTask(null);
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Could not delete task");
    }
  }

  if (isLoading) return <div className="text-slate-400">Loading…</div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-semibold">Employee Tasks</h1>
        {canCreate && (
          <button onClick={openCreate} className="text-sm px-3 py-1.5 rounded-md bg-brand-600 hover:bg-brand-700 text-white">
            + New Task
          </button>
        )}
      </div>

      {error && <div className="mb-4 text-sm text-danger-500 bg-danger-100 rounded-md px-3 py-2">{error}</div>}

      <div className="flex flex-wrap gap-3 mb-4">
        <input
          className="rounded-md border border-slate-300 dark:border-slate-700 bg-transparent px-3 py-1.5 text-sm"
          placeholder="Search title or code…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select
          className="rounded-md border border-slate-300 dark:border-slate-700 bg-transparent px-3 py-1.5 text-sm"
          value={selectedEmployeeId}
          onChange={(e) => setSelectedEmployeeId(e.target.value)}
        >
          <option value="">All employees</option>
          {employeeData?.data.map((employee) => (
            <option key={employee.id} value={employee.id}>
              {employee.fullName}
            </option>
          ))}
        </select>
        <select
          className="rounded-md border border-slate-300 dark:border-slate-700 bg-transparent px-3 py-1.5 text-sm"
          value={selectedDepartmentId}
          onChange={(e) => setSelectedDepartmentId(e.target.value)}
        >
          <option value="">All departments</option>
          {departmentData?.data.map((dept) => (
            <option key={dept.id} value={dept.id}>
              {dept.name}
            </option>
          ))}
        </select>
        <select
          className="rounded-md border border-slate-300 dark:border-slate-700 bg-transparent px-3 py-1.5 text-sm"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="">All statuses</option>
          <option value="Pending">Pending</option>
          <option value="In Progress">In Progress</option>
          <option value="Completed">Completed</option>
          <option value="Not Done">Not Done</option>
          <option value="Completed After Due Date">Completed After Due Date</option>
        </select>
        <select
          className="rounded-md border border-slate-300 dark:border-slate-700 bg-transparent px-3 py-1.5 text-sm"
          value={sortKey}
          onChange={(e) => setSortKey(e.target.value as SortKey)}
        >
          <option value="dueDate">Sort: Due Date</option>
          <option value="priority">Sort: Priority</option>
          <option value="completionPct">Sort: Completion</option>
          <option value="title">Sort: Title</option>
        </select>
      </div>

      <DataTable
        keyField="id"
        rows={rows}
        emptyMessage="No employee tasks yet."
        columns={[
          { key: "taskCode", header: "Code" },
          { key: "title", header: "Title" },
          { key: "priority", header: "Priority", render: (r) => <PriorityBadge priority={r.priority} /> },
          { key: "departmentName", header: "Department", render: (r) => r.departmentName || "—" },
          { key: "dueDate", header: "Due Date", render: (r) => formatDueDateTime(r.dueDate, r.dueTime) },
          {
            key: "assignees",
            header: "Assignees",
            render: (r) => (
              <div className="flex flex-col gap-2">
                {r.assignments.map((a) => (
                  <div key={a.id} className="rounded-md border border-slate-200 dark:border-slate-800 p-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xs font-medium">{a.employeeName}</span>
                      <StatusBadge status={a.status} />
                    </div>
                    <div className="mt-1 space-y-1 text-[11px] text-slate-500 dark:text-slate-400">
                      <div>Start Time: {formatDateTime(a.startedAt)}</div>
                      <div>Due Date: {formatDueDateTime(r.dueDate, r.dueTime)}</div>
                      <div>Completed Time: {formatDateTime(a.completedAt)}</div>
                      <div>Total: {a.durationMs !== null ? `${Math.floor(a.durationMs / 3600000)}h ${Math.round((a.durationMs % 3600000) / 60000)}m` : "—"}</div>
                    </div>
                  </div>
                ))}
              </div>
            ),
          },
          { key: "completionPct", header: "Completion", render: (r) => <ProgressBar pct={r.completionPct} /> },
          {
            key: "actions",
            header: "",
            render: (r) => (
              <div className="flex gap-2">
                {canUpdate && (
                  <button onClick={() => openEdit(r)} className="text-xs px-2 py-1 rounded-md border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800">
                    Edit
                  </button>
                )}
                {canDelete && (
                  <button onClick={() => setDeletingTask(r)} className="text-xs px-2 py-1 rounded-md border border-danger-500 text-danger-500 hover:bg-danger-100">
                    Delete
                  </button>
                )}
              </div>
            ),
          },
        ]}
      />

      <TaskFormModal open={formOpen} onClose={() => setFormOpen(false)} task={editingTask} />

      <ConfirmDialog
        open={!!deletingTask}
        title="Delete Task"
        message={`Delete "${deletingTask?.title}"? This cannot be undone.`}
        confirmLabel="Delete"
        busy={deleteTask.isPending}
        onConfirm={confirmDelete}
        onCancel={() => setDeletingTask(null)}
      />
    </div>
  );
}
