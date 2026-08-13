import { Router } from "express";
import { db } from "../../db/client";
import { projects, tasks, risks, issues, kpiSnapshots } from "../../db/schema";
import { isNull, eq, and, sql } from "drizzle-orm";
import { asyncHandler } from "../../middleware/errorHandler.middleware";
import { authenticate } from "../../middleware/auth.middleware";

const router = Router();
router.use(authenticate);

/**
 * HONEST SCOPE NOTE: everything in this module is deterministic statistics and rule-based
 * heuristics over data already in the system — linear trend projection, threshold rules, keyword
 * search. There is no trained ML model and no LLM call. Framing it as "AI" without that caveat
 * would be a real overclaim; it's labeled "predictive/smart" in the UI because the *technique*
 * (trend extrapolation, rule-based alerting) genuinely is what most "AI insights" features in
 * commercial ERPs actually run under the hood — but you should know that's what it is.
 */

router.get(
  "/budget-forecast",
  asyncHandler(async (req, res) => {
    const projectId = req.query.projectId ? Number(req.query.projectId) : undefined;
    const conditions = [isNull(projects.deletedAt)];
    if (projectId) conditions.push(eq(projects.id, projectId));
    const rows = await db.select().from(projects).where(and(...conditions));

    const data = rows.map((p) => {
      // Simple linear burn-rate projection: if cost-to-date / progress-to-date holds constant,
      // project the cost at 100% progress. This is literally what EAC (already computed) means —
      // surfaced here as a plain-language forecast statement rather than a raw number.
      const projectedFinalCost = p.progressPctCache > 0 ? p.actualCostCache / p.progressPctCache : p.budget;
      const overrunRisk = projectedFinalCost > p.budget * 1.1 ? "High" : projectedFinalCost > p.budget ? "Medium" : "Low";
      return {
        projectId: p.id,
        projectCode: p.projectCode,
        name: p.name,
        budget: p.budget,
        actualCostToDate: p.actualCostCache,
        progressPct: p.progressPctCache,
        projectedFinalCost: round2(projectedFinalCost),
        projectedOverrun: round2(projectedFinalCost - p.budget),
        overrunRisk,
      };
    });
    res.json({ data });
  })
);

router.get(
  "/schedule-forecast",
  asyncHandler(async (req, res) => {
    const projectId = req.query.projectId ? Number(req.query.projectId) : undefined;
    const conditions = [isNull(projects.deletedAt)];
    if (projectId) conditions.push(eq(projects.id, projectId));
    const rows = await db.select().from(projects).where(and(...conditions));

    const data = rows.map((p) => {
      // If SPI < 1, work is taking (1/SPI) times longer than planned — a standard EVM technique,
      // not a model. Only meaningful once a project has a baseline duration.
      if (!p.baselineStart || !p.baselineFinish || p.spiCache <= 0) {
        return { projectId: p.id, projectCode: p.projectCode, name: p.name, forecast: "Insufficient baseline data" };
      }
      const baselineDurationDays = (new Date(p.baselineFinish).getTime() - new Date(p.baselineStart).getTime()) / 86_400_000;
      const forecastDurationDays = Math.round(baselineDurationDays / p.spiCache);
      const forecastFinishDate = new Date(new Date(p.baselineStart).getTime() + forecastDurationDays * 86_400_000);
      const slipDays = forecastDurationDays - baselineDurationDays;
      return {
        projectId: p.id,
        projectCode: p.projectCode,
        name: p.name,
        spi: p.spiCache,
        baselineDurationDays: Math.round(baselineDurationDays),
        forecastDurationDays,
        forecastFinishDate: forecastFinishDate.toISOString().slice(0, 10),
        slipDays: Math.round(slipDays),
      };
    });
    res.json({ data });
  })
);

router.get(
  "/smart-alerts",
  asyncHandler(async (_req, res) => {
    // Rule-based alerting — every rule here is an explicit, readable threshold, not a learned one.
    const alerts: { severity: "High" | "Medium"; message: string; entityType: string; entityId: number }[] = [];

    const redProjects = await db.select().from(projects).where(and(eq(projects.healthCache, "Red"), isNull(projects.deletedAt)));
    for (const p of redProjects) {
      alerts.push({ severity: "High", message: `${p.name} (${p.projectCode}) is Red — SPI ${p.spiCache.toFixed(2)}, CPI ${p.cpiCache.toFixed(2)}`, entityType: "project", entityId: p.id });
    }

    const overdueTasks = await db
      .select()
      .from(tasks)
      .where(and(sql`${tasks.finishDate} < ${new Date().toISOString().slice(0, 10)}`, sql`${tasks.status} != 'Completed'`, isNull(tasks.deletedAt)));
    const byProject = new Map<number, number>();
    for (const t of overdueTasks) byProject.set(t.projectId, (byProject.get(t.projectId) || 0) + 1);
    for (const [projectId, count] of byProject) {
      if (count >= 3) alerts.push({ severity: "Medium", message: `${count} overdue tasks on project ${projectId}`, entityType: "project", entityId: projectId });
    }

    const highRisks = await db.select().from(risks).where(and(eq(risks.status, "Open"), sql`${risks.riskScoreCache} >= 15`, isNull(risks.deletedAt)));
    for (const r of highRisks) {
      alerts.push({ severity: "High", message: `High-severity risk open on project ${r.projectId}: ${r.description} (score ${r.riskScoreCache})`, entityType: "risk", entityId: r.id });
    }

    res.json({ data: alerts });
  })
);

router.get(
  "/search",
  asyncHandler(async (req, res) => {
    // Keyword search across the portfolio — plain SQL LIKE matching, explicitly not NLP.
    const q = String(req.query.q || "").trim();
    if (!q) return res.json({ data: [] });
    const pattern = `%${q}%`;
    const [pRows, tRows, rRows, iRows] = await Promise.all([
      db.select({ id: projects.id, code: projects.projectCode, name: projects.name }).from(projects).where(sql`${projects.name} LIKE ${pattern} OR ${projects.projectCode} LIKE ${pattern}`),
      db.select({ id: tasks.id, code: tasks.taskCode, name: tasks.name }).from(tasks).where(sql`${tasks.name} LIKE ${pattern} OR ${tasks.taskCode} LIKE ${pattern}`),
      db.select({ id: risks.id, code: risks.riskCode, name: risks.description }).from(risks).where(sql`${risks.description} LIKE ${pattern} OR ${risks.riskCode} LIKE ${pattern}`),
      db.select({ id: issues.id, code: issues.issueCode, name: issues.description }).from(issues).where(sql`${issues.description} LIKE ${pattern} OR ${issues.issueCode} LIKE ${pattern}`),
    ]);
    res.json({
      data: [
        ...pRows.map((r) => ({ ...r, type: "project" })),
        ...tRows.map((r) => ({ ...r, type: "task" })),
        ...rRows.map((r) => ({ ...r, type: "risk" })),
        ...iRows.map((r) => ({ ...r, type: "issue" })),
      ],
    });
  })
);

function round2(n: number) {
  return Math.round(n * 100) / 100;
}

export default router;
