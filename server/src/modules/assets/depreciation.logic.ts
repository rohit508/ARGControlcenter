/**
 * Straight-line depreciation — the standard, simplest GAAP-acceptable method:
 *   annual depreciation = (cost - salvage) / useful life years
 *   accumulated = min(annual * years elapsed, cost - salvage)
 *   netBookValue = cost - accumulated
 *
 * Extracted as a pure function (was previously inline in assets.routes.ts) specifically so it can
 * be unit-tested the same way evm.logic.ts is — this was flagged as a real gap after a self-audit
 * found it had only ever been verified once by hand via curl, not via a repeatable test.
 */
export interface DepreciationInput {
  purchaseDate: string; // ISO date
  purchaseCost: number;
  usefulLifeYears: number;
  salvageValue: number;
}

export interface DepreciationResult {
  annualDepreciation: number;
  accumulatedDepreciation: number;
  netBookValue: number;
}

export function computeDepreciation(asset: DepreciationInput, now: Date = new Date()): DepreciationResult {
  const yearsElapsed = Math.max(0, (now.getTime() - new Date(asset.purchaseDate).getTime()) / (365.25 * 86_400_000));
  const depreciableBase = asset.purchaseCost - asset.salvageValue;
  const annualDepreciation = asset.usefulLifeYears > 0 ? depreciableBase / asset.usefulLifeYears : 0;
  const accumulatedDepreciation = Math.min(Math.max(0, annualDepreciation * yearsElapsed), depreciableBase);
  const netBookValue = asset.purchaseCost - accumulatedDepreciation;
  return {
    annualDepreciation: round2(annualDepreciation),
    accumulatedDepreciation: round2(accumulatedDepreciation),
    netBookValue: round2(netBookValue),
  };
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
