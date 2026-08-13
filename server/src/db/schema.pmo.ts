import { sqliteTable, text, integer, real, index, uniqueIndex } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";
import { departments, employees, users } from "./schema.core";

const ts = () => ({
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().default(sql`(unixepoch())`),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull().default(sql`(unixepoch())`),
});

export const projects = sqliteTable(
  "projects",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    projectCode: text("project_code").notNull().unique(),
    name: text("name").notNull(),
    program: text("program"),
    portfolio: text("portfolio"),
    departmentId: integer("department_id").references(() => departments.id),
    businessUnit: text("business_unit"),
    projectManagerId: integer("project_manager_id").references(() => employees.id),
    sponsorId: integer("sponsor_id").references(() => employees.id),
    client: text("client"),
    priority: text("priority").notNull().default("Medium"),
    category: text("category"),
    status: text("status").notNull().default("Not Started"),
    startDate: text("start_date"), // ISO date (YYYY-MM-DD)
    endDate: text("end_date"),
    baselineStart: text("baseline_start"),
    baselineFinish: text("baseline_finish"),
    forecastFinish: text("forecast_finish"),
    actualFinish: text("actual_finish"),
    budget: real("budget").notNull().default(0),
    description: text("description"),
    remarks: text("remarks"),

    // cached/computed by ProjectService — never written directly by the API layer
    actualCostCache: real("actual_cost_cache").notNull().default(0),
    forecastCostCache: real("forecast_cost_cache").notNull().default(0),
    progressPctCache: real("progress_pct_cache").notNull().default(0),
    healthCache: text("health_cache").notNull().default("Green"),
    spiCache: real("spi_cache").notNull().default(1),
    cpiCache: real("cpi_cache").notNull().default(1),
    riskScoreCache: real("risk_score_cache").notNull().default(0),
    plannedValueCache: real("planned_value_cache").notNull().default(0),
    earnedValueCache: real("earned_value_cache").notNull().default(0),
    recalculatedAt: integer("recalculated_at", { mode: "timestamp" }),

    deletedAt: integer("deleted_at", { mode: "timestamp" }),
    ...ts(),
  },
  (t) => ({
    deptIdx: index("projects_dept_idx").on(t.departmentId),
    pmIdx: index("projects_pm_idx").on(t.projectManagerId),
  })
);

export const projectShares = sqliteTable(
  "project_shares",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    projectId: integer("project_id").notNull().references(() => projects.id),
    userId: integer("user_id").notNull().references(() => users.id),
    showBudget: integer("show_budget", { mode: "boolean" }).notNull().default(false),
    createdAt: integer("created_at", { mode: "timestamp" }).notNull().default(sql`(unixepoch())`),
  },
  (t) => ({ uniq: uniqueIndex("project_shares_uq").on(t.projectId, t.userId) })
);

export const tasks = sqliteTable(
  "tasks",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    taskCode: text("task_code").notNull().unique(),
    projectId: integer("project_id").notNull().references(() => projects.id),
    parentTaskId: integer("parent_task_id"),
    name: text("name").notNull(),
    wbs: text("wbs"),
    assignedTo: integer("assigned_to").references(() => employees.id),
    departmentId: integer("department_id").references(() => departments.id),
    priority: text("priority").notNull().default("Medium"),
    status: text("status").notNull().default("Not Started"),
    startDate: text("start_date"),
    finishDate: text("finish_date"),
    actualStart: text("actual_start"),
    actualFinish: text("actual_finish"),
    dependencyType: text("dependency_type"),
    successorTaskId: integer("successor_task_id"),
    predecessorTaskId: integer("predecessor_task_id"),
    progressPct: real("progress_pct").notNull().default(0), // 0..1
    baselineStart: text("baseline_start"),
    baselineFinish: text("baseline_finish"),
    isMilestone: integer("is_milestone", { mode: "boolean" }).notNull().default(false),
    comments: text("comments"),

    // cached/computed by TaskService
    durationDaysCache: integer("duration_days_cache"),
    remainingDaysCache: integer("remaining_days_cache"),
    isCriticalCache: integer("is_critical_cache", { mode: "boolean" }).notNull().default(false),
    varianceDaysCache: integer("variance_days_cache"),
    healthCache: text("health_cache").notNull().default("Green"),

    deletedAt: integer("deleted_at", { mode: "timestamp" }),
    ...ts(),
  },
  (t) => ({
    projectIdx: index("tasks_project_idx").on(t.projectId),
    assigneeIdx: index("tasks_assignee_idx").on(t.assignedTo),
  })
);

export const budgetEntries = sqliteTable(
  "budget_entries",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    entryCode: text("entry_code").notNull().unique(),
    projectId: integer("project_id").notNull().references(() => projects.id),
    costCategory: text("cost_category").notNull(),
    vendorName: text("vendor_name"),
    poNumber: text("po_number"),
    invoiceStatus: text("invoice_status").notNull().default("Pending"),
    transactionDate: text("transaction_date").notNull(),
    committedCost: real("committed_cost").notNull().default(0),
    actualCost: real("actual_cost").notNull().default(0),
    forecastCost: real("forecast_cost").notNull().default(0),
    remarks: text("remarks"),
    deletedAt: integer("deleted_at", { mode: "timestamp" }),
    createdAt: integer("created_at", { mode: "timestamp" }).notNull().default(sql`(unixepoch())`),
  },
  (t) => ({ projectIdx: index("budget_entries_project_idx").on(t.projectId) })
);

