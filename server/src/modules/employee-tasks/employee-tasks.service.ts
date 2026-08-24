import { db } from "../../db/client";
import { employeeTasks, employeeTaskAssignments, employees, users, comments, notifications, departments, auditLog, roles, userRoles } from "../../db/schema";
import { eq, and, isNull, isNotNull, inArray, desc, SQL } from "drizzle-orm";
import { notFound, forbidden } from "../../middleware/errorHandler.middleware";
import { writeAudit } from "../../lib/audit";
import { nextCode } from "../../lib/codeGenerator";
import { userHasPermission } from "../../middleware/rbac.middleware";
import { AccessTokenPayload } from "../../lib/jwt";
import { CreateTaskInput, UpdateTaskInput, UpdateAssignmentStatusInput } from "./employee-tasks.schema";
import { notifyTaskAssignment } from "./taskNotifications";

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

// Resolves the department a DepartmentHead heads up, via their own employee record — mirrors the
// same "caller employeeId -> departmentId" lookup scopeResolver.ts already uses for projects.
async function getCallerDepartmentId(userId: number): Promise<number | null> {
  const employeeId = await getCallerEmployeeId(userId);
  if (!employeeId) return null;
  const row = (await db.select({ departmentId: employees.departmentId }).from(employees).where(eq(employees.id, employeeId)).limit(1))[0];
  return row?.departmentId ?? null;
}

// The employee ids that make up a DepartmentHead's own team (their department, excluding no one
// — the head themselves may or may not have a row in the roster; either way this is exactly "who
// they're allowed to see/assign work to").
export async function getTeamEmployeeIds(departmentId: number): Promise<number[]> {
  const rows = await db.select({ id: employees.id }).from(employees).where(and(eq(employees.departmentId, departmentId), isNull(employees.deletedAt)));
  return rows.map((r) => r.id);
}

export async function isDepartmentHead(user: AccessTokenPayload): Promise<boolean> {
  return user.roles.includes("DepartmentHead");
}

// "My Teams" screen data: the head's own department's other employees, each with a rollup of
// their current ticket statuses. Excludes the head's own employee row — they're the one viewing
// the team, not a member of it.
export async function getMyTeam(user: AccessTokenPayload) {
  const departmentId = await getCallerDepartmentId(user.userId);
  if (!departmentId) return { departmentId: null, departmentName: null, members: [] };

  const callerEmployeeId = await getCallerEmployeeId(user.userId);
  const deptNames = await departmentNamesById();

  const teamRows = await db
    .select()
    .from(employees)
    .where(and(eq(employees.departmentId, departmentId), isNull(employees.deletedAt)));
  const members = teamRows.filter((e) => e.id !== callerEmployeeId);
  if (members.length === 0) {
    return { departmentId, departmentName: deptNames.get(departmentId) ?? null, members: [] };
  }

  const memberIds = members.map((m) => m.id);
  const assignmentRows = await db
    .select({
      employeeId: employeeTaskAssignments.employeeId,
      status: employeeTaskAssignments.status,
      dueDate: employeeTasks.dueDate,
      dueTime: employeeTasks.dueTime,
    })
    .from(employeeTaskAssignments)
    .innerJoin(employeeTasks, eq(employeeTasks.id, employeeTaskAssignments.taskId))
    .where(
      and(
        inArray(employeeTaskAssignments.employeeId, memberIds),
        isNull(employeeTaskAssignments.deletedAt),
        isNull(employeeTasks.deletedAt)
      )
    );

  const now = new Date();
  const statusByEmployee = new Map<number, Record<string, number>>();
  for (const row of assignmentRows) {
    const effective = getEffectiveStatus(row.status, row.dueDate, row.dueTime, now);
    const bucket = statusByEmployee.get(row.employeeId) ?? { Pending: 0, "In Progress": 0, Completed: 0, "Not Done": 0, "Completed After Due Date": 0 };
    bucket[effective] = (bucket[effective] ?? 0) + 1;
    statusByEmployee.set(row.employeeId, bucket);
  }

  return {
    departmentId,
    departmentName: deptNames.get(departmentId) ?? null,
    members: members.map((m) => ({
      id: m.id,
      fullName: m.fullName,
      roleTitle: m.roleTitle,
      email: m.email,
      statusCounts: statusByEmployee.get(m.id) ?? { Pending: 0, "In Progress": 0, Completed: 0, "Not Done": 0, "Completed After Due Date": 0 },
    })),
  };
}

