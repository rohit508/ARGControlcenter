import { db } from "../../db/client";
import { employeeTasks, employeeTaskAssignments, employees, users, comments, notifications, departments } from "../../db/schema";
import { eq, and, isNull, inArray } from "drizzle-orm";
import { notFound, forbidden } from "../../middleware/errorHandler.middleware";
import { writeAudit } from "../../lib/audit";
import { nextCode } from "../../lib/codeGenerator";
import { userHasPermission } from "../../middleware/rbac.middleware";
import { AccessTokenPayload } from "../../lib/jwt";
import { CreateTaskInput, UpdateTaskInput, UpdateAssignmentStatusInput } from "./employee-tasks.schema";

export async function canManageAllTasks(user: AccessTokenPayload): Promise<boolean> {
  return userHasPermission(user, "employee-tasks", "create");
}

// Read-only visibility into every employee's task analytics — deliberately broader than
// canManageAllTasks (which also gates create/update/delete on the Task Board) and deliberately
// NOT a requirePermission grant, since RBAC's "employee-tasks" module models manage-others
// authority, not read-only executive reporting. CEO gets analytics visibility without also
// getting the ability to create/edit/delete other people's task assignments.
export async function canViewAllTaskStats(user: AccessTokenPayload): Promise<boolean> {
  if (user.roles.includes("CEO")) return true;
  return canManageAllTasks(user);
}

async function getCallerEmployeeId(userId: number): Promise<number | null> {
  const row = (await db.select({ employeeId: users.employeeId }).from(users).where(eq(users.id, userId)).limit(1))[0];
  return row?.employeeId ?? null;
}

// The cutoff a "Pending"/"In Progress" assignment must cross before it's considered overdue.
// When an explicit due time is set, the cutoff is that exact moment on the due date; otherwise
// it falls back to end-of-day (23:59:59) on that date, so tasks created before this feature
// existed (or admins who don't set a time) keep behaving exactly as before.
export function isOverdue(dueDate: string | null, dueTime: string | null = null, at: Date = new Date()): boolean {
  if (!dueDate) return false;
  const cutoff = dueTime ? `${dueDate}T${dueTime}:00` : `${dueDate}T23:59:59`;
  return at.getTime() > new Date(cutoff).getTime();
}

// What the assignment's status *would* become if the sweep ran right now — used so list/get
// responses (and the counts derived from them) never look stale in the up-to-15-minute gap
// between actual sweeps. Must mirror sweepOverdueTasks()'s rule exactly, or the two disagree.
export function getEffectiveStatus(status: string, dueDate: string | null, dueTime: string | null = null, at: Date = new Date()): string {
  if ((status === "Pending" || status === "In Progress") && isOverdue(dueDate, dueTime, at)) return "Not Done";
  return status;
}

async function assignmentsWithEmployeeNames(taskIds: number[]) {
  if (taskIds.length === 0) return [];
  const rows = await db
    .select({
      id: employeeTaskAssignments.id,
      taskId: employeeTaskAssignments.taskId,
      employeeId: employeeTaskAssignments.employeeId,
      employeeName: employees.fullName,
      status: employeeTaskAssignments.status,
      notDoneReason: employeeTaskAssignments.notDoneReason,
      progressNotes: employeeTaskAssignments.progressNotes,
      startedAt: employeeTaskAssignments.startedAt,
      completedAt: employeeTaskAssignments.completedAt,
      durationMs: employeeTaskAssignments.durationMs,
      createdAt: employeeTaskAssignments.createdAt,
      updatedAt: employeeTaskAssignments.updatedAt,
      dueDate: employeeTasks.dueDate,
      dueTime: employeeTasks.dueTime,
    })
    .from(employeeTaskAssignments)
    .innerJoin(employees, eq(employees.id, employeeTaskAssignments.employeeId))
    .innerJoin(employeeTasks, eq(employeeTasks.id, employeeTaskAssignments.taskId))
    .where(and(inArray(employeeTaskAssignments.taskId, taskIds), isNull(employeeTaskAssignments.deletedAt)));

  const now = new Date();
  return rows.map((r) => {
    const { dueDate, dueTime, ...rest } = r;
    return { ...rest, status: getEffectiveStatus(r.status, dueDate, dueTime, now) };
  });
}

