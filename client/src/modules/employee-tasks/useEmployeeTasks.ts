import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../../services/apiClient";
import { Attachment, DeletedEmployeeTask, DepartmentTeam, EmployeeTask, EmployeeTaskAssignment, EmployeeTaskComment, EmployeeTaskStats, MyTeam } from "../../types";

// Real-time is polling-based in this app (no WebSocket/SSE infra exists) — a ~15s refetch plus
// immediate invalidation right after any mutation keeps the board and dashboard current without
// requiring a manual refresh.
const POLL_MS = 15_000;

export interface CreateTaskPayload {
  title: string;
  description?: string;
  priority: string;
  dueDate?: string;
  dueTime?: string;
  departmentId?: number;
  assigneeIds: number[];
}

export interface UpdateStatusPayload {
  status: string;
  notDoneReason?: string;
  progressNotes?: string;
}

export function useEmployeeTasks(employeeId?: number, departmentId?: number) {
  const queryKey = ["employee-tasks", { employeeId, departmentId }];
  const params = new URLSearchParams();
  if (employeeId) params.set("employeeId", String(employeeId));
  if (departmentId) params.set("departmentId", String(departmentId));
  const qs = params.toString();
  const path = qs ? `/employee-tasks?${qs}` : "/employee-tasks";
  return useQuery({
    queryKey,
    queryFn: () => api.get<{ data: EmployeeTask[] }>(path),
    refetchInterval: POLL_MS,
  });
}

export function useMyTeam(enabled: boolean = true) {
  return useQuery({
    queryKey: ["employee-tasks", "my-team"],
    queryFn: () => api.get<{ data: MyTeam }>("/employee-tasks/my-team"),
    refetchInterval: POLL_MS,
    enabled,
  });
}

export function useDepartmentTeams() {
  return useQuery({
    queryKey: ["employee-tasks", "department-teams"],
    queryFn: () => api.get<{ data: DepartmentTeam[] }>("/employee-tasks/department-teams"),
    refetchInterval: POLL_MS,
  });
}

export function useEmployeeTaskStats(employeeId?: number) {
  const queryKey = employeeId ? ["employee-tasks", "stats", "employee", employeeId] : ["employee-tasks", "stats"];
  const path = employeeId ? `/employee-tasks/stats?employeeId=${employeeId}` : "/employee-tasks/stats";
  return useQuery({
    queryKey,
    queryFn: () => api.get<{ data: EmployeeTaskStats }>(path),
    refetchInterval: POLL_MS,
  });
}

export function useCreateEmployeeTask() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateTaskPayload) => api.post<{ data: EmployeeTask }>("/employee-tasks", payload),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ["employee-tasks"] });
      return res;
    },
  });
}

export function useUpdateEmployeeTask() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: Partial<CreateTaskPayload> }) =>
      api.patch<{ data: EmployeeTask }>(`/employee-tasks/${id}`, payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["employee-tasks"] }),
  });
}

export function useDeleteEmployeeTask() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, reason }: { id: number; reason: string }) => api.delete(`/employee-tasks/${id}`, { reason }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["employee-tasks"] }),
  });
}

export function useDeletedEmployeeTasks() {
  return useQuery({
    queryKey: ["employee-tasks", "deleted"],
    queryFn: () => api.get<{ data: DeletedEmployeeTask[] }>("/employee-tasks/deleted"),
    refetchInterval: POLL_MS,
  });
}

export function useUpdateAssignmentStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ assignmentId, payload }: { assignmentId: number; payload: UpdateStatusPayload }) =>
      api.patch<{ data: EmployeeTaskAssignment }>(`/employee-tasks/assignments/${assignmentId}/status`, payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["employee-tasks"] }),
  });
}

export function useAssignmentComments(assignmentId: number | null) {
  return useQuery({
    queryKey: ["employee-tasks", "comments", assignmentId],
    queryFn: () => api.get<{ data: EmployeeTaskComment[] }>(`/employee-tasks/assignments/${assignmentId}/comments`),
    enabled: assignmentId !== null,
  });
}

export function useAddComment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ assignmentId, body }: { assignmentId: number; body: string }) =>
      api.post<{ data: EmployeeTaskComment }>(`/employee-tasks/assignments/${assignmentId}/comments`, { body }),
    onSuccess: (_res, vars) => queryClient.invalidateQueries({ queryKey: ["employee-tasks", "comments", vars.assignmentId] }),
  });
}

// Attachments (currently: voice notes) tied to a ticket's discussion thread — entityType
// "employee-task-assignment" mirrors how comments are already scoped to a single assignment.
export function useAssignmentAttachments(assignmentId: number | null) {
  return useQuery({
    queryKey: ["employee-tasks", "attachments", assignmentId],
    queryFn: () => api.get<{ data: Attachment[] }>(`/attachments?entityType=employee-task-assignment&entityId=${assignmentId}`),
    enabled: assignmentId !== null,
  });
}