// Admin/CEO-only company-wide view: every department, its head (if any), and that department's
// team with the same per-member ticket-status rollup MyTeamPage already shows a DepartmentHead
// for their own department — generalized here across all departments in one page.
export async function getAllDepartmentTeams(user: AccessTokenPayload) {
  if (!user.roles.includes("Admin") && !user.roles.includes("CEO")) throw forbidden();

  const deptRows = await db.select({ id: departments.id, name: departments.name }).from(departments);
  if (deptRows.length === 0) return [];

  const headRows = await db
    .select({ departmentId: employees.departmentId, headName: employees.fullName })
    .from(employees)
    .innerJoin(users, eq(users.employeeId, employees.id))
    .innerJoin(userRoles, eq(userRoles.userId, users.id))
    .innerJoin(roles, eq(roles.id, userRoles.roleId))
    .where(and(eq(roles.name, "DepartmentHead"), isNull(employees.deletedAt)));
  const headNameByDept = new Map<number, string>();
  for (const row of headRows) {
    if (row.departmentId !== null) headNameByDept.set(row.departmentId, row.headName);
  }

  const allEmployees = await db.select().from(employees).where(isNull(employees.deletedAt));
  const employeesByDept = new Map<number, typeof allEmployees>();
  for (const emp of allEmployees) {
    if (emp.departmentId === null) continue;
    const list = employeesByDept.get(emp.departmentId) ?? [];
    list.push(emp);
    employeesByDept.set(emp.departmentId, list);
  }

  const allEmployeeIds = allEmployees.map((e) => e.id);
  const assignmentRows = allEmployeeIds.length
    ? await db
        .select({
          employeeId: employeeTaskAssignments.employeeId,
          status: employeeTaskAssignments.status,
          dueDate: employeeTasks.dueDate,
          dueTime: employeeTasks.dueTime,
        })
        .from(employeeTaskAssignments)
        .innerJoin(employeeTasks, eq(employeeTasks.id, employeeTaskAssignments.taskId))
        .where(
          and(
            inArray(employeeTaskAssignments.employeeId, allEmployeeIds),
            isNull(employeeTaskAssignments.deletedAt),
            isNull(employeeTasks.deletedAt)
          )
        )
    : [];

  const now = new Date();
  const statusByEmployee = new Map<number, Record<string, number>>();
  for (const row of assignmentRows) {
    const effective = getEffectiveStatus(row.status, row.dueDate, row.dueTime, now);
    const bucket = statusByEmployee.get(row.employeeId) ?? { Pending: 0, "In Progress": 0, Completed: 0, "Not Done": 0, "Completed After Due Date": 0 };
    bucket[effective] = (bucket[effective] ?? 0) + 1;
    statusByEmployee.set(row.employeeId, bucket);
  }

  return deptRows.map((dept) => ({
    departmentId: dept.id,
    departmentName: dept.name,
    headName: headNameByDept.get(dept.id) ?? null,
    members: (employeesByDept.get(dept.id) ?? []).map((m) => ({
      id: m.id,
      fullName: m.fullName,
      roleTitle: m.roleTitle,
      email: m.email,
      statusCounts: statusByEmployee.get(m.id) ?? { Pending: 0, "In Progress": 0, Completed: 0, "Not Done": 0, "Completed After Due Date": 0 },
    })),
  }));
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

export async function listTasks(user: AccessTokenPayload, opts?: { employeeId?: number; departmentId?: number; viewScope?: "all" | "my-team" }) {
  const filterEmployeeId = opts?.employeeId;
  const filterDepartmentId = opts?.departmentId;
  const deptNames = await departmentNamesById();

  // Some seeded accounts (e.g. Asad Ali) hold Admin/CEO *and* DepartmentHead at once — a real
  // person who legitimately wants both "see everything" and "see just my team" views depending
  // on context. viewScope=all is how that person opts into the Admin/CEO-wide view instead of
  // silently falling into the DepartmentHead branch below.
  //
  // Deliberately checks user.roles directly rather than canManageAllTasks(), which only tests
  // the "employee-tasks:create" permission — DepartmentHead is *also* granted that permission (so
  // they can raise tickets for their own team), so canManageAllTasks() alone can't tell a real
  // Admin/CEO apart from a plain DepartmentHead. Using it here let any DepartmentHead pass
  // viewScope=all and see every other department's tickets, not just their own.
  const wantsAllView = opts?.viewScope === "all" && (user.roles.includes("Admin") || user.roles.includes("CEO"));

  // DepartmentHead is checked before canManageAllTasks even though they now also hold the
  // "employee-tasks:create" grant (needed so they can raise tickets) — without this ordering
  // they'd fall into the "sees everything" branch below and see every department's tickets,
  // not just their own team's. wantsAllView above is the one explicit escape hatch from that.
  if (!wantsAllView && (await isDepartmentHead(user))) {
    const departmentId = await getCallerDepartmentId(user.userId);
    if (!departmentId) return [];
    const teamEmployeeIds = await getTeamEmployeeIds(departmentId);
    if (teamEmployeeIds.length === 0) return [];

    const teamAssignments = await db
      .select({ taskId: employeeTaskAssignments.taskId })
      .from(employeeTaskAssignments)
      .where(and(inArray(employeeTaskAssignments.employeeId, teamEmployeeIds), isNull(employeeTaskAssignments.deletedAt)));
    const taskIds = [...new Set(teamAssignments.map((a) => a.taskId))];
    if (taskIds.length === 0) return [];

    const taskConditions = [inArray(employeeTasks.id, taskIds), isNull(employeeTasks.deletedAt)];
    if (filterDepartmentId) taskConditions.push(eq(employeeTasks.departmentId, filterDepartmentId));
    const taskRows = await db.select().from(employeeTasks).where(and(...taskConditions)).orderBy(employeeTasks.createdAt);
    const allAssignments = await assignmentsWithEmployeeNames(taskRows.map((t) => t.id));
    // Only show the team members' own assignment rows on each task, even if other departments
    // are also assigned to the same task — keeps the head's view scoped to "my team's work."
    const teamAssignmentsOnly = allAssignments.filter((a) => teamEmployeeIds.includes(a.employeeId));
    const filteredAssignments = filterEmployeeId ? teamAssignmentsOnly.filter((a) => a.employeeId === filterEmployeeId) : teamAssignmentsOnly;
    const visibleTaskIds = filterEmployeeId ? [...new Set(filteredAssignments.map((a) => a.taskId))] : taskIds;
    return taskRows.filter((t) => visibleTaskIds.includes(t.id)).map((t) => withAggregate(t, filteredAssignments, deptNames));
  }

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

async function isTeamTask(taskId: number, teamEmployeeIds: number[]): Promise<boolean> {
  if (teamEmployeeIds.length === 0) return false;
  const row = (
    await db
      .select({ id: employeeTaskAssignments.id })
      .from(employeeTaskAssignments)
      .where(
        and(
          eq(employeeTaskAssignments.taskId, taskId),
          inArray(employeeTaskAssignments.employeeId, teamEmployeeIds),
          isNull(employeeTaskAssignments.deletedAt)
        )
      )
      .limit(1)
  )[0];
  return !!row;
}

export async function getTask(id: number, user: AccessTokenPayload) {
  // Checked ahead of canManageAllTasks for the same reason as listTasks — DepartmentHead now
  // holds "employee-tasks:create" (so they can raise tickets) but must still be confined to
  // their own team's tickets, not every task in the system.
  if (await isDepartmentHead(user)) {
    const departmentId = await getCallerDepartmentId(user.userId);
    const teamEmployeeIds = departmentId ? await getTeamEmployeeIds(departmentId) : [];
    if (!(await isTeamTask(id, teamEmployeeIds))) throw forbidden();
  } else if (!(await canManageAllTasks(user))) {
    const employeeId = await getCallerEmployeeId(user.userId);
    if (!(await isAssigneeOfTask(id, employeeId))) throw forbidden();
  }
  return getTaskUnchecked(id);
}

// A DepartmentHead may only assign tickets to members of their own team — enforced here (not
// just hidden in the UI) so the restriction holds even if someone calls the API directly.
// Admin/other roles with the "employee-tasks:create|update" grant are unrestricted, matching
// existing behavior for everyone but DepartmentHead.
async function assertAssigneesWithinDepartment(user: AccessTokenPayload, assigneeIds: number[]) {
  if (!(await isDepartmentHead(user))) return;
  const departmentId = await getCallerDepartmentId(user.userId);
  const teamEmployeeIds = departmentId ? await getTeamEmployeeIds(departmentId) : [];
  const outsideTeam = assigneeIds.some((id) => !teamEmployeeIds.includes(id));
  if (outsideTeam) throw forbidden("You can only assign tickets to members of your own team");
}

export async function createTask(input: CreateTaskInput, creator: AccessTokenPayload) {
  const creatorUserId = creator.userId;
  await assertAssigneesWithinDepartment(creator, input.assigneeIds);
  const taskCode = await nextCode("employee_tasks", "task_code", "ETSK", 4);

  const { task, assignmentRows } = await db.transaction(async (tx) => {
    const [row] = await tx
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
      .returning();

    const rows = await tx
      .insert(employeeTaskAssignments)
      .values(input.assigneeIds.map((employeeId) => ({ taskId: row.id, employeeId, status: "Pending" as const })))
      .returning();

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

  await notifyTaskAssignment({
    taskCode: task.taskCode,
    title: task.title,
    description: task.description,
    priority: task.priority,
    dueDate: task.dueDate,
    dueTime: task.dueTime,
    departmentId: task.departmentId,
    assignments: assignmentRows.map((a) => ({ employeeId: a.employeeId, assignmentId: a.id })),
  });

  return getTaskUnchecked(task.id);
}

export async function updateTask(id: number, input: UpdateTaskInput, user: AccessTokenPayload) {
  const userId = user.userId;
  const before = (await db.select().from(employeeTasks).where(and(eq(employeeTasks.id, id), isNull(employeeTasks.deletedAt))).limit(1))[0];
  if (!before) throw notFound("Task");

  const { title, description, priority, dueDate, dueTime, departmentId, assigneeIds } = input;
  if (assigneeIds) await assertAssigneesWithinDepartment(user, assigneeIds);
  const columnUpdates: Partial<typeof employeeTasks.$inferInsert> = { updatedAt: new Date() };
  if (title !== undefined) columnUpdates.title = title;
  if (description !== undefined) columnUpdates.description = description;
  if (priority !== undefined) columnUpdates.priority = priority;
  if (dueDate !== undefined) columnUpdates.dueDate = dueDate;
  if (dueTime !== undefined) columnUpdates.dueTime = dueTime;
  if (departmentId !== undefined) columnUpdates.departmentId = departmentId;

  await db.transaction(async (tx) => {
    await tx.update(employeeTasks).set(columnUpdates).where(eq(employeeTasks.id, id));

    if (assigneeIds) {
      const current = await tx
        .select()
        .from(employeeTaskAssignments)
        .where(and(eq(employeeTaskAssignments.taskId, id), isNull(employeeTaskAssignments.deletedAt)));
      const currentEmployeeIds = new Set(current.map((a) => a.employeeId));
      const nextEmployeeIds = new Set(assigneeIds);

      const toRemove = current.filter((a) => !nextEmployeeIds.has(a.employeeId));
      const toAdd = assigneeIds.filter((eid) => !currentEmployeeIds.has(eid));

      for (const row of toRemove) {
        await tx.update(employeeTaskAssignments).set({ deletedAt: new Date() }).where(eq(employeeTaskAssignments.id, row.id));
      }
      if (toAdd.length > 0) {
        await tx.insert(employeeTaskAssignments)
          .values(toAdd.map((employeeId) => ({ taskId: id, employeeId, status: "Pending" as const })));
      }
    }
  });

  const after = (await db.select().from(employeeTasks).where(eq(employeeTasks.id, id)).limit(1))[0];
  await writeAudit({ userId, entityType: "employee-tasks", entityId: id, action: "update", before, after });
  return getTaskUnchecked(id);
}

export async function deleteTask(id: number, userId: number, reason: string) {
  const before = (await db.select().from(employeeTasks).where(and(eq(employeeTasks.id, id), isNull(employeeTasks.deletedAt))).limit(1))[0];
  if (!before) throw notFound("Task");

  await db.transaction(async (tx) => {
    await tx.update(employeeTasks).set({ deletedAt: new Date() }).where(eq(employeeTasks.id, id));
    await tx.update(employeeTaskAssignments).set({ deletedAt: new Date() }).where(eq(employeeTaskAssignments.taskId, id));
  });

  await writeAudit({ userId, entityType: "employee-tasks", entityId: id, action: "delete", before, reason });
}

// Admin/CEO-only history of soft-deleted tasks — who deleted each one, when, and why. Reuses the
// same auditLog rows writeAudit() already writes on delete rather than adding a parallel trail.
export async function listDeletedTasks(user: AccessTokenPayload) {
  if (!user.roles.includes("Admin") && !user.roles.includes("CEO")) throw forbidden();

  const deletedTasks = await db
    .select()
    .from(employeeTasks)
    .where(isNotNull(employeeTasks.deletedAt))
    .orderBy(desc(employeeTasks.deletedAt));
  if (deletedTasks.length === 0) return [];

  const taskIds = deletedTasks.map((t) => t.id);
  const auditRows = await db
    .select({
      entityId: auditLog.entityId,
      reason: auditLog.reason,
      createdAt: auditLog.createdAt,
      deletedByName: employees.fullName,
    })
    .from(auditLog)
    .leftJoin(users, eq(users.id, auditLog.userId))
    .leftJoin(employees, eq(employees.id, users.employeeId))
    .where(and(eq(auditLog.entityType, "employee-tasks"), eq(auditLog.action, "delete"), inArray(auditLog.entityId, taskIds)))
    .orderBy(desc(auditLog.createdAt));

  // Latest delete-audit row per task, in case a task id was ever reused (defensive — ids aren't
  // recycled in practice, but this keeps the lookup correct if that ever changes).
  const latestAuditByTaskId = new Map<number, (typeof auditRows)[number]>();
  for (const row of auditRows) {
    if (!latestAuditByTaskId.has(row.entityId)) latestAuditByTaskId.set(row.entityId, row);
  }

  const departmentIds = [...new Set(deletedTasks.map((t) => t.departmentId).filter((id): id is number => id !== null))];
  const departmentRows = departmentIds.length
    ? await db.select({ id: departments.id, name: departments.name }).from(departments).where(inArray(departments.id, departmentIds))
    : [];
  const departmentNameById = new Map(departmentRows.map((d) => [d.id, d.name]));

  // deleteTask() soft-deletes the assignment rows alongside the task itself, so they're fetched
  // here without an isNull(deletedAt) filter — that's expected for every row on a deleted task,
  // not a sign anything else went wrong.
  const assigneeRows = await db
    .select({ taskId: employeeTaskAssignments.taskId, employeeName: employees.fullName })
    .from(employeeTaskAssignments)
    .innerJoin(employees, eq(employees.id, employeeTaskAssignments.employeeId))
    .where(inArray(employeeTaskAssignments.taskId, taskIds));
  const assigneeNamesByTaskId = new Map<number, string[]>();
  for (const row of assigneeRows) {
    const list = assigneeNamesByTaskId.get(row.taskId) ?? [];
    list.push(row.employeeName);
    assigneeNamesByTaskId.set(row.taskId, list);
  }

  return deletedTasks.map((task) => {
    const audit = latestAuditByTaskId.get(task.id);
    const assigneeNames = assigneeNamesByTaskId.get(task.id) ?? [];
    return {
      id: task.id,
      taskCode: task.taskCode,
      title: task.title,
      departmentName: task.departmentId ? departmentNameById.get(task.departmentId) ?? "—" : "—",
      priority: task.priority,
      dueDate: task.dueDate,
      assignedTo: assigneeNames.length > 0 ? assigneeNames.join(", ") : "—",
      deletedAt: task.deletedAt,
      deletedByName: audit?.deletedByName ?? "—",
      reason: audit?.reason ?? "—",
    };
  });
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

const EMPTY_STATS = {
  totalTasks: 0,
  statusCounts: { Pending: 0, "In Progress": 0, Completed: 0, "Not Done": 0, "Completed After Due Date": 0 },
  completionPct: 0,
  overdueCount: 0,
  employeeCompletion: [],
  monthlyTrend: [],
  weeklyTrend: [],
};

export async function getStats(user: AccessTokenPayload, opts?: { employeeId?: number; viewScope?: "all" | "my-team" }) {
  const requestedEmployeeId = opts?.employeeId;

  // See listTasks()'s wantsAllView for why this checks roles directly rather than
  // canManageAllTasks()/canViewAllTaskStats() — DepartmentHead also passes those, so either would
  // let a plain DepartmentHead escape their team scope via viewScope=all.
  const wantsAllView = opts?.viewScope === "all" && (user.roles.includes("Admin") || user.roles.includes("CEO"));

  // DepartmentHead's "manage all" grant (needed to raise tickets) must not translate into
  // company-wide analytics — scope to the team instead, same as listTasks/getTask above.
  if (!wantsAllView && (await isDepartmentHead(user))) {
    const departmentId = await getCallerDepartmentId(user.userId);
    const teamEmployeeIds = departmentId ? await getTeamEmployeeIds(departmentId) : [];
    if (teamEmployeeIds.length === 0) return EMPTY_STATS;
    if (requestedEmployeeId && !teamEmployeeIds.includes(requestedEmployeeId)) return EMPTY_STATS;
    const scopeIds = requestedEmployeeId ? [requestedEmployeeId] : teamEmployeeIds;
    return computeStats(inArray(employeeTaskAssignments.employeeId, scopeIds));
  }

  const manageAll = await canViewAllTaskStats(user);
  const employeeId = manageAll ? requestedEmployeeId ?? null : await getCallerEmployeeId(user.userId);
  if (!manageAll && !employeeId) return EMPTY_STATS;

  const scopeCondition = employeeId ? eq(employeeTaskAssignments.employeeId, employeeId) : undefined;
  return computeStats(scopeCondition);
}

async function computeStats(employeeScopeCondition: SQL | undefined) {
  const scopeCondition = employeeScopeCondition
    ? and(isNull(employeeTaskAssignments.deletedAt), employeeScopeCondition)
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