export const risks = sqliteTable(
  "risks",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    riskCode: text("risk_code").notNull().unique(),
    projectId: integer("project_id").notNull().references(() => projects.id),
    category: text("category").notNull(),
    description: text("description").notNull(),
    probability: integer("probability").notNull(), // 1..5
    impact: integer("impact").notNull(), // 1..5
    riskScoreCache: integer("risk_score_cache").notNull().default(0),
    ownerId: integer("owner_id").references(() => employees.id),
    mitigation: text("mitigation"),
    status: text("status").notNull().default("Open"),
    targetDate: text("target_date"),
    closedDate: text("closed_date"),
    deletedAt: integer("deleted_at", { mode: "timestamp" }),
    createdAt: integer("created_at", { mode: "timestamp" }).notNull().default(sql`(unixepoch())`),
  },
  (t) => ({ projectIdx: index("risks_project_idx").on(t.projectId) })
);

export const issues = sqliteTable(
  "issues",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    issueCode: text("issue_code").notNull().unique(),
    projectId: integer("project_id").notNull().references(() => projects.id),
    description: text("description").notNull(),
    ownerId: integer("owner_id").references(() => employees.id),
    severity: text("severity").notNull().default("Medium"),
    priority: text("priority").notNull().default("Medium"),
    dateRaised: text("date_raised").notNull(),
    dueDate: text("due_date"),
    status: text("status").notNull().default("Open"),
    resolution: text("resolution"),
    deletedAt: integer("deleted_at", { mode: "timestamp" }),
    createdAt: integer("created_at", { mode: "timestamp" }).notNull().default(sql`(unixepoch())`),
  },
  (t) => ({ projectIdx: index("issues_project_idx").on(t.projectId) })
);

export const changeRequests = sqliteTable(
  "change_requests",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    changeCode: text("change_code").notNull().unique(),
    projectId: integer("project_id").notNull().references(() => projects.id),
    description: text("description").notNull(),
    impact: text("impact"),
    approvalStatus: text("approval_status").notNull().default("Pending"),
    ownerId: integer("owner_id").references(() => employees.id),
    approvalDate: text("approval_date"),
    implementationDate: text("implementation_date"),
    status: text("status").notNull().default("Under Review"),
    workflowInstanceId: integer("workflow_instance_id"),
    deletedAt: integer("deleted_at", { mode: "timestamp" }),
    createdAt: integer("created_at", { mode: "timestamp" }).notNull().default(sql`(unixepoch())`),
  },
  (t) => ({ projectIdx: index("change_requests_project_idx").on(t.projectId) })
);

export const milestones = sqliteTable(
  "milestones",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    projectId: integer("project_id").notNull().references(() => projects.id),
    name: text("name").notNull(),
    ownerId: integer("owner_id").references(() => employees.id),
    plannedDate: text("planned_date").notNull(),
    actualDate: text("actual_date"),
    status: text("status").notNull().default("Pending"),
    deletedAt: integer("deleted_at", { mode: "timestamp" }),
    createdAt: integer("created_at", { mode: "timestamp" }).notNull().default(sql`(unixepoch())`),
  },
  (t) => ({ projectIdx: index("milestones_project_idx").on(t.projectId) })
);

export const meetings = sqliteTable(
  "meetings",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    meetingCode: text("meeting_code").notNull().unique(),
    meetingDate: text("meeting_date").notNull(),
    projectId: integer("project_id").references(() => projects.id),
    discussion: text("discussion"),
    ownerId: integer("owner_id").references(() => employees.id),
    status: text("status").notNull().default("Open"),
    createdAt: integer("created_at", { mode: "timestamp" }).notNull().default(sql`(unixepoch())`),
  },
  (t) => ({ projectIdx: index("meetings_project_idx").on(t.projectId) })
);

export const meetingAttendees = sqliteTable(
  "meeting_attendees",
  {
    meetingId: integer("meeting_id").notNull().references(() => meetings.id),
    employeeId: integer("employee_id").notNull().references(() => employees.id),
  },
  (t) => ({ uniq: uniqueIndex("meeting_attendees_uq").on(t.meetingId, t.employeeId) })
);

export const actionItems = sqliteTable("action_items", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  actionCode: text("action_code").notNull().unique(),
  meetingId: integer("meeting_id").references(() => meetings.id),
  description: text("description").notNull(),
  ownerId: integer("owner_id").references(() => employees.id),
  dueDate: text("due_date"),
  status: text("status").notNull().default("Open"),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().default(sql`(unixepoch())`),
});

export const lessonsLearned = sqliteTable("lessons_learned", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  lessonCode: text("lesson_code").notNull().unique(),
  projectId: integer("project_id").references(() => projects.id),
  category: text("category").notNull(),
  description: text("description").notNull(),
  impact: text("impact"),
  recommendation: text("recommendation"),
  dateLogged: text("date_logged").notNull(),
});

export const kpiSnapshots = sqliteTable(
  "kpi_snapshots",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    projectId: integer("project_id").references(() => projects.id), // null = portfolio-level
    snapshotDate: text("snapshot_date").notNull(),
    spi: real("spi").notNull(),
    cpi: real("cpi").notNull(),
    cv: real("cv").notNull(),
    sv: real("sv").notNull(),
    eac: real("eac").notNull(),
    etc: real("etc").notNull(),
    vac: real("vac").notNull(),
    tcpi: real("tcpi").notNull(),
    progressPct: real("progress_pct").notNull(),
    budgetUtilization: real("budget_utilization").notNull(),
    createdAt: integer("created_at", { mode: "timestamp" }).notNull().default(sql`(unixepoch())`),
  },
  (t) => ({ projIdx: index("kpi_snapshots_project_idx").on(t.projectId, t.snapshotDate) })
);
