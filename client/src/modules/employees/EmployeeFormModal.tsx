import { FormEvent, useEffect, useState } from "react";
import Modal from "../../components/ui/Modal";
import { ApiClientError } from "../../services/apiClient";
import { useCreateEmployee, useUpdateEmployee, useCreateLoginForEmployee, useUpdateEmployeeRoles, useDepartments, useRoles } from "./useEmployees";
import { Employee } from "../../types";
import { roleDisplayLabelForEmployee } from "../../utils/roleLabels";

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
  const [generatedCredentials, setGeneratedCredentials] = useState<{ email: string; password: string } | null>(null);

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
    setGeneratedCredentials(null);
  }, [open, employee]);

  const busy = createEmployee.isPending || updateEmployee.isPending || createLogin.isPending || updateRoles.isPending;

  function toggleRole(id: number) {
    setRoleIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  function generatePassword(): string {
    const bytes = new Uint8Array(12);
    crypto.getRandomValues(bytes);
    return Array.from(bytes, (b) => b.toString(36).padStart(2, "0")).join("").slice(0, 16);
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (generatedCredentials) return; // credentials already issued this session — nothing left to submit
    setError(null);
    let justGeneratedCredentials: { email: string; password: string } | null = null;
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
        } else if (!employee.hasLogin && roleIds.length > 0) {
          // Roles were picked for a login-less employee via the always-visible Roles list —
          // grant them without forcing the admin through the separate "create login" checkbox
          // flow. Falls back to that flow (via the error message) only if there's no email on
          // file to create a login with.
          const autoEmail = email || employee.email;
          if (!autoEmail) {
            throw new Error("This employee has no email on file. Add one above, or use \"Create login for this employee\" to set one.");
          }
          const autoPassword = generatePassword();
          await createLogin.mutateAsync({ id: employee.id, loginEmail: autoEmail, loginPassword: autoPassword, roleIds });
          justGeneratedCredentials = { email: autoEmail, password: autoPassword };
          setGeneratedCredentials(justGeneratedCredentials);
        } else if (employee.hasLogin) {
          const currentRoleIds = employee.roles.map((r) => r.id).sort();
          const nextRoleIds = [...roleIds].sort();
          const changed = currentRoleIds.length !== nextRoleIds.length || currentRoleIds.some((id, i) => id !== nextRoleIds[i]);
          if (changed) await updateRoles.mutateAsync({ id: employee.id, roleIds });
        }
      } else {
        // Roles picked without manually checking "create login": auto-create one from the
        // entered email + a generated password, same as the existing-employee path above.
        const autoCreate = !createLoginNow && roleIds.length > 0;
        if (autoCreate && !email) {
          throw new Error("Add an email above to assign roles (a login is created automatically), or use \"Create login for this employee\" to set one.");
        }
        const autoPassword = autoCreate ? generatePassword() : undefined;
        await createEmployee.mutateAsync({
          ...payload,
          createLogin: createLoginNow || autoCreate,
          loginEmail: createLoginNow ? loginEmail : autoCreate ? email : undefined,
          loginPassword: createLoginNow ? loginPassword : autoPassword,
          roleIds: (createLoginNow || autoCreate) && roleIds.length > 0 ? roleIds : undefined,
        });
        if (autoCreate) {
          justGeneratedCredentials = { email, password: autoPassword! };
          setGeneratedCredentials(justGeneratedCredentials);
        }
      }
      // Stay open when a login was just auto-created so the generated password (shown below,
      // one-time) doesn't get lost — this employee's row will show hasLogin=true on next open.
      if (!justGeneratedCredentials) onClose();
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Something went wrong");
    }
  }

  const showLoginSection = !employee || !employee.hasLogin;
  // Roles list is always visible (even before a login exists) so Department Head and other
  // roles can be granted directly; picking one for a login-less employee auto-creates their
  // login on save (see submit()) instead of requiring the "create login" checkbox first.
  const showRoleSection = true;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={employee ? "Edit Employee" : "Add Employee"}
      widthClassName="max-w-lg"
      footer={
        generatedCredentials ? (
          <button onClick={onClose} className="text-sm px-3 py-1.5 rounded-md bg-brand-600 hover:bg-brand-700 text-white">
            Done
          </button>
        ) : (
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
        )
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
              // employee record. Checking a role below for a login-less employee now
              // auto-creates one on save (using their email + a generated password) instead of
              // requiring this checkbox — it stays here only for setting a specific email/password.
              <div className="text-xs text-slate-400 mt-1">
                This employee has no login yet. Checking a role below will create one automatically, or check this box to set a specific email and password yourself.
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

        {generatedCredentials && (
          <div className="border-t border-slate-200 dark:border-slate-800 pt-3">
            <div className="text-sm bg-emerald-100 dark:bg-emerald-900/30 text-emerald-800 dark:text-emerald-300 rounded-md px-3 py-2 space-y-1">
              <div className="font-medium">Login created for this employee.</div>
              <div>
                Email: <span className="font-mono">{generatedCredentials.email}</span>
              </div>
              <div>
                Password: <span className="font-mono">{generatedCredentials.password}</span>
              </div>
              <div className="text-xs opacity-80">Copy this now — it won't be shown again. Share it with the employee securely.</div>
            </div>
          </div>
        )}

        {showRoleSection && (
          <div className="border-t border-slate-200 dark:border-slate-800 pt-3">
            <label className="block text-sm mb-1 text-slate-600 dark:text-slate-300">
              {employee?.hasLogin ? "Roles" : "Roles (optional — assigning one creates a login automatically)"}
            </label>
            <div className="max-h-32 overflow-y-auto border border-slate-300 dark:border-slate-700 rounded-md p-2 space-y-1">
              {roles.map((r) => (
                <label key={r.id} className="flex items-center gap-2 text-sm px-1 py-0.5 rounded hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer">
                  <input type="checkbox" checked={roleIds.includes(r.id)} onChange={() => toggleRole(r.id)} />
                  {roleDisplayLabelForEmployee(r.name, employee?.fullName)}
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
