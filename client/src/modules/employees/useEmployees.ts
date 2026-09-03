import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../../services/apiClient";
import { Employee } from "../../types";

export interface EmployeePayload {
  fullName: string;
  roleTitle?: string;
  departmentId?: number;
  managerId?: number;
  email?: string;
  location?: string;
  costRate?: number;
  capacityHoursPerMonth?: number;
  skill?: string;
  status?: string;
  createLogin?: boolean;
  loginEmail?: string;
  loginPassword?: string;
  roleIds?: number[];
}

export function useEmployees(query: { q?: string; departmentId?: number; status?: string } = {}, options: { enabled?: boolean } = {}) {
  const params = new URLSearchParams();
  if (query.q) params.set("q", query.q);
  if (query.departmentId) params.set("departmentId", String(query.departmentId));
  if (query.status) params.set("status", query.status);
  const qs = params.toString();
  return useQuery({
    queryKey: ["employees", query],
    queryFn: () => api.get<{ data: Employee[] }>(`/employees${qs ? `?${qs}` : ""}`),
    enabled: options.enabled ?? true,
  });
}

export function useCreateEmployee() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: EmployeePayload) => api.post<{ data: Employee }>("/employees", payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["employees"] }),
  });
}

export function useUpdateEmployee() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: Partial<EmployeePayload> }) =>
      api.patch<{ data: Employee }>(`/employees/${id}`, payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["employees"] }),
  });
}

export function useDeleteEmployee() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api.delete(`/employees/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["employees"] }),
  });
}

export function useDeletedEmployees(query: { q?: string } = {}, options: { enabled?: boolean } = {}) {
  const params = new URLSearchParams();
  if (query.q) params.set("q", query.q);
  const qs = params.toString();
  return useQuery({
    queryKey: ["employees", "deleted", query],
    queryFn: () => api.get<{ data: Employee[] }>(`/employees/deleted${qs ? `?${qs}` : ""}`),
    enabled: options.enabled ?? true,
  });
}

export function useRestoreEmployee() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api.post<{ data: Employee }>(`/employees/${id}/restore`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["employees"] }),
  });
}

export function useCreateLoginForEmployee() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, loginEmail, loginPassword, roleIds }: { id: number; loginEmail: string; loginPassword: string; roleIds?: number[] }) =>
      api.post<{ data: Employee }>(`/employees/${id}/create-login`, { loginEmail, loginPassword, roleIds }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["employees"] }),
  });
}

export function useUpdateEmployeeRoles() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, roleIds }: { id: number; roleIds: number[] }) =>
      api.put<{ data: Employee }>(`/employees/${id}/roles`, { roleIds }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["employees"] }),
  });
}

export function useDepartments() {
  return useQuery({
    queryKey: ["departments"],
    queryFn: () => api.get<{ data: { id: number; name: string }[] }>("/departments"),
  });
}

export function useRoles() {
  return useQuery({
    queryKey: ["rbac", "roles"],
    queryFn: () => api.get<{ data: { roles: { id: number; name: string; description: string | null }[] } }>("/rbac/matrix"),
  });
}
