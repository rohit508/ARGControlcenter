import { pgTable, text, integer, real, timestamp, boolean, serial, index, uniqueIndex } from "drizzle-orm/pg-core";
import { departments, employees, users } from "./schema.core";

const ts = () => ({
  createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { mode: "date" }).notNull().defaultNow(),
});

export const projects = pgTable(
  "projects",
  {
    id: serial("id").primaryKey(),
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
    recalculatedAt: timestamp("recalculated_at", { mode: "date" }),

    deletedAt: timestamp("deleted_at", { mode: "date" }),
    ...ts(),
  },
  (t) => ({
    deptIdx: index("projects_dept_idx").on(t.departmentId),
    pmIdx: index("projects_pm_idx").on(t.projectManagerId),
  })
);

export const projectShares = pgTable(
  "project_shares",
  {
    id: serial("id").primaryKey(),
    projectId: integer("project_id").notNull().references(() => projects.id),
    userId: integer("user_id").notNull().references(() => users.id),
    showBudget: boolean("show_budget").notNull().default(false),
    createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
  },
  (t) => ({ uniq: uniqueIndex("project_shares_uq").on(t.projectId, t.userId) })
);

export const tasks = pgTable(
  "tasks",
  {
    id: serial("id").primaryKey(),
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
    isMilestone: boolean("is_milestone").notNull().default(false),
    comments: text("comments"),

    // cached/computed by TaskService
    durationDaysCache: integer("duration_days_cache"),
    remainingDaysCache: integer("remaining_days_cache"),
    isCriticalCache: boolean("is_critical_cache").notNull().default(false),
    varianceDaysCache: integer("variance_days_cache"),
    healthCache: text("health_cache").notNull().default("Green"),

    deletedAt: timestamp("deleted_at", { mode: "date" }),
    ...ts(),
  },
  (t) => ({
    projectIdx: index("tasks_project_idx").on(t.projectId),
    assigneeIdx: index("tasks_assignee_idx").on(t.assignedTo),
  })
);

export const budgetEntries = pgTable(
  "budget_entries",
  {
    id: serial("id").primaryKey(),
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
    deletedAt: timestamp("deleted_at", { mode: "date" }),
    createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
  },
  (t) => ({ projectIdx: index("budget_entries_project_idx").on(t.projectId) })
);

export const risks = pgTable(
  "risks",
  {
    id: serial("id").primaryKey(),
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
    deletedAt: timestamp("deleted_at", { mode: "date" }),
    createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
  },
  (t) => ({ projectIdx: index("risks_project_idx").on(t.projectId) })
);

export const issues = pgTable(
  "issues",
  {
    id: serial("id").primaryKey(),
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
    deletedAt: timestamp("deleted_at", { mode: "date" }),
    createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
  },
  (t) => ({ projectIdx: index("issues_project_idx").on(t.projectId) })
);

export const changeRequests = pgTable(
  "change_requests",
  {
    id: serial("id").primaryKey(),
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
    deletedAt: timestamp("deleted_at", { mode: "date" }),
    createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
  },
  (t) => ({ projectIdx: index("change_requests_project_idx").on(t.projectId) })
);

export const milestones = pgTable(
  "milestones",
  {
    id: serial("id").primaryKey(),
    projectId: integer("project_id").notNull().references(() => projects.id),
    name: text("name").notNull(),
    ownerId: integer("owner_id").references(() => employees.id),
    plannedDate: text("planned_date").notNull(),
    actualDate: text("actual_date"),
    status: text("status").notNull().default("Pending"),
    deletedAt: timestamp("deleted_at", { mode: "date" }),
    createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
  },
  (t) => ({ projectIdx: index("milestones_project_idx").on(t.projectId) })
);

export const meetings = pgTable(
  "meetings",
  {
    id: serial("id").primaryKey(),
    meetingCode: text("meeting_code").notNull().unique(),
    meetingDate: text("meeting_date").notNull(),
    projectId: integer("project_id").references(() => projects.id),
    discussion: text("discussion"),
    ownerId: integer("owner_id").references(() => employees.id),
    status: text("status").notNull().default("Open"),
    createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
  },
  (t) => ({ projectIdx: index("meetings_project_idx").on(t.projectId) })
);

export const meetingAttendees = pgTable(
  "meeting_attendees",
  {
    meetingId: integer("meeting_id").notNull().references(() => meetings.id),
    employeeId: integer("employee_id").notNull().references(() => employees.id),
  },
  (t) => ({ uniq: uniqueIndex("meeting_attendees_uq").on(t.meetingId, t.employeeId) })
);

export const actionItems = pgTable("action_items", {
  id: serial("id").primaryKey(),
  actionCode: text("action_code").notNull().unique(),
  meetingId: integer("meeting_id").references(() => meetings.id),
  description: text("description").notNull(),
  ownerId: integer("owner_id").references(() => employees.id),
  dueDate: text("due_date"),
  status: text("status").notNull().default("Open"),
  createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
});

export const lessonsLearned = pgTable("lessons_learned", {
  id: serial("id").primaryKey(),
  lessonCode: text("lesson_code").notNull().unique(),
  projectId: integer("project_id").references(() => projects.id),
  category: text("category").notNull(),
  description: text("description").notNull(),
  impact: text("impact"),
  recommendation: text("recommendation"),
  dateLogged: text("date_logged").notNull(),
});

export const kpiSnapshots = pgTable(
  "kpi_snapshots",
  {
    id: serial("id").primaryKey(),
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
    createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
  },
  (t) => ({ projIdx: index("kpi_snapshots_project_idx").on(t.projectId, t.snapshotDate) })
);
