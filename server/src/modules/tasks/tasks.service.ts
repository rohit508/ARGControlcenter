import { db } from "../../db/client";
import { tasks } from "../../db/schema";
import { eq, and, isNull } from "drizzle-orm";
import { notFound } from "../../middleware/errorHandler.middleware";
import { writeAudit } from "../../lib/audit";
import { nextCode } from "../../lib/codeGenerator";
import { CreateTaskInput, UpdateTaskInput } from "./tasks.schema";
import { computeDurationDays, computeRemainingDays, computeTaskHealth, computeTaskCritical } from "../projects/evm.logic";
import { recalculateProject } from "../projects/projects.service";

const d = (s: string | null | undefined) => (s ? new Date(s) : null);

function computeCachedFields(t: {
  status: string;
  priority: string;
  progressPct: number;
  startDate?: string | null;
  finishDate?: string | null;
  baselineFinish?: string | null;
}) {
  const start = d(t.startDate);
  const finish = d(t.finishDate);
  const baselineFinish = d(t.baselineFinish);
  const durationDaysCache = computeDurationDays(start, finish);
  const remainingDaysCache = computeRemainingDays(finish, t.status);
  const healthCache = computeTaskHealth({ status: t.status, progressPct: t.progressPct, startDate: start, finishDate: finish });
  const isCriticalCache = computeTaskCritical({ priority: t.priority, status: t.status, progressPct: t.progressPct, startDate: start, finishDate: finish });
  const varianceDaysCache = finish && baselineFinish ? Math.round((finish.getTime() - baselineFinish.getTime()) / 86_400_000) : null;
  return { durationDaysCache, remainingDaysCache, healthCache, isCriticalCache, varianceDaysCache };
}

export async function listTasks(projectId?: number) {
  const conditions = [isNull(tasks.deletedAt)];
  if (projectId) conditions.push(eq(tasks.projectId, projectId));
  return db.select().from(tasks).where(and(...conditions)).orderBy(tasks.createdAt);
}

export async function getTask(id: number) {
  const row = (await db.select().from(tasks).where(and(eq(tasks.id, id), isNull(tasks.deletedAt))).limit(1))[0];
  if (!row) throw notFound("Task");
  return row;
}

export async function createTask(input: CreateTaskInput, userId: number) {
  const taskCode = await nextCode("tasks", "task_code", "TSK", 4);
  const cached = computeCachedFields(input);
  const [row] = await db
    .insert(tasks)
    .values({ ...input, taskCode, ...cached })
    .returning();
  await writeAudit({ userId, entityType: "task", entityId: row.id, action: "create", after: row });
  await recalculateProject(input.projectId);
  return getTask(row.id);
}

export async function updateTask(id: number, input: UpdateTaskInput, userId: number) {
  const before = await getTask(id);
  const merged = { ...before, ...input };
  const cached = computeCachedFields(merged);
  const [row] = await db
    .update(tasks)
    .set({ ...input, ...cached })
    .where(eq(tasks.id, id))
    .returning();
  await writeAudit({ userId, entityType: "task", entityId: id, action: "update", before, after: row });
  await recalculateProject(before.projectId);
  return getTask(id);
}

/** Fast path used by the Gantt/Kanban drag UI — updates just progress and recalculates immediately. */
export async function updateTaskProgress(id: number, progressPct: number, userId: number) {
  return updateTask(id, { progressPct }, userId);
}

export async function deleteTask(id: number, userId: number) {
  const before = await getTask(id);
  await db.update(tasks).set({ deletedAt: new Date() }).where(eq(tasks.id, id));
  await writeAudit({ userId, entityType: "task", entityId: id, action: "delete", before });
  await recalculateProject(before.projectId);
}
