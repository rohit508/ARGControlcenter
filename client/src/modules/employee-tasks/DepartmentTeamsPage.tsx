import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { StatusBadge } from "../../components/ui/Badge";
import SearchableSelect from "../../components/ui/SearchableSelect";
import { useDepartmentTeams } from "./useEmployeeTasks";
import { useEmployees, useUpdateEmployee, useUpdateEmployeeRoles, useCreateLoginForEmployee, useRoles, useCreateDepartment } from "../employees/useEmployees";
import { ApiClientError } from "../../services/apiClient";
import { usePermissions } from "../../hooks/usePermissions";
import EmployeeFormModal from "../employees/EmployeeFormModal";
import { Employee } from "../../types";

function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase();
}

// Inline picker on each department card — moves an existing employee (from any other department,
// or unassigned) into this one by setting their departmentId. Kept local to this file since it's
// a thin wrapper around useUpdateEmployee with no reuse elsewhere.
function AddMemberControl({ departmentId, candidates }: { departmentId: number; candidates: Employee[] }) {
  const updateEmployee = useUpdateEmployee();
  const [selectedId, setSelectedId] = useState<string>("");
  const [error, setError] = useState<string | null>(null);

  async function addMember() {
    if (!selectedId) return;
    setError(null);
    try {
      await updateEmployee.mutateAsync({ id: Number(selectedId), payload: { departmentId } });
      setSelectedId("");
    } catch {
      setError("Couldn't add that member. Try again.");
    }
  }

  if (candidates.length === 0) return null;

  return (
    <div className="mt-2">
      <div className="flex gap-2">
        <SearchableSelect
          value={selectedId}
          onChange={setSelectedId}
          placeholder="Add existing employee…"
          className="w-full rounded-md border border-slate-300 dark:border-slate-700 bg-transparent px-2 py-1.5 text-xs"
          options={candidates.map((c) => ({ value: String(c.id), label: c.departmentName ? `${c.fullName} (${c.departmentName})` : c.fullName }))}
        />
        <button
          onClick={addMember}
          disabled={!selectedId || updateEmployee.isPending}
          className="shrink-0 text-xs px-2.5 py-1.5 rounded-md bg-brand-600 hover:bg-brand-700 text-white disabled:opacity-50"
        >
          {updateEmployee.isPending ? "Adding…" : "Add"}
        </button>
      </div>
      {error && <div className="text-xs text-danger-500 mt-1">{error}</div>}
    </div>
  );
}

// Inline picker for a department's head — lets Admin/CEO set or swap the head directly from the
// card instead of opening "Manage" and hunting for the DepartmentHead checkbox. Candidates are
// this department's own members (a head should belong to the team they lead). Setting a new head
// grants them DepartmentHead (creating a login first if they don't have one, same auto-login flow
// as EmployeeFormModal) and strips the role from whoever held it before, since a department has
// one head at a time.
function HeadPicker({
  members,
  currentHeadId,
  departmentHeadRoleId,
}: {
  members: Employee[];
  currentHeadId: number | null;
  departmentHeadRoleId: number | null;
}) {
  const updateRoles = useUpdateEmployeeRoles();
  const createLogin = useCreateLoginForEmployee();
  const [selectedId, setSelectedId] = useState<string>("");
  const [error, setError] = useState<string | null>(null);

  const candidates = members.filter((m) => m.id !== currentHeadId);
  const busy = updateRoles.isPending || createLogin.isPending;

  async function setHead() {
    if (!selectedId || !departmentHeadRoleId) return;
    setError(null);
    const nextHead = members.find((m) => m.id === Number(selectedId));
    if (!nextHead) return;
    try {
      if (nextHead.hasLogin) {
        const nextRoleIds = Array.from(new Set([...nextHead.roles.map((r) => r.id), departmentHeadRoleId]));
        await updateRoles.mutateAsync({ id: nextHead.id, roleIds: nextRoleIds });
      } else {
        if (!nextHead.email) throw new Error("no-email");
        await createLogin.mutateAsync({
          id: nextHead.id,
          loginEmail: nextHead.email,
          loginPassword: crypto.randomUUID().replace(/-/g, "").slice(0, 16),
          roleIds: [departmentHeadRoleId],
        });
      }
      const previousHead = currentHeadId ? members.find((m) => m.id === currentHeadId) : null;
      if (previousHead?.hasLogin) {
        const remainingRoleIds = previousHead.roles.map((r) => r.id).filter((id) => id !== departmentHeadRoleId);
        await updateRoles.mutateAsync({ id: previousHead.id, roleIds: remainingRoleIds });
      }
      setSelectedId("");
    } catch (err) {
      setError(err instanceof Error && err.message === "no-email" ? "This person has no email on file, so a login can't be created for them." : "Couldn't change the head. Try again.");
    }
  }

  if (candidates.length === 0 || !departmentHeadRoleId) return null;

  return (
    <div className="mb-1.5">
      <div className="flex gap-2">
        <SearchableSelect
          value={selectedId}
          onChange={setSelectedId}
          placeholder={currentHeadId ? "Change head…" : "Set head…"}
          className="w-full rounded-md border border-white/30 bg-white/10 text-white placeholder-white/70 px-2 py-1 text-[11px]"
          optionClassName="block w-full text-left px-2 py-1.5 text-xs text-slate-900 hover:bg-slate-100"
          options={candidates.map((c) => ({ value: String(c.id), label: c.fullName }))}
        />
        <button
          onClick={setHead}
          disabled={!selectedId || busy}
          className="shrink-0 text-[11px] px-2 py-1 rounded-md border border-white/30 hover:bg-white/10 disabled:opacity-50"
        >
          {busy ? "Saving…" : "Set"}
        </button>
      </div>
      {error && <div className="text-[11px] text-red-200 mt-1">{error}</div>}
    </div>
  );
}

