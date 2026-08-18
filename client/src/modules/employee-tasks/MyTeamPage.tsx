import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import DataTable from "../../components/data-table/DataTable";
import { PriorityBadge, StatusBadge } from "../../components/ui/Badge";
import ProgressBar from "../../components/ui/ProgressBar";
import { usePermissions } from "../../hooks/usePermissions";
import { useAuthStore } from "../../store/authStore";
import { useMyTeam, useEmployeeTasks } from "./useEmployeeTasks";
import TaskFormModal from "./TaskFormModal";
import { formatDueDateTime } from "../../utils/formatDateTime";

// Department Head's own team view — deliberately separate from EmployeeTasksBoardPage (the
// Admin-only, company-wide Task Board): this page is always scoped to "my team" by the backend
// (see employee-tasks.service.ts's DepartmentHead branch of listTasks/getMyTeam), with no
// "all employees" escape hatch in the UI. Guarded here the same way AdminOnly.tsx guards
// admin-only screens, so a non-DepartmentHead can't reach it by typing the URL directly.
export default function MyTeamPage() {
  const isDepartmentHead = useAuthStore((s) => s.user?.roles.includes("DepartmentHead") ?? false);
  if (!isDepartmentHead) {
    return (
      <div className="text-sm text-slate-400 border border-dashed border-slate-300 dark:border-slate-700 rounded-lg py-12 text-center">
        You don't have access to this screen. Ask an administrator for access.
      </div>
    );
  }
  return <MyTeamContent />;
}

function MyTeamContent() {
  const navigate = useNavigate();
  const { can } = usePermissions();
  const { data: teamData, isLoading: teamLoading } = useMyTeam();
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<number | null>(null);
  const { data: taskData, isLoading: tasksLoading } = useEmployeeTasks(selectedEmployeeId ?? undefined);
  const [formOpen, setFormOpen] = useState(false);

  const canCreate = can("employee-tasks", "create");
  const members = teamData?.data.members ?? [];

  const rows = useMemo(() => taskData?.data ?? [], [taskData]);

  if (teamLoading) return <div className="text-slate-400">Loading…</div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <h1 className="text-xl font-semibold">My Teams</h1>
        {canCreate && (
          <button onClick={() => setFormOpen(true)} className="text-sm px-3 py-1.5 rounded-md bg-brand-600 hover:bg-brand-700 text-white">
            + New Ticket
          </button>
        )}
      </div>
      {teamData?.data.departmentName && <p className="text-sm text-slate-400 mb-4">{teamData.data.departmentName}</p>}

      {members.length === 0 ? (
        <div className="text-sm text-slate-400 border border-dashed border-slate-300 dark:border-slate-700 rounded-lg py-12 text-center">
          No team members found for your department.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-6">
          {members.map((m) => {
            const active = selectedEmployeeId === m.id;
            return (
              <button
                key={m.id}
                onClick={() => setSelectedEmployeeId(active ? null : m.id)}
                className={`text-left rounded-lg border p-3 transition-colors ${
                  active
                    ? "border-brand-500 bg-brand-50 dark:bg-brand-500/10"
                    : "border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800"
                }`}
              >
                <div className="font-medium text-sm">{m.fullName}</div>
                <div className="text-xs text-slate-400 mb-2">{m.roleTitle || "—"}</div>
                <div className="flex flex-wrap gap-1">
                  {Object.entries(m.statusCounts)
                    .filter(([, count]) => count > 0)
                    .map(([status, count]) => (
                      <span key={status} className="inline-flex items-center gap-1">
                        <StatusBadge status={status} />
                        <span className="text-xs text-slate-400">{count}</span>
                      </span>
                    ))}
                  {Object.values(m.statusCounts).every((c) => c === 0) && <span className="text-xs text-slate-400">No tickets</span>}
                </div>
              </button>
            );
          })}
        </div>
      )}

      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold text-slate-500 dark:text-slate-400">
          {selectedEmployeeId ? `Tickets — ${members.find((m) => m.id === selectedEmployeeId)?.fullName}` : "All Team Tickets"}
        </h2>
        {selectedEmployeeId && (
          <button onClick={() => setSelectedEmployeeId(null)} className="text-xs text-brand-600 hover:underline">
            Clear filter
          </button>
        )}
      </div>

      {tasksLoading ? (
        <div className="text-slate-400">Loading…</div>
      ) : (
        <DataTable
          keyField="id"
          rows={rows}
          emptyMessage="No tickets for your team yet."
          columns={[
            { key: "taskCode", header: "Code" },
            { key: "title", header: "Title" },
            { key: "description", header: "Description", render: (r) => <span className="text-xs text-slate-500 dark:text-slate-400">{r.description || "—"}</span> },
            { key: "priority", header: "Priority", render: (r) => <PriorityBadge priority={r.priority} /> },
            { key: "departmentName", header: "Department", render: (r) => r.departmentName || "—" },
            { key: "dueDate", header: "Due Date/Time", render: (r) => formatDueDateTime(r.dueDate, r.dueTime) },
            {
              key: "assignees",
              header: "Assigned To / Status",
              render: (r) => (
                <div className="flex flex-col gap-2">
                  {r.assignments.map((a) => (
                    <div key={a.id} className="rounded-md border border-slate-200 dark:border-slate-800 p-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-xs font-medium">{a.employeeName}</span>
                        <StatusBadge status={a.status} />
                      </div>
                      <div className="mt-1 space-y-1 text-[11px] text-slate-500 dark:text-slate-400">
                        <div>Started: {a.startedAt ? new Date(a.startedAt).toLocaleString() : "—"}</div>
                        <div>Completed: {a.completedAt ? new Date(a.completedAt).toLocaleString() : "—"}</div>
                      </div>
                      <button
                        onClick={() => navigate(`/my-tasks/${a.id}`)}
                        className="mt-2 text-[11px] text-teal-600 hover:underline"
                      >
                        View Ticket
                      </button>
                    </div>
                  ))}
                </div>
              ),
            },
            { key: "completionPct", header: "Completion", render: (r) => <ProgressBar pct={r.completionPct} /> },
          ]}
        />
      )}

      <TaskFormModal open={formOpen} onClose={() => setFormOpen(false)} task={null} />
    </div>
  );
}