async function departmentNamesById(): Promise<Map<number, string>> {
  const rows = await db.select({ id: departments.id, name: departments.name }).from(departments);
  return new Map(rows.map((d) => [d.id, d.name]));
}

// "Completed After Due Date" is still completed work — just late — so it counts toward
// completion-rate metrics (completedCount/completionPct/trend charts) everywhere "Completed"
// does. It gets its own bucket only in statusCounts, where the point is to show lateness.
const DONE_STATUSES = new Set(["Completed", "Completed After Due Date"]);

function withAggregate(
  task: typeof employeeTasks.$inferSelect,
  assignments: Awaited<ReturnType<typeof assignmentsWithEmployeeNames>>,
  deptNames: Map<number, string>
) {
  const mine = assignments.filter((a) => a.taskId === task.id);
  const completedCount = mine.filter((a) => DONE_STATUSES.has(a.status)).length;
  const notDoneCount = mine.filter((a) => a.status === "Not Done").length;
  const totalAssignees = mine.length;
  return {
    ...task,
    departmentName: task.departmentId ? deptNames.get(task.departmentId) ?? null : null,
    assignments: mine,
    totalAssignees,
    completedCount,
    notDoneCount,
    completionPct: totalAssignees > 0 ? Math.round((completedCount / totalAssignees) * 100) : 0,
  };
}

export async function listTasks(user: AccessTokenPayload, opts?: { employeeId?: number; departmentId?: number }) {
  const filterEmployeeId = opts?.employeeId;
  const filterDepartmentId = opts?.departmentId;
  const deptNames = await departmentNamesById();

  if (await canManageAllTasks(user)) {
    const taskConditions = [isNull(employeeTasks.deletedAt)];
    if (filterDepartmentId) taskConditions.push(eq(employeeTasks.departmentId, filterDepartmentId));
    const taskRows = await db.select().from(employeeTasks).where(and(...taskConditions)).orderBy(employeeTasks.createdAt);
    const taskIds = taskRows.map((t) => t.id);
    const assignments = await assignmentsWithEmployeeNames(taskIds);
    const filteredAssignments = filterEmployeeId ? assignments.filter((a) => a.employeeId === filterEmployeeId) : assignments;
    const taskIdsWithAssignments = filterEmployeeId ? [...new Set(filteredAssignments.map((a) => a.taskId))] : taskIds;
    const filteredTaskRows = filterEmployeeId
      ? taskRows.filter((t) => taskIdsWithAssignments.includes(t.id))
      : taskRows;
    return filteredTaskRows.map((t) => withAggregate(t, filteredAssignments, deptNames));
  }

  const employeeId = await getCallerEmployeeId(user.userId);
  if (!employeeId) return [];

  const myAssignments = await db
    .select({ taskId: employeeTaskAssignments.taskId })
    .from(employeeTaskAssignments)
    .where(and(eq(employeeTaskAssignments.employeeId, employeeId), isNull(employeeTaskAssignments.deletedAt)));
  const taskIds = [...new Set(myAssignments.map((a) => a.taskId))];
  if (taskIds.length === 0) return [];

  const taskConditions = [inArray(employeeTasks.id, taskIds), isNull(employeeTasks.deletedAt)];
  if (filterDepartmentId) taskConditions.push(eq(employeeTasks.departmentId, filterDepartmentId));
  const taskRows = await db.select().from(employeeTasks).where(and(...taskConditions));
  const assignments = await assignmentsWithEmployeeNames(taskIds);
  return taskRows.map((t) => withAggregate(t, assignments, deptNames));
}

async function isAssigneeOfTask(taskId: number, employeeId: number | null): Promise<boolean> {
  if (!employeeId) return false;
  const row = (
    await db
      .select({ id: employeeTaskAssignments.id })
      .from(employeeTaskAssignments)
      .where(
        and(
          eq(employeeTaskAssignments.taskId, taskId),
          eq(employeeTaskAssignments.employeeId, employeeId),
          isNull(employeeTaskAssignments.deletedAt)
        )
      )
      .limit(1)
  )[0];
  return !!row;
}

