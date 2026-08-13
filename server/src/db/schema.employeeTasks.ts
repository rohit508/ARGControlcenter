import { sqliteTable, text, integer, uniqueIndex, index } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";
import { employees, users, departments } from "./schema.core";

// Deliberately separate from the PMO `tasks` table (schema.pmo.ts): that table requires a
// projectId and drives EVM/Gantt cached columns via recalculateProject(). Employee task
// assignment is not project-scoped and has its own status vocabulary (Pending/In Progress/
// Completed/Not Done), so reusing it would either break EVM rollups or bolt unrelated columns
// onto a table that means something else.

export const employeeTasks = sqliteTable(
  "employee_tasks",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    taskCode: text("task_code").notNull().unique(),
    title: text("title").notNull(),
    description: text("description"),
    priority: text("priority").notNull().default("Medium"), // Critical|High|Medium|Low
    dueDate: text("due_date"),
    dueTime: text("due_time"), // "HH:MM", 24-hour — optional; absent means end-of-day (23:59:59)
    departmentId: integer("department_id").references(() => departments.id),
    createdBy: integer("created_by").notNull().references(() => users.id),
    deletedAt: integer("deleted_at", { mode: "timestamp" }),
    createdAt: integer("created_at", { mode: "timestamp" }).notNull().default(sql`(unixepoch())`),
    updatedAt: integer("updated_at", { mode: "timestamp" }).notNull().default(sql`(unixepoch())`),
  },
  (t) => ({ dueDateIdx: index("employee_tasks_due_date_idx").on(t.dueDate) })
);

// Status is tracked per-assignee (not one shared status on the task) so that when a task is
// assigned to multiple employees, each person's own progress is independent — one assignee
// marking their part Completed never overwrites another assignee's status.
export const employeeTaskAssignments = sqliteTable(
  "employee_task_assignments",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    taskId: integer("task_id").notNull().references(() => employeeTasks.id),
    employeeId: integer("employee_id").notNull().references(() => employees.id),
    status: text("status").notNull().default("Pending"), // Pending|In Progress|Completed|Not Done
    notDoneReason: text("not_done_reason"),
    progressNotes: text("progress_notes"),
    startedAt: integer("started_at", { mode: "timestamp" }),
    completedAt: integer("completed_at", { mode: "timestamp" }),
    durationMs: integer("duration_ms"),
    deletedAt: integer("deleted_at", { mode: "timestamp" }),
    createdAt: integer("created_at", { mode: "timestamp" }).notNull().default(sql`(unixepoch())`),
    updatedAt: integer("updated_at", { mode: "timestamp" }).notNull().default(sql`(unixepoch())`),
  },
  (t) => ({
    uniq: uniqueIndex("employee_task_assignments_uq").on(t.taskId, t.employeeId),
    employeeIdx: index("employee_task_assignments_employee_idx").on(t.employeeId),
    taskIdx: index("employee_task_assignments_task_idx").on(t.taskId),
  })
);
