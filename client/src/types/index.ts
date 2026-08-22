export type Health = "Green" | "Amber" | "Red";

export interface Project {
  id: number;
  projectCode: string;
  name: string;
  departmentId: number | null;
  projectManagerId: number | null;
  sponsorId: number | null;
  client: string | null;
  priority: "Critical" | "High" | "Medium" | "Low";
  category: string | null;
  status: string;
  startDate: string | null;
  endDate: string | null;
  baselineStart: string | null;
  baselineFinish: string | null;
  forecastFinish: string | null;
  budget: number;
  description: string | null;

  progressPctCache: number;
  actualCostCache: number;
  forecastCostCache: number;
  healthCache: Health;
  spiCache: number;
  cpiCache: number;
  riskScoreCache: number;
}

export interface Task {
  id: number;
  taskCode: string;
  projectId: number;
  name: string;
  assignedTo: number | null;
  priority: string;
  status: string;
  startDate: string | null;
  finishDate: string | null;
  progressPct: number;
  isMilestone: boolean;
  durationDaysCache: number | null;
  remainingDaysCache: number | null;
  isCriticalCache: boolean;
  healthCache: Health;
}

export interface Risk {
  id: number;
  riskCode: string;
  projectId: number;
  category: string;
  description: string;
  probability: number;
  impact: number;
  riskScoreCache: number;
  status: string;
}

export interface PortfolioKpis {
  projects: {
    total: number;
    active: number;
    completed: number;
    delayed: number;
    onHold: number;
    notStarted: number;
    health: { red: number; amber: number; green: number };
  };
  tasks: { total: number; completed: number; overdue: number; critical: number; upcomingDeadlines: number };
  risks: { open: number; high: number };
  issues: { open: number; overdue: number };
  pendingApprovals: number;
  evm: {
    bac: number; pv: number; ev: number; ac: number;
    spi: number; cpi: number; cv: number; sv: number;
    eac: number; etc: number; vac: number; tcpi: number;
    budgetUtilization: number;
  };
}

export interface PermissionGrant {
  module: string;
  actions: string[];
}

export interface CurrentUser {
  id: number;
  email: string;
  roles: string[];
  contactType: string;
  employeeId: number | null;
  employeeName: string | null;
  permissions: PermissionGrant[];
}

export type EmployeeTaskStatus = "Pending" | "In Progress" | "Completed" | "Not Done" | "Completed After Due Date";

export interface EmployeeTaskAssignment {
  id: number;
  taskId: number;
  employeeId: number;
  employeeName: string;
  status: EmployeeTaskStatus;
  notDoneReason: string | null;
  progressNotes: string | null;
  startedAt: string | null;
  completedAt: string | null;
  durationMs: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface EmployeeTask {
  id: number;
  taskCode: string;
  title: string;
  description: string | null;
  priority: "Critical" | "High" | "Medium" | "Low";
  dueDate: string | null;
  dueTime: string | null;
  departmentId: number | null;
  departmentName: string | null;
  createdBy: number;
  createdAt: string;
  updatedAt: string;
  assignments: EmployeeTaskAssignment[];
  totalAssignees: number;
  completedCount: number;
  notDoneCount: number;
  completionPct: number;
}

export interface DeletedEmployeeTask {
  id: number;
  taskCode: string;
  title: string;
  departmentName: string;
  priority: "Critical" | "High" | "Medium" | "Low";
  dueDate: string | null;
  deletedAt: string;
  deletedByName: string;
  reason: string;
}

export interface EmployeeTaskComment {
  id: number;
  body: string;
  userId: number;
  userEmail: string;
  createdAt: string;
}

export interface EmployeeTaskStats {
  totalTasks: number;
  statusCounts: Record<EmployeeTaskStatus, number>;
  completionPct: number;
  overdueCount: number;
  employeeCompletion: { employeeId: number; employeeName: string; total: number; completed: number; completionPct: number }[];
  monthlyTrend: { month: string; count: number }[];
  weeklyTrend: { week: string; count: number }[];
}

export interface Employee {
  id: number;
  employeeCode: string;
  fullName: string;
  roleTitle: string | null;
  departmentId: number | null;
  departmentName: string | null;
  managerId: number | null;
  email: string | null;
  location: string | null;
  costRate: number | null;
  capacityHoursPerMonth: number | null;
  skill: string | null;
  status: string;
  hasLogin: boolean;
  loginActive: boolean | null;
  roles: { id: number; name: string }[];
  createdAt: string;
  updatedAt: string;
}

export interface MyTeamMember {
  id: number;
  fullName: string;
  roleTitle: string | null;
  email: string | null;
  statusCounts: Record<EmployeeTaskStatus, number>;
}

export interface MyTeam {
  departmentId: number | null;
  departmentName: string | null;
  members: MyTeamMember[];
}

export interface Attachment {
  id: number;
  entityType: string;
  entityId: number;
  commentId: number | null;
  fileName: string;
  filePath: string;
  mimeType: string;
  sizeBytes: number;
  uploadedBy: number;
  createdAt: string;
}