async function getTaskUnchecked(id: number) {
  const task = (await db.select().from(employeeTasks).where(and(eq(employeeTasks.id, id), isNull(employeeTasks.deletedAt))).limit(1))[0];
  if (!task) throw notFound("Task");
  const assignments = await assignmentsWithEmployeeNames([id]);
  const deptNames = await departmentNamesById();
  return withAggregate(task, assignments, deptNames);
}

export async function getTask(id: number, user: AccessTokenPayload) {
  if (!(await canManageAllTasks(user))) {
    const employeeId = await getCallerEmployeeId(user.userId);
    if (!(await isAssigneeOfTask(id, employeeId))) throw forbidden();
  }
  return getTaskUnchecked(id);
}

export async function createTask(input: CreateTaskInput, creatorUserId: number) {
  const taskCode = nextCode("employee_tasks", "task_code", "ETSK", 4);

  const { task, assignmentRows } = db.transaction((tx) => {
    const [row] = tx
      .insert(employeeTasks)
      .values({
        taskCode,
        title: input.title,
        description: input.description,
        priority: input.priority,
        dueDate: input.dueDate,
        dueTime: input.dueTime,
        departmentId: input.departmentId,
        createdBy: creatorUserId,
      })
      .returning()
      .all();

    const rows = tx
      .insert(employeeTaskAssignments)
      .values(input.assigneeIds.map((employeeId) => ({ taskId: row.id, employeeId, status: "Pending" as const })))
      .returning()
      .all();

    return { task: row, assignmentRows: rows };
  });

  await writeAudit({ userId: creatorUserId, entityType: "employee-tasks", entityId: task.id, action: "create", after: task });

  // Notify each assignee that has a login — best-effort, not part of the write transaction above.
  const loginRows = await db
    .select({ id: users.id, employeeId: users.employeeId })
    .from(users)
    .where(inArray(users.employeeId, assignmentRows.map((a) => a.employeeId)));
  if (loginRows.length > 0) {
    await db.insert(notifications).values(
      loginRows.map((u) => ({
        userId: u.id,
        type: "task_assigned",
        title: `New task assigned: ${task.title}`,
        link: "/my-tasks",
      }))
    );
  }

  return getTaskUnchecked(task.id);
}

export async function updateTask(id: number, input: UpdateTaskInput, userId: number) {
  const before = (await db.select().from(employeeTasks).where(and(eq(employeeTasks.id, id), isNull(employeeTasks.deletedAt))).limit(1))[0];
  if (!before) throw notFound("Task");

  const { title, description, priority, dueDate, dueTime, departmentId, assigneeIds } = input;
  const columnUpdates: Partial<typeof employeeTasks.$inferInsert> = { updatedAt: new Date() };
  if (title !== undefined) columnUpdates.title = title;
  if (description !== undefined) columnUpdates.description = description;
  if (priority !== undefined) columnUpdates.priority = priority;
  if (dueDate !== undefined) columnUpdates.dueDate = dueDate;
  if (dueTime !== undefined) columnUpdates.dueTime = dueTime;
  if (departmentId !== undefined) columnUpdates.departmentId = departmentId;

  db.transaction((tx) => {
    tx.update(employeeTasks).set(columnUpdates).where(eq(employeeTasks.id, id)).run();

    if (assigneeIds) {
      const current = tx
        .select()
        .from(employeeTaskAssignments)
        .where(and(eq(employeeTaskAssignments.taskId, id), isNull(employeeTaskAssignments.deletedAt)))
        .all();
      const currentEmployeeIds = new Set(current.map((a) => a.employeeId));
      const nextEmployeeIds = new Set(assigneeIds);

      const toRemove = current.filter((a) => !nextEmployeeIds.has(a.employeeId));
      const toAdd = assigneeIds.filter((eid) => !currentEmployeeIds.has(eid));

      for (const row of toRemove) {
        tx.update(employeeTaskAssignments).set({ deletedAt: new Date() }).where(eq(employeeTaskAssignments.id, row.id)).run();
      }
      if (toAdd.length > 0) {
        tx.insert(employeeTaskAssignments)
          .values(toAdd.map((employeeId) => ({ taskId: id, employeeId, status: "Pending" as const })))
          .run();
      }
    }
  });

  const after = (await db.select().from(employeeTasks).where(eq(employeeTasks.id, id)).limit(1))[0];
  await writeAudit({ userId, entityType: "employee-tasks", entityId: id, action: "update", before, after });
  return getTaskUnchecked(id);
}