// Header control for creating a brand-new department — separate from AddMemberControl/HeadPicker
// since it has no per-department scope of its own (it's what creates the department those two
// then act on). Kept inline like the other two controls in this file rather than a shared
// component, since nothing else in the app creates departments.
function AddDepartmentControl() {
  const createDepartment = useCreateDepartment();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    const trimmed = name.trim();
    if (!trimmed) return;
    setError(null);
    try {
      await createDepartment.mutateAsync(trimmed);
      setName("");
      setOpen(false);
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Couldn't create that department. Try again.");
    }
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="text-sm px-3 py-1.5 rounded-md border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800"
      >
        + Add Department
      </button>
    );
  }

  return (
    <div className="flex items-start gap-2">
      <div>
        <input
          autoFocus
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") submit();
            if (e.key === "Escape") {
              setOpen(false);
              setName("");
              setError(null);
            }
          }}
          placeholder="Department name…"
          className="rounded-md border border-slate-300 dark:border-slate-700 bg-transparent px-3 py-1.5 text-sm"
        />
        {error && <div className="text-xs text-danger-500 mt-1">{error}</div>}
      </div>
      <button
        onClick={submit}
        disabled={!name.trim() || createDepartment.isPending}
        className="text-sm px-3 py-1.5 rounded-md bg-brand-600 hover:bg-brand-700 text-white disabled:opacity-50"
      >
        {createDepartment.isPending ? "Adding…" : "Add"}
      </button>
      <button
        onClick={() => {
          setOpen(false);
          setName("");
          setError(null);
        }}
        className="text-sm px-3 py-1.5 rounded-md border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800"
      >
        Cancel
      </button>
    </div>
  );
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

  const { data: rolesData } = useRoles();
  const departmentHeadRoleId = rolesData?.data.roles.find((r) => r.name === "DepartmentHead")?.id ?? null;

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
        <div className="flex items-start gap-2">
          {canManage && <AddDepartmentControl />}
          <button
            onClick={() => navigate("/employee-tasks")}
            className="text-sm px-3 py-1.5 rounded-md border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            Back to Task Board
          </button>
        </div>
      </div>

      {departmentTeams.length === 0 ? (
        <div className="text-sm text-slate-400 border border-dashed border-slate-300 dark:border-slate-700 rounded-lg py-12 text-center">
          No departments found.
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {departmentTeams.map((dept) => (
            <div key={dept.departmentId} className="border border-slate-200 dark:border-slate-800 rounded-xl">
              {/* Department + Head banner — the visually dominant part of the card, so who leads
                  this department is obvious at a glance rather than a small line of gray text.
                  Rounded on top only (not the card's own overflow-hidden) so the AddMemberControl
                  dropdown lower in this card isn't clipped when it opens. */}
              <div className="bg-brand-600 text-white px-4 py-3 rounded-t-xl">
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
                  <div className="min-w-0 flex-1">
                    <div className="text-[11px] uppercase tracking-wide text-brand-100/80 font-semibold leading-none mb-1">Department Head</div>
                    <div className="font-semibold text-sm truncate">{dept.headName ?? "Not assigned"}</div>
                  </div>
                </div>
                {canManage && (
                  <div className="mt-2">
                    <HeadPicker
                      members={dept.members.map((m) => employeesById.get(m.id)).filter((e): e is Employee => !!e)}
                      currentHeadId={dept.members.find((m) => m.fullName === dept.headName)?.id ?? null}
                      departmentHeadRoleId={departmentHeadRoleId}
                    />
                  </div>
                )}
              </div>

              <div className="p-4 rounded-b-xl">
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

                {canManage && (
                  <AddMemberControl
                    departmentId={dept.departmentId}
                    candidates={(employeesData?.data ?? []).filter((e) => e.departmentId !== dept.departmentId)}
                  />
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
