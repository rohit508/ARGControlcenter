import { FormEvent, useEffect, useState } from "react";
import Modal from "../../components/ui/Modal";
import { ApiClientError } from "../../services/apiClient";
import { useCreateEmployee, useUpdateEmployee, useCreateLoginForEmployee, useUpdateEmployeeRoles, useDepartments, useRoles } from "./useEmployees";
import { Employee } from "../../types";

interface Props {
  open: boolean;
  onClose: () => void;
  employee: Employee | null; // null = create mode
}

export default function EmployeeFormModal({ open, onClose, employee }: Props) {
  const { data: deptData } = useDepartments();
  const { data: rolesData } = useRoles();
  const createEmployee = useCreateEmployee();
  const updateEmployee = useUpdateEmployee();
  const createLogin = useCreateLoginForEmployee();
  const updateRoles = useUpdateEmployeeRoles();

  const [fullName, setFullName] = useState("");
  const [roleTitle, setRoleTitle] = useState("");
  const [departmentId, setDepartmentId] = useState<string>("");
  const [email, setEmail] = useState("");
  const [location, setLocation] = useState("");
  const [skill, setSkill] = useState("");
  const [status, setStatus] = useState("Active");
  const [createLoginNow, setCreateLoginNow] = useState(false);
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [roleIds, setRoleIds] = useState<number[]>([]);
  const [error, setError] = useState<string | null>(null);

  const roles = rolesData?.data.roles ?? [];

  useEffect(() => {
    if (!open) return;
    setFullName(employee?.fullName ?? "");
    setRoleTitle(employee?.roleTitle ?? "");
    setDepartmentId(employee?.departmentId ? String(employee.departmentId) : "");
    setEmail(employee?.email ?? "");
    setLocation(employee?.location ?? "");
    setSkill(employee?.skill ?? "");
    setStatus(employee?.status ?? "Active");
    setCreateLoginNow(false);
    setLoginEmail("");
    setLoginPassword("");
    setRoleIds(employee?.roles.map((r) => r.id) ?? []);
    setError(null);
  }, [open, employee]);

  const busy = createEmployee.isPending || updateEmployee.isPending || createLogin.isPending || updateRoles.isPending;

  function toggleRole(id: number) {
    setRoleIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      const payload = {
        fullName,
        roleTitle: roleTitle || undefined,
        departmentId: departmentId ? Number(departmentId) : undefined,
        email: email || undefined,
        location: location || undefined,
        skill: skill || undefined,
        status,
      };
      if (employee) {
        await updateEmployee.mutateAsync({ id: employee.id, payload });
        if (!employee.hasLogin && createLoginNow && loginEmail && loginPassword) {
          await createLogin.mutateAsync({ id: employee.id, loginEmail, loginPassword, roleIds: roleIds.length > 0 ? roleIds : undefined });
        } else if (employee.hasLogin) {
          const currentRoleIds = employee.roles.map((r) => r.id).sort();
          const nextRoleIds = [...roleIds].sort();
          const changed = currentRoleIds.length !== nextRoleIds.length || currentRoleIds.some((id, i) => id !== nextRoleIds[i]);
          if (changed) await updateRoles.mutateAsync({ id: employee.id, roleIds });
        }
      } else {
        await createEmployee.mutateAsync({
          ...payload,
          createLogin: createLoginNow,
          loginEmail: createLoginNow ? loginEmail : undefined,
          loginPassword: createLoginNow ? loginPassword : undefined,
          roleIds: createLoginNow && roleIds.length > 0 ? roleIds : undefined,
        });
      }
      onClose();
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Something went wrong");
    }
  }

  const showLoginSection = !employee || !employee.hasLogin;
  const showRoleSection = showLoginSection ? createLoginNow : true; // editing an existing login: always offer role management

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={employee ? "Edit Employee" : "Add Employee"}
      widthClassName="max-w-lg"
      footer={
        <>
          <button onClick={onClose} className="text-sm px-3 py-1.5 rounded-md border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800">
            Cancel
          </button>
          <button
            type="submit"
            form="employee-form"
            disabled={busy}
            className="text-sm px-3 py-1.5 rounded-md bg-brand-600 hover:bg-brand-700 text-white disabled:opacity-50"
          >
            {busy ? "Saving…" : employee ? "Save Changes" : "Add Employee"}
          </button>
        </>
      }
    >
      <form id="employee-form" onSubmit={submit} className="space-y-4">
        {error && <div className="text-sm text-danger-500 bg-danger-100 rounded-md px-3 py-2">{error}</div>}

        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <label className="block text-sm mb-1 text-slate-600 dark:text-slate-300">Full Name</label>
            <input className="w-full rounded-md border border-slate-300 dark:border-slate-700 bg-transparent px-3 py-2 text-sm" value={fullName} onChange={(e) => setFullName(e.target.value)} required />
          </div>
          <div>
            <label className="block text-sm mb-1 text-slate-600 dark:text-slate-300">Role / Title</label>
            <input className="w-full rounded-md border border-slate-300 dark:border-slate-700 bg-transparent px-3 py-2 text-sm" value={roleTitle} onChange={(e) => setRoleTitle(e.target.value)} />
          </div>
          <div>
            <label className="block text-sm mb-1 text-slate-600 dark:text-slate-300">Department</label>
            <select className="w-full rounded-md border border-slate-300 dark:border-slate-700 bg-transparent px-3 py-2 text-sm" value={departmentId} onChange={(e) => setDepartmentId(e.target.value)}>
              <option value="">—</option>
              {deptData?.data.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm mb-1 text-slate-600 dark:text-slate-300">Email</label>
            <input type="email" className="w-full rounded-md border border-slate-300 dark:border-slate-700 bg-transparent px-3 py-2 text-sm" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div>
            <label className="block text-sm mb-1 text-slate-600 dark:text-slate-300">Location</label>
            <input className="w-full rounded-md border border-slate-300 dark:border-slate-700 bg-transparent px-3 py-2 text-sm" value={location} onChange={(e) => setLocation(e.target.value)} />
          </div>
          <div>
            <label className="block text-sm mb-1 text-slate-600 dark:text-slate-300">Skill</label>
            <input className="w-full rounded-md border border-slate-300 dark:border-slate-700 bg-transparent px-3 py-2 text-sm" value={skill} onChange={(e) => setSkill(e.target.value)} />
          </div>
          <div>
            <label className="block text-sm mb-1 text-slate-600 dark:text-slate-300">Status</label>
            <select className="w-full rounded-md border border-slate-300 dark:border-slate-700 bg-transparent px-3 py-2 text-sm" value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
              <option value="On Leave">On Leave</option>
            </select>
          </div>
        </div>

        {showLoginSection && (
          <div className="border-t border-slate-200 dark:border-slate-800 pt-3">
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={createLoginNow} onChange={(e) => setCreateLoginNow(e.target.checked)} />
              Create login for this employee
            </label>
            {!createLoginNow && (
              // Roles (DepartmentHead, Admin, etc.) attach to a login/user account, not the
              // employee record — this employee has no login yet, so the Roles section below
              // stays hidden until one is created. Without this note, "check this box to create
              // a login" reads unrelated to "I want to grant this person a role."
              <div className="text-xs text-slate-400 mt-1">
                This employee has no login yet, so roles (including Department Head) can't be assigned. Check this box to create one.
              </div>
            )}
            {createLoginNow && (
              <div className="grid grid-cols-2 gap-4 mt-3">
                <div>
                  <label className="block text-sm mb-1 text-slate-600 dark:text-slate-300">Login Email</label>
                  <input type="email" className="w-full rounded-md border border-slate-300 dark:border-slate-700 bg-transparent px-3 py-2 text-sm" value={loginEmail} onChange={(e) => setLoginEmail(e.target.value)} required={createLoginNow} />
                </div>
                <div>
                  <label className="block text-sm mb-1 text-slate-600 dark:text-slate-300">Password</label>
                  <input type="password" minLength={8} className="w-full rounded-md border border-slate-300 dark:border-slate-700 bg-transparent px-3 py-2 text-sm" value={loginPassword} onChange={(e) => setLoginPassword(e.target.value)} required={createLoginNow} />
                </div>
              </div>
            )}
            <div className="text-xs text-slate-400 mt-1">Defaults to the Employee role unless other roles are selected below.</div>
          </div>
        )}

        {showRoleSection && (
          <div className="border-t border-slate-200 dark:border-slate-800 pt-3">
            <label className="block text-sm mb-1 text-slate-600 dark:text-slate-300">
              {employee?.hasLogin ? "Roles" : "Roles (optional)"}
            </label>
            <div className="max-h-32 overflow-y-auto border border-slate-300 dark:border-slate-700 rounded-md p-2 space-y-1">
              {roles.map((r) => (
                <label key={r.id} className="flex items-center gap-2 text-sm px-1 py-0.5 rounded hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer">
                  <input type="checkbox" checked={roleIds.includes(r.id)} onChange={() => toggleRole(r.id)} />
                  {r.name}
                </label>
              ))}
            </div>
            {employee?.hasLogin && (
              <div className="text-xs text-slate-400 mt-1">
                {roleIds.length === 0
                  ? "Warning: saving with no roles checked removes all access for this login."
                  : "Saving replaces this employee's current roles with the selection above."}
              </div>
            )}
          </div>
        )}
      </form>
    </Modal>
  );
}