export async function deleteTask(id: number, userId: number) {
  const before = (await db.select().from(employeeTasks).where(and(eq(employeeTasks.id, id), isNull(employeeTasks.deletedAt))).limit(1))[0];
  if (!before) throw notFound("Task");

  db.transaction((tx) => {
    tx.update(employeeTasks).set({ deletedAt: new Date() }).where(eq(employeeTasks.id, id)).run();
    tx.update(employeeTaskAssignments).set({ deletedAt: new Date() }).where(eq(employeeTaskAssignments.taskId, id)).run();
  });

  await writeAudit({ userId, entityType: "employee-tasks", entityId: id, action: "delete", before });
}

async function getAssignmentOrThrow(assignmentId: number) {
  const row = (
    await db.select().from(employeeTaskAssignments).where(and(eq(employeeTaskAssignments.id, assignmentId), isNull(employeeTaskAssignments.deletedAt))).limit(1)
  )[0];
  if (!row) throw notFound("Task assignment");
  return row;
}

export async function authorizeAssignmentAccess(assignment: typeof employeeTaskAssignments.$inferSelect, user: AccessTokenPayload) {
  if (await canManageAllTasks(user)) return;
  const employeeId = await getCallerEmployeeId(user.userId);
  if (employeeId !== assignment.employeeId) throw forbidden();
}

// Exported so attachments.routes.ts can authorize voice-note/file uploads scoped to a single
// ticket (assignment), the same way comments already are — see authorizeAssignmentAccess above.
export async function getAssignmentForAccessCheck(assignmentId: number) {
  return getAssignmentOrThrow(assignmentId);
}

// Deliberately NOT gated by requirePermission('employee-tasks','update') — that permission
// models "can this role manage other people's tasks." This is the employee's own self-service
// action on their own row, authorized by "are you the assignee" instead.
export async function updateAssignmentStatus(assignmentId: number, user: AccessTokenPayload, input: UpdateAssignmentStatusInput) {
  const before = await getAssignmentOrThrow(assignmentId);
  await authorizeAssignmentAccess(before, user);

  const task = (await db.select().from(employeeTasks).where(eq(employeeTasks.id, before.taskId)).limit(1))[0];

  // Determine timestamps
  let startedAtVal: Date | null = before.startedAt ? new Date(before.startedAt) : null;
  let completedAtVal: Date | null = null;
  let durationMsVal: number | null = null;

  if (input.status === "In Progress") {
    if (!startedAtVal) startedAtVal = new Date();
  }

  // The client only ever requests "Completed" — the server decides whether the ticket was
  // finished on time or landed in the late bucket, based on the parent task's due date. An
  // employee completing a ticket that already auto-flipped to "Not Done" also lands here, and
  // per the "never falls back to plain Completed once overdue" rule, that's still late.
  let persistedStatus: string = input.status;
  if (input.status === "Completed") {
    completedAtVal = new Date();
    const started = startedAtVal ? startedAtVal : before.startedAt ? new Date(before.startedAt) : null;
    if (started) durationMsVal = completedAtVal.getTime() - started.getTime();
    if (isOverdue(task?.dueDate ?? null, task?.dueTime ?? null, completedAtVal)) persistedStatus = "Completed After Due Date";
  }

  const [after] = await db
    .update(employeeTaskAssignments)
    .set({
      status: persistedStatus,
      notDoneReason: input.status === "Not Done" ? input.notDoneReason : null,
      progressNotes: input.progressNotes ?? before.progressNotes,
      startedAt: startedAtVal,
      completedAt: completedAtVal,
      durationMs: durationMsVal,
      updatedAt: new Date(),
    })
    .where(eq(employeeTaskAssignments.id, assignmentId))
    .returning();

  const noteBody = input.status === "Not Done" ? input.notDoneReason : input.progressNotes;
  if (noteBody) {
    await db.insert(comments).values({ entityType: "employee-task-assignment", entityId: assignmentId, userId: user.userId, body: noteBody });
  }

  if (task) {
    await db.insert(notifications).values({
      userId: task.createdBy,
      type: "task_status_changed",
      title: `Status updated to "${persistedStatus}": ${task.title}`,
      link: "/employee-tasks",
    });
  }

  await writeAudit({ userId: user.userId, entityType: "employee-task-assignment", entityId: assignmentId, action: "update", before, after });
  return after;
}

