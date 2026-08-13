import { describe, it, expect } from "vitest";
import { computeDepreciation } from "./depreciation.logic";

describe("computeDepreciation", () => {
  it("is zero at the moment of purchase", () => {
    const now = new Date("2026-01-01");
    const result = computeDepreciation({ purchaseDate: "2026-01-01", purchaseCost: 100_000, usefulLifeYears: 5, salvageValue: 10_000 }, now);
    expect(result.accumulatedDepreciation).toBe(0);
    expect(result.netBookValue).toBe(100_000);
  });

  it("computes correctly at exactly the halfway point of useful life", () => {
    const now = new Date("2028-07-02"); // ~2.5 years after purchase
    const result = computeDepreciation({ purchaseDate: "2026-01-01", purchaseCost: 100_000, usefulLifeYears: 5, salvageValue: 10_000 }, now);
    // depreciable base = 90,000 over 5 years = 18,000/year; at 2.5 years -> 45,000 accumulated
    expect(result.annualDepreciation).toBe(18_000);
    expect(result.accumulatedDepreciation).toBeCloseTo(45_000, -2); // within ~100 given day-count rounding
    expect(result.netBookValue).toBeCloseTo(55_000, -2);
  });

  it("never depreciates below salvage value, even long after useful life ends", () => {
    const now = new Date("2040-01-01"); // 14 years after purchase, well past the 5-year useful life
    const result = computeDepreciation({ purchaseDate: "2026-01-01", purchaseCost: 100_000, usefulLifeYears: 5, salvageValue: 10_000 }, now);
    expect(result.accumulatedDepreciation).toBe(90_000); // capped at (cost - salvage), not still accruing
    expect(result.netBookValue).toBe(10_000); // never dips below salvage value
  });

  it("handles zero useful life without dividing by zero", () => {
    const result = computeDepreciation({ purchaseDate: "2026-01-01", purchaseCost: 50_000, usefulLifeYears: 0, salvageValue: 0 }, new Date("2027-01-01"));
    expect(result.annualDepreciation).toBe(0);
    expect(Number.isFinite(result.netBookValue)).toBe(true);
  });

  it("matches the real seed-data figures from curl verification (Forklift: 850k cost, 8yr life, 50k salvage, ~2yr elapsed)", () => {
    const now = new Date("2026-08-04");
    const result = computeDepreciation({ purchaseDate: "2024-08-05", purchaseCost: 850_000, usefulLifeYears: 8, salvageValue: 50_000 }, now);
    // annual = (850000-50000)/8 = 100,000/yr; ~2 years elapsed -> ~200,000 accumulated
    expect(result.accumulatedDepreciation).toBeCloseTo(200_000, -3);
  });
});
