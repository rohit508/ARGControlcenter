import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { StatusBadge } from "../../components/ui/Badge";
import { useDepartmentTeams } from "./useEmployeeTasks";
import { useEmployees } from "../employees/useEmployees";
import { usePermissions } from "../../hooks/usePermissions";
import EmployeeFormModal from "../employees/EmployeeFormModal";
import { Employee } from "../../types";

function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase();
}

// Admin/CEO-only, company-wide counterpart to MyTeamPage (which is scoped to a single
// DepartmentHead's own department) — every department listed together, each with its head's name
// and team roster, so Admin/CEO doesn't need to hop between departments one at a time.
export default function DepartmentTeamsPage() {
  const navigate = useNavigate();
  const { can } = usePermissions();
  const { data, isLoading } = useDepartmentTeams();
  // Department Teams' own endpoint only returns id/name/roleTitle/statusCounts per member — not
  // enough to drive EmployeeFormModal (department + role editing). Reusing the full employees
  // list here (already fetched everywhere else in the app, so this hits react-query's cache
  // rather than issuing a fresh request) avoids adding a second, wider payload to the
  // department-teams endpoint just for this page's edit action.
  const { data: employeesData } = useEmployees();
  const employeesById = new Map((employeesData?.data ?? []).map((e) => [e.id, e]));
  const departmentTeams = data?.data ?? [];

  const [managingEmployee, setManagingEmployee] = useState<Employee | null>(null);
  const canManage = can("employees", "update");

  if (isLoading) return <div className="text-slate-400">Loading…</div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-xl font-semibold">Department Teams</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">Every department's head and team, in one place.</p>
        </div>
        <button
          onClick={() => navigate("/employee-tasks")}
          className="text-sm px-3 py-1.5 rounded-md border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800"
        >
          Back to Task Board
        </button>
      </div>

      {departmentTeams.length === 0 ? (
        <div className="text-sm text-slate-400 border border-dashed border-slate-300 dark:border-slate-700 rounded-lg py-12 text-center">
          No departments found.
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {departmentTeams.map((dept) => (
            <div key={dept.departmentId} className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
              {/* Department + Head banner — the visually dominant part of the card, so who leads
                  this department is obvious at a glance rather than a small line of gray text. */}
              <div className="bg-brand-600 text-white px-4 py-3">
                <div className="flex items-center justify-between mb-1.5">
                  <div className="text-[11px] uppercase tracking-wide text-brand-100/80 font-semibold">{dept.departmentName}</div>
                  {canManage && dept.headName && (
                    <button
                      onClick={() => {
                        const head = dept.members.find((m) => m.fullName === dept.headName);
                        setManagingEmployee((head && employeesById.get(head.id)) ?? null);
                      }}
                      title="Change this department's head or their role"
                      className="text-[11px] px-2 py-1 rounded-md border border-white/30 hover:bg-white/10"
                    >
                      Manage Head
                    </button>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 shrink-0 rounded-full bg-white/15 border border-white/30 flex items-center justify-center font-semibold text-sm">
                    {dept.headName ? initials(dept.headName) : "—"}
                  </div>
                  <div className="min-w-0">
                    <div className="text-[11px] uppercase tracking-wide text-brand-100/80 font-semibold leading-none mb-1">Department Head</div>
                    <div className="font-semibold text-sm truncate">{dept.headName ?? "Not assigned"}</div>
                    {!dept.headName && canManage && dept.members.length > 0 && (
                      <div className="text-[11px] text-brand-100/70 mt-0.5">Use "Manage" on a team member below to grant them the Department Head role.</div>
                    )}
                  </div>
                </div>
              </div>

              <div className="p-4">
                <div className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-2">Team ({dept.members.length})</div>

                {dept.members.length === 0 ? (
                  <div className="text-sm text-slate-400 border border-dashed border-slate-300 dark:border-slate-700 rounded-lg py-6 text-center">
                    No team members in this department.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {dept.members.map((m) => (
                      <div key={m.id} className="rounded-lg border border-slate-200 dark:border-slate-800 p-2.5 flex items-start gap-2.5">
                        <div className="w-8 h-8 shrink-0 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-300 flex items-center justify-center font-semibold text-xs">
                          {initials(m.fullName)}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-2">
                            <div className="font-medium text-sm truncate">{m.fullName}</div>
                            {canManage && (
                              <button
                                onClick={() => setManagingEmployee(employeesById.get(m.id) ?? null)}
                                className="shrink-0 text-[11px] px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                              >
                                Manage
                              </button>
                            )}
                          </div>
                          <div className="text-xs text-slate-400 mb-1.5 truncate">{m.roleTitle || "—"}</div>
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
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Reuses the same modal Employees page uses to edit department + roles — editing a
          member's department here moves them between teams, and checking "DepartmentHead" in its
          role list is how a head gets assigned (or changed) for this page's purposes. */}
      <EmployeeFormModal open={!!managingEmployee} onClose={() => setManagingEmployee(null)} employee={managingEmployee} />
    </div>
  );
}
