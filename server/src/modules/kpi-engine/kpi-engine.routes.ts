import { Router } from "express";
import { db } from "../../db/client";
import { projects, tasks, risks, issues, changeRequests, kpiSnapshots } from "../../db/schema";
import { sql, eq, and, isNull, gte, lte, ne } from "drizzle-orm";
import { asyncHandler } from "../../middleware/errorHandler.middleware";
import { authenticate } from "../../middleware/auth.middleware";
import { requireRole } from "../../middleware/rbac.middleware";

const router = Router();
router.use(authenticate);

router.get(
  "/portfolio",
  asyncHandler(async (_req, res) => {
    const today = new Date().toISOString().slice(0, 10);
    const in14 = new Date(Date.now() + 14 * 86_400_000).toISOString().slice(0, 10);

    const projectCounts = (
      await db
        .select({
          total: sql<number>`COUNT(*)`,
          active: sql<number>`SUM(CASE WHEN ${projects.status} = 'In Progress' THEN 1 ELSE 0 END)`,
          completed: sql<number>`SUM(CASE WHEN ${projects.status} = 'Completed' THEN 1 ELSE 0 END)`,
          delayed: sql<number>`SUM(CASE WHEN ${projects.status} = 'Delayed' THEN 1 ELSE 0 END)`,
          onHold: sql<number>`SUM(CASE WHEN ${projects.status} = 'On Hold' THEN 1 ELSE 0 END)`,
          notStarted: sql<number>`SUM(CASE WHEN ${projects.status} = 'Not Started' THEN 1 ELSE 0 END)`,
          red: sql<number>`SUM(CASE WHEN ${projects.healthCache} = 'Red' THEN 1 ELSE 0 END)`,
          amber: sql<number>`SUM(CASE WHEN ${projects.healthCache} = 'Amber' THEN 1 ELSE 0 END)`,
          green: sql<number>`SUM(CASE WHEN ${projects.healthCache} = 'Green' THEN 1 ELSE 0 END)`,
          bac: sql<number>`COALESCE(SUM(${projects.budget}), 0)`,
          pv: sql<number>`COALESCE(SUM(${projects.plannedValueCache}), 0)`,
          ev: sql<number>`COALESCE(SUM(${projects.earnedValueCache}), 0)`,
          ac: sql<number>`COALESCE(SUM(${projects.actualCostCache}), 0)`,
        })
        .from(projects)
        .where(isNull(projects.deletedAt))
    )[0];

    const taskCounts = (
      await db
        .select({
          total: sql<number>`COUNT(*)`,
          completed: sql<number>`SUM(CASE WHEN ${tasks.status} = 'Completed' THEN 1 ELSE 0 END)`,
          overdue: sql<number>`SUM(CASE WHEN ${tasks.finishDate} < ${today} AND ${tasks.status} != 'Completed' THEN 1 ELSE 0 END)`,
          critical: sql<number>`SUM(CASE WHEN ${tasks.isCriticalCache} = 1 THEN 1 ELSE 0 END)`,
          upcomingDeadlines: sql<number>`SUM(CASE WHEN ${tasks.finishDate} BETWEEN ${today} AND ${in14} AND ${tasks.status} != 'Completed' THEN 1 ELSE 0 END)`,
        })
        .from(tasks)
        .where(isNull(tasks.deletedAt))
    )[0];

    const riskCounts = (
      await db
        .select({
          open: sql<number>`SUM(CASE WHEN ${risks.status} = 'Open' THEN 1 ELSE 0 END)`,
          high: sql<number>`SUM(CASE WHEN ${risks.status} = 'Open' AND ${risks.riskScoreCache} >= 15 THEN 1 ELSE 0 END)`,
        })
        .from(risks)
        .where(isNull(risks.deletedAt))
    )[0];

    const issueCounts = (
      await db
        .select({
          open: sql<number>`SUM(CASE WHEN ${issues.status} IN ('Open','In Progress') THEN 1 ELSE 0 END)`,
          overdue: sql<number>`SUM(CASE WHEN ${issues.status} IN ('Open','In Progress') AND julianday(${today}) - julianday(${issues.dateRaised}) > 14 THEN 1 ELSE 0 END)`,
        })
        .from(issues)
        .where(isNull(issues.deletedAt))
    )[0];

    const pendingApprovals = (
      await db
        .select({ count: sql<number>`COUNT(*)` })
        .from(changeRequests)
        .where(and(eq(changeRequests.approvalStatus, "Pending"), isNull(changeRequests.deletedAt)))
    )[0].count;

    const spi = projectCounts.pv === 0 ? 1 : round2(projectCounts.ev / projectCounts.pv);
    const cpi = projectCounts.ac === 0 ? 1 : round2(projectCounts.ev / projectCounts.ac);
    const cv = round2(projectCounts.ev - projectCounts.ac);
    const sv = round2(projectCounts.ev - projectCounts.pv);
    const eac = round2(projectCounts.ac + (projectCounts.bac - projectCounts.ev) / (cpi === 0 ? 1 : cpi));
    const etc = round2(eac - projectCounts.ac);
    const vac = round2(projectCounts.bac - eac);
    const tcpi = projectCounts.bac - projectCounts.ac === 0 ? 1 : round2((projectCounts.bac - projectCounts.ev) / (projectCounts.bac - projectCounts.ac));
    const budgetUtilization = projectCounts.bac === 0 ? 0 : round4(projectCounts.ac / projectCounts.bac);

    res.json({
      data: {
        projects: {
          total: projectCounts.total,
          active: projectCounts.active,
          completed: projectCounts.completed,
          delayed: projectCounts.delayed,
          onHold: projectCounts.onHold,
          notStarted: projectCounts.notStarted,
          health: { red: projectCounts.red, amber: projectCounts.amber, green: projectCounts.green },
        },
        tasks: taskCounts,
        risks: riskCounts,
        issues: issueCounts,
        pendingApprovals,
        evm: { bac: projectCounts.bac, pv: projectCounts.pv, ev: projectCounts.ev, ac: projectCounts.ac, spi, cpi, cv, sv, eac, etc, vac, tcpi, budgetUtilization },
      },
    });
  })
);

