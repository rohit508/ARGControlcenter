import { describe, it, expect } from "vitest";
import {
  computeProjectProgress,
  computePlannedValue,
  computeEarnedValue,
  computeSpi,
  computeCpi,
  computeHealth,
  computeTaskHealth,
  computeTaskCritical,
  computeDurationDays,
} from "./evm.logic";

describe("computeProjectProgress", () => {
  it("duration-weights progress across tasks", () => {
    // 10-day task at 100%, 30-day task at 0% -> (10*1 + 30*0)/40 = 0.25
    expect(computeProjectProgress([{ durationDays: 10, progressPct: 1 }, { durationDays: 30, progressPct: 0 }])).toBe(0.25);
  });
  it("returns 0 for no tasks", () => {
    expect(computeProjectProgress([])).toBe(0);
  });
});

describe("computePlannedValue", () => {
  it("is 0 before baseline start", () => {
    const start = new Date("2026-06-01");
    const finish = new Date("2026-06-11");
    expect(computePlannedValue(10000, start, finish, new Date("2026-05-01"))).toBe(0);
  });
  it("is full budget after baseline finish", () => {
    const start = new Date("2026-06-01");
    const finish = new Date("2026-06-11");
    expect(computePlannedValue(10000, start, finish, new Date("2026-07-01"))).toBe(10000);
  });
  it("is halfway at the midpoint", () => {
    const start = new Date("2026-06-01");
    const finish = new Date("2026-06-11");
    expect(computePlannedValue(10000, start, finish, new Date("2026-06-06"))).toBe(5000);
  });
});

describe("SPI / CPI", () => {
  it("SPI defaults to 1 when planned value is 0 (no div/0)", () => {
    expect(computeSpi(500, 0)).toBe(1);
  });
  it("computes ratio normally", () => {
    expect(computeSpi(500, 1000)).toBe(0.5);
    expect(computeCpi(500, 1000)).toBe(0.5);
  });
});

describe("computeHealth", () => {
  it("Completed is always Green regardless of SPI/CPI", () => {
    expect(computeHealth({ status: "Completed", spi: 0.1, cpi: 0.1, avgOpenRiskScore: 25 })).toBe("Green");
  });
  it("Red when SPI below 0.85", () => {
    expect(computeHealth({ status: "In Progress", spi: 0.8, cpi: 1, avgOpenRiskScore: 0 })).toBe("Red");
  });
  it("Red when risk score >= 15", () => {
    expect(computeHealth({ status: "In Progress", spi: 1, cpi: 1, avgOpenRiskScore: 15 })).toBe("Red");
  });
  it("Amber in the 0.85-0.95 band", () => {
    expect(computeHealth({ status: "In Progress", spi: 0.9, cpi: 1, avgOpenRiskScore: 0 })).toBe("Amber");
  });
  it("Green when everything on track", () => {
    expect(computeHealth({ status: "In Progress", spi: 1, cpi: 1, avgOpenRiskScore: 2 })).toBe("Green");
  });
});

describe("computeTaskHealth / computeTaskCritical", () => {
  const start = new Date("2026-08-01");
  const finish = new Date("2026-08-11");

  it("overdue incomplete task is Red and Critical", () => {
    const today = new Date("2026-08-15");
    expect(computeTaskHealth({ status: "In Progress", progressPct: 0.5, startDate: start, finishDate: finish, today })).toBe("Red");
    expect(computeTaskCritical({ priority: "Medium", status: "In Progress", progressPct: 0.5, startDate: start, finishDate: finish, today })).toBe(true);
  });
  it("Blocked is always Red", () => {
    expect(computeTaskHealth({ status: "Blocked", progressPct: 0.5, startDate: start, finishDate: finish })).toBe("Red");
  });
  it("Critical priority is always flagged critical", () => {
    expect(computeTaskCritical({ priority: "Critical", status: "Not Started", progressPct: 0, startDate: null, finishDate: null })).toBe(true);
  });
});

describe("computeDurationDays", () => {
  it("inclusive day count", () => {
    expect(computeDurationDays(new Date("2026-08-01"), new Date("2026-08-10"))).toBe(10);
  });
});
