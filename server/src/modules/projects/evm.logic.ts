/**
 * Pure, side-effect-free ports of the workbook's Project Master formulas. Kept separate from the
 * DB-touching service (projects.service.ts) so this logic is directly unit-testable — exactly the
 * upgrade path promised in 00-scope-and-roadmap.md §0.5 ("Excel mechanism → becomes tested code").
 */

export interface TaskForRollup {
  durationDays: number;
  progressPct: number; // 0..1
}

/** Duration-weighted average progress across a project's tasks — same SUMPRODUCT logic as the workbook. */
export function computeProjectProgress(tasks: TaskForRollup[]): number {
  const totalDuration = tasks.reduce((sum, t) => sum + t.durationDays, 0);
  if (totalDuration === 0) return 0;
  const weighted = tasks.reduce((sum, t) => sum + t.durationDays * t.progressPct, 0);
  return round4(weighted / totalDuration);
}

/** Time-phased planned value: budget * how far through the baseline schedule "today" falls. */
export function computePlannedValue(budget: number, baselineStart: Date | null, baselineFinish: Date | null, today = new Date()): number {
  if (!baselineStart || !baselineFinish) return 0;
  const total = baselineFinish.getTime() - baselineStart.getTime();
  if (total <= 0) return budget;
  const elapsed = today.getTime() - baselineStart.getTime();
  const pct = clamp(elapsed / total, 0, 1);
  return round2(budget * pct);
}

export function computeEarnedValue(budget: number, progressPct: number): number {
  return round2(budget * progressPct);
}

export function computeSpi(earnedValue: number, plannedValue: number): number {
  if (plannedValue === 0) return 1;
  return round2(earnedValue / plannedValue);
}

export function computeCpi(earnedValue: number, actualCost: number): number {
  if (actualCost === 0) return 1;
  return round2(earnedValue / actualCost);
}

export function computeEac(actualCost: number, budgetAtCompletion: number, earnedValue: number, cpi: number): number {
  const denom = cpi === 0 ? 1 : cpi;
  return round2(actualCost + (budgetAtCompletion - earnedValue) / denom);
}

export type Health = "Green" | "Amber" | "Red";

/** Same thresholds as the Project Master Health formula: SPI/CPI < 0.85 or risk >= 15 → Red;
 *  SPI/CPI < 0.95 or risk >= 9 → Amber; else Green. Completed projects are always Green. */
export function computeHealth(params: { status: string; spi: number; cpi: number; avgOpenRiskScore: number }): Health {
  if (params.status === "Completed") return "Green";
  if (params.spi < 0.85 || params.cpi < 0.85 || params.avgOpenRiskScore >= 15) return "Red";
  if (params.spi < 0.95 || params.cpi < 0.95 || params.avgOpenRiskScore >= 9) return "Amber";
  return "Green";
}

/** Task Health formula: overdue-and-not-completed or Blocked → Red; behind planned pace by >15pp → Amber. */
export function computeTaskHealth(params: {
  status: string;
  progressPct: number;
  startDate: Date | null;
  finishDate: Date | null;
  today?: Date;
}): Health {
  const today = params.today ?? new Date();
  if (params.status === "Completed") return "Green";
  if (params.status === "Blocked") return "Red";
  if (params.finishDate && today > params.finishDate) return "Red";
  if (params.startDate && params.finishDate) {
    const total = params.finishDate.getTime() - params.startDate.getTime();
    const plannedPct = total > 0 ? clamp((today.getTime() - params.startDate.getTime()) / total, 0, 1) : 0;
    if (params.progressPct + 0.15 < plannedPct) return "Amber";
  }
  return "Green";
}

export function computeTaskCritical(params: {
  priority: string;
  status: string;
  progressPct: number;
  startDate: Date | null;
  finishDate: Date | null;
  today?: Date;
}): boolean {
  const today = params.today ?? new Date();
  if (params.priority === "Critical") return true;
  if (params.status === "Completed") return false;
  if (params.finishDate && today > params.finishDate) return true;
  if (params.startDate && params.finishDate) {
    const total = params.finishDate.getTime() - params.startDate.getTime();
    const plannedPct = total > 0 ? clamp((today.getTime() - params.startDate.getTime()) / total, 0, 1) : 0;
    if (params.progressPct < plannedPct - 0.2) return true;
  }
  return false;
}

export function computeDurationDays(start: Date | null, finish: Date | null): number {
  if (!start || !finish) return 0;
  return Math.max(1, Math.round((finish.getTime() - start.getTime()) / 86_400_000) + 1);
}

export function computeRemainingDays(finish: Date | null, status: string, today = new Date()): number {
  if (!finish || status === "Completed") return 0;
  return Math.max(0, Math.round((finish.getTime() - today.getTime()) / 86_400_000));
}

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}
function round2(n: number) {
  return Math.round(n * 100) / 100;
}
function round4(n: number) {
  return Math.round(n * 10000) / 10000;
}
