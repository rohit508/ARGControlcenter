import { db } from "../../db/client";
import { projects, tasks, budgetEntries, risks } from "../../db/schema";
import { eq, and, isNull, sql } from "drizzle-orm";
import { notFound } from "../../middleware/errorHandler.middleware";
import { writeAudit } from "../../lib/audit";
import { nextCode } from "../../lib/codeGenerator";
import { CreateProjectInput, UpdateProjectInput } from "./projects.schema";
import {
  computeProjectProgress,
  computePlannedValue,
  computeEarnedValue,
  computeSpi,
  computeCpi,
  computeHealth,
} from "./evm.logic";

const d = (s: string | null | undefined) => (s ? new Date(s) : null);

/**
 * The direct port of the workbook's Project Master calculated columns (Progress %, Actual Cost,
 * Planned/Earned Value, SPI, CPI, Health, Risk Score). Called after every write to this project's
 * tasks, budget entries, or risks — see the `recalculate` calls in tasks.service.ts etc.
 */
export async function recalculateProject(projectId: number) {
  const project = (await db.select().from(projects).where(eq(projects.id, projectId)).limit(1))[0];
  if (!project) return;

  const projectTasks = await db
    .select({ startDate: tasks.startDate, finishDate: tasks.finishDate, progressPct: tasks.progressPct })
    .from(tasks)
    .where(and(eq(tasks.projectId, projectId), isNull(tasks.deletedAt)));

  const tasksForRollup = projectTasks.map((t) => {
    const start = d(t.startDate);
    const finish = d(t.finishDate);
    const durationDays = start && finish ? Math.max(1, Math.round((finish.getTime() - start.getTime()) / 86_400_000) + 1) : 0;
    return { durationDays, progressPct: t.progressPct };
  });
  const progressPct = computeProjectProgress(tasksForRollup);

  const costAgg = (
    await db
      .select({
        actualCost: sql<number>`COALESCE(SUM(${budgetEntries.actualCost}), 0)`,
        forecastCost: sql<number>`COALESCE(SUM(${budgetEntries.forecastCost}), 0)`,
      })
      .from(budgetEntries)
      .where(and(eq(budgetEntries.projectId, projectId), isNull(budgetEntries.deletedAt)))
  )[0];

  const riskAgg = (
    await db
      .select({ avgScore: sql<number>`COALESCE(AVG(${risks.riskScoreCache}), 0)` })
      .from(risks)
      .where(and(eq(risks.projectId, projectId), eq(risks.status, "Open"), isNull(risks.deletedAt)))
  )[0];

  const plannedValue = computePlannedValue(project.budget, d(project.baselineStart), d(project.baselineFinish));
  const earnedValue = computeEarnedValue(project.budget, progressPct);
  const spi = computeSpi(earnedValue, plannedValue);
  const cpi = computeCpi(earnedValue, costAgg.actualCost);
  const health = computeHealth({ status: project.status, spi, cpi, avgOpenRiskScore: riskAgg.avgScore });

  await db
    .update(projects)
    .set({
      progressPctCache: progressPct,
      actualCostCache: costAgg.actualCost,
      forecastCostCache: costAgg.forecastCost,
      plannedValueCache: plannedValue,
      earnedValueCache: earnedValue,
      spiCache: spi,
      cpiCache: cpi,
      riskScoreCache: riskAgg.avgScore,
      healthCache: health,
      recalculatedAt: new Date(),
    })
    .where(eq(projects.id, projectId));
}

export async function listProjects(scopeIds: number[] | undefined, filters: { status?: string; health?: string }) {
  const conditions = [isNull(projects.deletedAt)];
  if (scopeIds !== undefined) {
    if (scopeIds.length === 0) return [];
    conditions.push(sql`${projects.id} IN ${scopeIds}`);
  }
  if (filters.status) conditions.push(eq(projects.status, filters.status));
  if (filters.health) conditions.push(eq(projects.healthCache, filters.health));
  return db
    .select()
    .from(projects)
    .where(and(...conditions))
    .orderBy(projects.createdAt);
}

export async function getProject(id: number) {
  const row = (await db.select().from(projects).where(and(eq(projects.id, id), isNull(projects.deletedAt))).limit(1))[0];
  if (!row) throw notFound("Project");
  return row;
}

export async function createProject(input: CreateProjectInput, userId: number) {
  const projectCode = await nextCode("projects", "project_code", "PRJ", 3);
  const [row] = await db
    .insert(projects)
    .values({ ...input, projectCode })
    .returning();
  await writeAudit({ userId, entityType: "project", entityId: row.id, action: "create", after: row });
  return row;
}

export async function updateProject(id: number, input: UpdateProjectInput, userId: number) {
  const before = await getProject(id);
  const [row] = await db.update(projects).set(input).where(eq(projects.id, id)).returning();
  await writeAudit({ userId, entityType: "project", entityId: id, action: "update", before, after: row });
  await recalculateProject(id); // status change can affect Health even with unchanged EVM inputs
  return getProject(id);
}

export async function deleteProject(id: number, userId: number) {
  const before = await getProject(id);
  await db.update(projects).set({ deletedAt: new Date() }).where(eq(projects.id, id));
  await writeAudit({ userId, entityType: "project", entityId: id, action: "delete", before });
}