router.get(
  "/status-distribution",
  asyncHandler(async (_req, res) => {
    const rows = await db
      .select({ status: projects.status, count: sql<number>`COUNT(*)` })
      .from(projects)
      .where(isNull(projects.deletedAt))
      .groupBy(projects.status);
    res.json({ data: rows });
  })
);

router.get(
  "/cost-breakdown",
  asyncHandler(async (_req, res) => {
    const result = await db.execute(
      sql`SELECT cost_category as category, SUM(actual_cost) as total FROM budget_entries WHERE deleted_at IS NULL GROUP BY cost_category`
    );
    res.json({ data: result.rows });
  })
);

router.get(
  "/top-risks",
  asyncHandler(async (req, res) => {
    const limit = req.query.limit ? Number(req.query.limit) : 8;
    const rows = await db
      .select({ id: risks.id, riskCode: risks.riskCode, projectId: risks.projectId, description: risks.description, score: risks.riskScoreCache })
      .from(risks)
      .where(and(eq(risks.status, "Open"), isNull(risks.deletedAt)))
      .orderBy(sql`${risks.riskScoreCache} DESC`)
      .limit(limit);
    res.json({ data: rows });
  })
);

router.get(
  "/top-delayed-projects",
  asyncHandler(async (req, res) => {
    const limit = req.query.limit ? Number(req.query.limit) : 8;
    const today = new Date().toISOString().slice(0, 10);
    // NOTE: SQLite's julianday() date-arithmetic was translated to Postgres date subtraction
    // (::date - ::date yields an integer day count directly) as part of the dialect migration —
    // flagged for a closer look/testing pass since it's a raw-SQL behavior change, not a
    // mechanical schema/type conversion.
    const result = await db.execute(
      sql`SELECT id, project_code as "projectCode", name,
          (${today}::date - forecast_finish::date) as "daysLate"
          FROM projects
          WHERE deleted_at IS NULL AND status != 'Completed' AND forecast_finish IS NOT NULL AND forecast_finish < ${today}
          ORDER BY "daysLate" DESC LIMIT ${limit}`
    );
    res.json({ data: result.rows });
  })
);