const AUTO_NOT_DONE_REASON = "Automatically marked Not Done — due date passed without completion.";

// Persists the overdue transition that getEffectiveStatus() already reflects on every read.
// Runs on a timer (see jobs/overdueTaskSweep.job.ts) so status history, audit log, and
// notifications stay accurate even for tickets nobody happens to view around their due date.
export async function sweepOverdueTasks(): Promise<number> {
  const now = new Date();
  const candidates = await db
    .select({
      id: employeeTaskAssignments.id,
      taskId: employeeTaskAssignments.taskId,
      taskTitle: employeeTasks.title,
      taskCreatedBy: employeeTasks.createdBy,
      dueDate: employeeTasks.dueDate,
      dueTime: employeeTasks.dueTime,
    })
    .from(employeeTaskAssignments)
    .innerJoin(employeeTasks, eq(employeeTasks.id, employeeTaskAssignments.taskId))
    .where(
      and(
        inArray(employeeTaskAssignments.status, ["Pending", "In Progress"]),
        isNull(employeeTaskAssignments.deletedAt),
        isNull(employeeTasks.deletedAt)
      )
    );

  const overdue = candidates.filter((c) => isOverdue(c.dueDate, c.dueTime, now));
  if (overdue.length === 0) return 0;

  for (const c of overdue) {
    const before = await getAssignmentOrThrow(c.id);
    const [after] = await db
      .update(employeeTaskAssignments)
      .set({ status: "Not Done", notDoneReason: AUTO_NOT_DONE_REASON, updatedAt: now })
      .where(eq(employeeTaskAssignments.id, c.id))
      .returning();
    await writeAudit({ userId: null, entityType: "employee-task-assignment", entityId: c.id, action: "update", before, after });
  }

  const notifiedTaskIds = [...new Set(overdue.map((c) => c.taskId))];
  const taskById = new Map(overdue.map((c) => [c.taskId, c]));
  await db.insert(notifications).values(
    notifiedTaskIds.map((taskId) => {
      const c = taskById.get(taskId)!;
      return {
        userId: c.taskCreatedBy,
        type: "task_status_changed" as const,
        title: `Status updated to "Not Done": ${c.taskTitle}`,
        link: "/employee-tasks",
      };
    })
  );

  return overdue.length;
}

export async function listComments(assignmentId: number, user: AccessTokenPayload) {
  const assignment = await getAssignmentOrThrow(assignmentId);
  await authorizeAssignmentAccess(assignment, user);
  return db
    .select({ id: comments.id, body: comments.body, userId: comments.userId, userEmail: users.email, createdAt: comments.createdAt })
    .from(comments)
    .innerJoin(users, eq(users.id, comments.userId))
    .where(and(eq(comments.entityType, "employee-task-assignment"), eq(comments.entityId, assignmentId)))
    .orderBy(comments.createdAt);
}

export async function addComment(assignmentId: number, user: AccessTokenPayload, body: string) {
  const assignment = await getAssignmentOrThrow(assignmentId);
  await authorizeAssignmentAccess(assignment, user);
  const [row] = await db
    .insert(comments)
    .values({ entityType: "employee-task-assignment", entityId: assignmentId, userId: user.userId, body })
    .returning();
  return row;
}

