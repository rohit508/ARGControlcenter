import { describe, it, expect } from "vitest";
import { planProductionCompletion } from "./bomPlanning.logic";

describe("planProductionCompletion", () => {
  it("is feasible when every component has enough stock, and matches the curl-verified real numbers (10 units x 4 per unit = 40)", () => {
    const lines = [{ componentItemId: 1, quantityPerOutput: 4 }];
    const available = new Map([[1, 500]]);
    const plan = planProductionCompletion(lines, available, 10);
    expect(plan.feasible).toBe(true);
    expect(plan.requirements[0]).toEqual({ componentItemId: 1, required: 40, available: 500, shortfall: 0 });
  });

  it("is infeasible when a component is short, and reports the exact shortfall", () => {
    const lines = [{ componentItemId: 1, quantityPerOutput: 4 }];
    const available = new Map([[1, 30]]); // need 40, only have 30
    const plan = planProductionCompletion(lines, available, 10);
    expect(plan.feasible).toBe(false);
    expect(plan.requirements[0].shortfall).toBe(10);
  });

  it("treats a component with NO stock record as zero available, not a crash", () => {
    const lines = [{ componentItemId: 99, quantityPerOutput: 1 }];
    const plan = planProductionCompletion(lines, new Map(), 5);
    expect(plan.feasible).toBe(false);
    expect(plan.requirements[0]).toEqual({ componentItemId: 99, required: 5, available: 0, shortfall: 5 });
  });

  it("is infeasible overall if ANY line is short, even when other lines are fully covered", () => {
    const lines = [
      { componentItemId: 1, quantityPerOutput: 2 }, // plenty
      { componentItemId: 2, quantityPerOutput: 5 }, // short
    ];
    const available = new Map([
      [1, 1000],
      [2, 3],
    ]);
    const plan = planProductionCompletion(lines, available, 1);
    expect(plan.feasible).toBe(false);
    expect(plan.requirements.find((r) => r.componentItemId === 1)!.shortfall).toBe(0);
    expect(plan.requirements.find((r) => r.componentItemId === 2)!.shortfall).toBe(2); // need 5, have 3
  });

  it("handles a zero-quantity completion cleanly", () => {
    const plan = planProductionCompletion([{ componentItemId: 1, quantityPerOutput: 4 }], new Map([[1, 0]]), 0);
    expect(plan.feasible).toBe(true); // 0 required, 0 available -> no shortfall
  });
});