/**
 * Takes a dated snapshot of every active project's EVM metrics plus one portfolio-level row.
 * This is the direct, automated replacement for the workbook's manual "paste values into a log
 * periodically" instruction — see 02-database-design.md §2.2. Runs nightly via node-cron
 * (jobs/kpiSnapshot.job.ts) and is also exposed here so an Admin can trigger it on demand.
 */
router.post(
  "/snapshot",
  requireRole("Admin"),
  asyncHandler(async (_req, res) => {
    const snapshotDate = new Date().toISOString().slice(0, 10);
    const activeProjects = await db.select().from(projects).where(isNull(projects.deletedAt));

    let portfolioBac = 0, portfolioPv = 0, portfolioEv = 0, portfolioAc = 0;

    for (const p of activeProjects) {
      const spi = p.spiCache, cpi = p.cpiCache;
      const cv = p.earnedValueCache - p.actualCostCache;
      const sv = p.earnedValueCache - p.plannedValueCache;
      const eac = p.actualCostCache + (p.budget - p.earnedValueCache) / (cpi === 0 ? 1 : cpi);
      const etc = eac - p.actualCostCache;
      const vac = p.budget - eac;
      const tcpi = p.budget - p.actualCostCache === 0 ? 1 : (p.budget - p.earnedValueCache) / (p.budget - p.actualCostCache);

      await db.insert(kpiSnapshots).values({
        projectId: p.id,
        snapshotDate,
        spi, cpi, cv, sv, eac, etc, vac, tcpi,
        progressPct: p.progressPctCache,
        budgetUtilization: p.budget === 0 ? 0 : p.actualCostCache / p.budget,
      });

      portfolioBac += p.budget;
      portfolioPv += p.plannedValueCache;
      portfolioEv += p.earnedValueCache;
      portfolioAc += p.actualCostCache;
    }

    const pSpi = portfolioPv === 0 ? 1 : portfolioEv / portfolioPv;
    const pCpi = portfolioAc === 0 ? 1 : portfolioEv / portfolioAc;
    const pCv = portfolioEv - portfolioAc;
    const pSv = portfolioEv - portfolioPv;
    const pEac = portfolioAc + (portfolioBac - portfolioEv) / (pCpi === 0 ? 1 : pCpi);
    await db.insert(kpiSnapshots).values({
      projectId: null,
      snapshotDate,
      spi: pSpi, cpi: pCpi, cv: pCv, sv: pSv, eac: pEac,
      etc: pEac - portfolioAc, vac: portfolioBac - pEac,
      tcpi: portfolioBac - portfolioAc === 0 ? 1 : (portfolioBac - portfolioEv) / (portfolioBac - portfolioAc),
      progressPct: 0, // portfolio-level progress isn't meaningful as a single number; per-project rows carry it
      budgetUtilization: portfolioBac === 0 ? 0 : portfolioAc / portfolioBac,
    });

    res.status(201).json({ data: { snapshotDate, projectsSnapshotted: activeProjects.length } });
  })
);

router.get(
  "/history",
  asyncHandler(async (req, res) => {
    const conditions = [];
    if (req.query.projectId) conditions.push(eq(kpiSnapshots.projectId, Number(req.query.projectId)));
    else conditions.push(isNull(kpiSnapshots.projectId)); // default: portfolio-level trend
    const rows = await db
      .select()
      .from(kpiSnapshots)
      .where(and(...conditions))
      .orderBy(kpiSnapshots.snapshotDate);
    res.json({ data: rows });
  })
);

function round2(n: number) {
  return Math.round(n * 100) / 100;
}
function round4(n: number) {
  return Math.round(n * 10000) / 10000;
}

export default router;
