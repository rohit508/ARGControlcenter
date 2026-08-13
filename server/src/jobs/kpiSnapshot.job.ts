import cron from "node-cron";
import { db } from "../db/client";
import { projects, kpiSnapshots } from "../db/schema";
import { isNull } from "drizzle-orm";

/** Same computation as POST /kpi-engine/snapshot — scheduled nightly at 01:00 server time. */
async function takeNightlySnapshot() {
  const snapshotDate = new Date().toISOString().slice(0, 10);
  const activeProjects = await db.select().from(projects).where(isNull(projects.deletedAt));
  for (const p of activeProjects) {
    const cpi = p.cpiCache;
    const eac = p.actualCostCache + (p.budget - p.earnedValueCache) / (cpi === 0 ? 1 : cpi);
    await db.insert(kpiSnapshots).values({
      projectId: p.id,
      snapshotDate,
      spi: p.spiCache,
      cpi: p.cpiCache,
      cv: p.earnedValueCache - p.actualCostCache,
      sv: p.earnedValueCache - p.plannedValueCache,
      eac,
      etc: eac - p.actualCostCache,
      vac: p.budget - eac,
      tcpi: p.budget - p.actualCostCache === 0 ? 1 : (p.budget - p.earnedValueCache) / (p.budget - p.actualCostCache),
      progressPct: p.progressPctCache,
      budgetUtilization: p.budget === 0 ? 0 : p.actualCostCache / p.budget,
    });
  }
  console.log(`[kpiSnapshot.job] Snapshotted ${activeProjects.length} projects for ${snapshotDate}`);
}

export function scheduleKpiSnapshotJob() {
  // 01:00 every day. Kept as a named export (not run at import time) so tests never trigger it.
  cron.schedule("0 1 * * *", () => {
    takeNightlySnapshot().catch((err) => console.error("[kpiSnapshot.job] failed:", err));
  });
}

export { takeNightlySnapshot };
