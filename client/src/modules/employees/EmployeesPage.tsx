import { useMemo, useState } from "react";
import DataTable from "../../components/data-table/DataTable";
import ConfirmDialog from "../../components/ui/ConfirmDialog";
import { usePermissions } from "../../hooks/usePermissions";
import { ApiClientError } from "../../services/apiClient";
import { useEmployees, useDeleteEmployee } from "./useEmployees";
import EmployeeFormModal from "./EmployeeFormModal";
import { Employee } from "../../types";

type SortKey = "name" | "department" | "status";

export default function EmployeesPage() {
  const { can } = usePermissions();
  const { data, isLoading } = useEmployees();
  const deleteEmployee = useDeleteEmployee();

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("name");
  const [formOpen, setFormOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [deletingEmployee, setDeletingEmployee] = useState<Employee | null>(null);
  const [error, setError] = useState<string | null>(null);

  const canCreate = can("employees", "create");
  const canUpdate = can("employees", "update");
  const canDelete = can("employees", "delete");

  const rows = useMemo(() => {
    let list = data?.data ?? [];
    if (search.trim()) {
      const term = search.trim().toLowerCase();
      list = list.filter((e) => e.fullName.toLowerCase().includes(term) || e.employeeCode.toLowerCase().includes(term) || (e.email ?? "").toLowerCase().includes(term));
    }
    if (statusFilter) list = list.filter((e) => e.status === statusFilter);
    return [...list].sort((a, b) => {
      if (sortKey === "department") return (a.departmentName || "").localeCompare(b.departmentName || "");
      if (sortKey === "status") return a.status.localeCompare(b.status);
      return a.fullName.localeCompare(b.fullName);
    });
  }, [data, search, statusFilter, sortKey]);

  function openCreate() {
    setEditingEmployee(null);
    setFormOpen(true);
  }

  function openEdit(emp: Employee) {
    setEditingEmployee(emp);
    setFormOpen(true);
  }

  async function confirmDelete() {
    if (!deletingEmployee) return;
    setError(null);
    try {
      await deleteEmployee.mutateAsync(deletingEmployee.id);
      setDeletingEmployee(null);
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Could not delete employee");
    }
  }

  if (isLoading) return <div className="text-slate-400">Loading…</div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-semibold">Employees</h1>
        {canCreate && (
          <button onClick={openCreate} className="text-sm px-3 py-1.5 rounded-md bg-brand-600 hover:bg-brand-700 text-white">
            + Add Employee
          </button>
        )}
      </div>

      {error && <div className="mb-4 text-sm text-danger-500 bg-danger-100 rounded-md px-3 py-2">{error}</div>}

      <div className="flex flex-wrap gap-3 mb-4">
        <input
          className="rounded-md border border-slate-300 dark:border-slate-700 bg-transparent px-3 py-1.5 text-sm"
          placeholder="Search name, code, email…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select
          className="rounded-md border border-slate-300 dark:border-slate-700 bg-transparent px-3 py-1.5 text-sm"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="">All statuses</option>
          <option value="Active">Active</option>
          <option value="Inactive">Inactive</option>
          <option value="On Leave">On Leave</option>
        </select>
        <select
          className="rounded-md border border-slate-300 dark:border-slate-700 bg-transparent px-3 py-1.5 text-sm"
          value={sortKey}
          onChange={(e) => setSortKey(e.target.value as SortKey)}
        >
          <option value="name">Sort: Name</option>
          <option value="department">Sort: Department</option>
          <option value="status">Sort: Status</option>
        </select>
      </div>

      <DataTable
        keyField="id"
        rows={rows}
        emptyMessage="No employees found."
        columns={[
          { key: "employeeCode", header: "Code" },
          { key: "fullName", header: "Name" },
          { key: "roleTitle", header: "Role", render: (r) => r.roleTitle || "—" },
          { key: "departmentName", header: "Department", render: (r) => r.departmentName || "—" },
          { key: "email", header: "Email", render: (r) => r.email || "—" },
          {
            key: "status",
            header: "Status",
            render: (r) => (
              <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${r.status === "Active" ? "bg-success-100 text-success-500" : "bg-slate-200 text-slate-600"}`}>{r.status}</span>
            ),
          },
          {
            key: "hasLogin",
            header: "Login",
            render: (r) => (r.hasLogin ? <span className="text-xs text-success-500">Yes</span> : <span className="text-xs text-slate-400">No</span>),
          },
          {
            key: "roles",
            header: "Roles",
            render: (r) => (r.roles.length > 0 ? <span className="text-xs">{r.roles.map((role) => role.name).join(", ")}</span> : <span className="text-xs text-slate-400">—</span>),
          },
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
                  <button onClick={() => setDeletingEmployee(r)} className="text-xs px-2 py-1 rounded-md border border-danger-500 text-danger-500 hover:bg-danger-100">
                    Delete
                  </button>
                )}
              </div>
            ),
          },
        ]}
      />

      <EmployeeFormModal open={formOpen} onClose={() => setFormOpen(false)} employee={editingEmployee} />

      <ConfirmDialog
        open={!!deletingEmployee}
        title="Delete Employee"
        message={`Delete "${deletingEmployee?.fullName}"? Their login (if any) will be deactivated, not removed.`}
        confirmLabel="Delete"
        busy={deleteEmployee.isPending}
        onConfirm={confirmDelete}
        onCancel={() => setDeletingEmployee(null)}
      />
    </div>
  );
}
