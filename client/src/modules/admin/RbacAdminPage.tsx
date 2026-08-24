import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, ApiClientError } from "../../services/apiClient";
import { roleDisplayLabel } from "../../utils/roleLabels";

interface Role {
  id: number;
  name: string;
  description: string | null;
}
interface Permission {
  id: number;
  module: string;
  action: string;
}
interface Grant {
  roleId: number;
  permissionId: number;
}
interface Matrix {
  roles: Role[];
  permissions: Permission[];
  grants: Grant[];
}

const ACTIONS = ["create", "update", "delete"];

export default function RbacAdminPage() {
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["rbac", "matrix"],
    queryFn: () => api.get<{ data: Matrix }>("/rbac/matrix"),
  });

  const [selectedRoleId, setSelectedRoleId] = useState<number | null>(null);
  const [checkedPermissionIds, setCheckedPermissionIds] = useState<Set<number>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const roles = data?.data.roles ?? [];
  const permissions = data?.data.permissions ?? [];
  const grants = data?.data.grants ?? [];

  useEffect(() => {
    if (roles.length > 0 && selectedRoleId === null) setSelectedRoleId(roles[0].id);
  }, [roles, selectedRoleId]);

  useEffect(() => {
    if (selectedRoleId === null) return;
    const current = new Set(grants.filter((g) => g.roleId === selectedRoleId).map((g) => g.permissionId));
    setCheckedPermissionIds(current);
    setSaved(false);
  }, [selectedRoleId, grants]);

  const modules = useMemo(() => [...new Set(permissions.map((p) => p.module))].sort(), [permissions]);
  const permByModuleAction = useMemo(() => {
    const map = new Map<string, Permission>();
    for (const p of permissions) map.set(`${p.module}:${p.action}`, p);
    return map;
  }, [permissions]);

  const selectedRole = roles.find((r) => r.id === selectedRoleId);
  const isAdmin = selectedRole?.name === "Admin";

  function toggle(permissionId: number) {
    setSaved(false);
    setCheckedPermissionIds((prev) => {
      const next = new Set(prev);
      if (next.has(permissionId)) next.delete(permissionId);
      else next.add(permissionId);
      return next;
    });
  }

  const save = useMutation({
    mutationFn: () => api.put(`/rbac/roles/${selectedRoleId}/permissions`, { permissionIds: [...checkedPermissionIds] }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["rbac", "matrix"] });
      setSaved(true);
      setError(null);
    },
    onError: (err) => setError(err instanceof ApiClientError ? err.message : "Could not save permissions"),
  });

  if (isLoading) return <div className="text-slate-400">Loading…</div>;

  return (
    <div>
      <h1 className="text-xl font-semibold mb-1">Roles & Permissions</h1>
      <p className="text-sm text-slate-400 mb-4">Control which screens and actions each role can access.</p>

      {error && <div className="mb-4 text-sm text-danger-500 bg-danger-100 rounded-md px-3 py-2">{error}</div>}
      {saved && <div className="mb-4 text-sm text-success-500 bg-success-100 rounded-md px-3 py-2">Permissions saved.</div>}

      <div className="flex gap-6">
        <div className="w-48 shrink-0">
          <div className="text-xs font-semibold uppercase text-slate-400 mb-2">Roles</div>
          <div className="space-y-1">
            {roles.map((r) => (
              <button
                key={r.id}
                onClick={() => setSelectedRoleId(r.id)}
                className={`w-full text-left text-sm px-3 py-1.5 rounded-md ${
                  selectedRoleId === r.id ? "bg-brand-600 text-white" : "hover:bg-slate-100 dark:hover:bg-slate-800"
                }`}
              >
                {roleDisplayLabel(r.name)}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1">
          {isAdmin ? (
            <div className="text-sm text-slate-400 border border-dashed border-slate-300 dark:border-slate-700 rounded-lg py-8 text-center">
              Admin always has full access to every module — nothing to configure here.
            </div>
          ) : (
            <>
              <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-lg">
                <table className="min-w-full text-sm">
                  <thead className="bg-brand-600 text-white">
                    <tr>
                      <th className="text-left font-semibold px-3 py-2">Module</th>
                      {ACTIONS.map((a) => (
                        <th key={a} className="text-center font-semibold px-3 py-2 capitalize">
                          {a}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {modules.map((module) => (
                      <tr key={module} className="bg-white dark:bg-slate-900">
                        <td className="px-3 py-2 font-medium">{module}</td>
                        {ACTIONS.map((action) => {
                          const perm = permByModuleAction.get(`${module}:${action}`);
                          if (!perm) return <td key={action} className="text-center px-3 py-2 text-slate-300">—</td>;
                          return (
                            <td key={action} className="text-center px-3 py-2">
                              <input type="checkbox" checked={checkedPermissionIds.has(perm.id)} onChange={() => toggle(perm.id)} />
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <button
                onClick={() => save.mutate()}
                disabled={save.isPending}
                className="mt-4 text-sm px-4 py-2 rounded-md bg-brand-600 hover:bg-brand-700 text-white disabled:opacity-50"
              >
                {save.isPending ? "Saving…" : `Save ${selectedRole?.name} Permissions`}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