export async function getStats(user: AccessTokenPayload, opts?: { employeeId?: number }) {
  const manageAll = await canViewAllTaskStats(user);
  const requestedEmployeeId = opts?.employeeId;
  const employeeId = manageAll ? requestedEmployeeId ?? null : await getCallerEmployeeId(user.userId);
  if (!manageAll && !employeeId) {
    return {
      totalTasks: 0,
      statusCounts: { Pending: 0, "In Progress": 0, Completed: 0, "Not Done": 0, "Completed After Due Date": 0 },
      completionPct: 0,
      overdueCount: 0,
      employeeCompletion: [],
      monthlyTrend: [],
      weeklyTrend: [],
    };
  }

  const scopeCondition = employeeId
    ? and(isNull(employeeTaskAssignments.deletedAt), eq(employeeTaskAssignments.employeeId, employeeId))
    : isNull(employeeTaskAssignments.deletedAt);

  const rawRows = await db
    .select({
      id: employeeTaskAssignments.id,
      employeeId: employeeTaskAssignments.employeeId,
      employeeName: employees.fullName,
      status: employeeTaskAssignments.status,
      completedAt: employeeTaskAssignments.completedAt,
      dueDate: employeeTasks.dueDate,
      dueTime: employeeTasks.dueTime,
    })
    .from(employeeTaskAssignments)
    .innerJoin(employees, eq(employees.id, employeeTaskAssignments.employeeId))
    .innerJoin(employeeTasks, eq(employeeTasks.id, employeeTaskAssignments.taskId))
    .where(and(scopeCondition, isNull(employeeTasks.deletedAt)));

  const now = new Date();
  const rows = rawRows.map((r) => ({ ...r, status: getEffectiveStatus(r.status, r.dueDate, r.dueTime, now) }));

  const statusCounts = {
    Pending: 0,
    "In Progress": 0,
    Completed: 0,
    "Not Done": 0,
    "Completed After Due Date": 0,
  } as Record<string, number>;
  for (const r of rows) statusCounts[r.status] = (statusCounts[r.status] ?? 0) + 1;

  const overdueCount = rows.filter((r) => r.dueDate && isOverdue(r.dueDate, r.dueTime, now) && !DONE_STATUSES.has(r.status)).length;

  const byEmployee = new Map<string, { employeeId: number; employeeName: string; total: number; completed: number }>();
  for (const r of rows) {
    const key = String(r.employeeId);
    const bucket = byEmployee.get(key) ?? { employeeId: r.employeeId, employeeName: r.employeeName, total: 0, completed: 0 };
    bucket.total += 1;
    if (DONE_STATUSES.has(r.status)) bucket.completed += 1;
    byEmployee.set(key, bucket);
  }
  const employeeCompletion = [...byEmployee.values()].map((b) => ({
    ...b,
    completionPct: b.total > 0 ? Math.round((b.completed / b.total) * 100) : 0,
  }));

  const monthlyBuckets = new Map<string, number>();
  const weeklyBuckets = new Map<string, number>();
  for (const r of rows) {
    if (!DONE_STATUSES.has(r.status) || !r.completedAt) continue;
    const d = new Date(r.completedAt);
    const monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    monthlyBuckets.set(monthKey, (monthlyBuckets.get(monthKey) ?? 0) + 1);
    const jan1 = new Date(d.getFullYear(), 0, 1);
    const week = Math.ceil(((d.getTime() - jan1.getTime()) / 86_400_000 + jan1.getDay() + 1) / 7);
    const weekKey = `${d.getFullYear()}-W${String(week).padStart(2, "0")}`;
    weeklyBuckets.set(weekKey, (weeklyBuckets.get(weekKey) ?? 0) + 1);
  }

  const total = rows.length;
  const completed = statusCounts.Completed + statusCounts["Completed After Due Date"];

  return {
    totalTasks: total,
    statusCounts,
    completionPct: total > 0 ? Math.round((completed / total) * 100) : 0,
    overdueCount,
    employeeCompletion: employeeCompletion.sort((a, b) => b.completionPct - a.completionPct),
    monthlyTrend: [...monthlyBuckets.entries()].sort(([a], [b]) => (a < b ? -1 : 1)).map(([month, count]) => ({ month, count })),
    weeklyTrend: [...weeklyBuckets.entries()].sort(([a], [b]) => (a < b ? -1 : 1)).map(([week, count]) => ({ week, count })),
  };
}

export async function isEmployeeTaskAssignee(user: AccessTokenPayload, taskId: number): Promise<boolean> {
  const employeeId = await getCallerEmployeeId(user.userId);
  return isAssigneeOfTask(taskId, employeeId);
}
