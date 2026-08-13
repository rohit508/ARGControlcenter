/**
 * The pure planning half of production-order completion: given a BOM's component lines, how much
 * of each is required for a given output quantity, and is there enough stock to cover it. The
 * actual stock mutation (recordStockTransaction calls) stays in manufacturing.routes.ts since
 * that's inherently DB-side-effecting — but the "is this feasible, and by how much are we short"
 * decision is pure and belongs here, testable without a database.
 */
export interface BomLine {
  componentItemId: number;
  quantityPerOutput: number;
}

export interface ComponentRequirement {
  componentItemId: number;
  required: number;
  available: number;
  shortfall: number;
}

export interface ProductionPlan {
  feasible: boolean;
  requirements: ComponentRequirement[];
}

export function planProductionCompletion(lines: BomLine[], availableByItem: Map<number, number>, quantityToComplete: number): ProductionPlan {
  const requirements = lines.map((line) => {
    const required = round4(line.quantityPerOutput * quantityToComplete);
    const available = availableByItem.get(line.componentItemId) ?? 0;
    const shortfall = Math.max(0, round4(required - available));
    return { componentItemId: line.componentItemId, required, available, shortfall };
  });
  return { feasible: requirements.every((r) => r.shortfall === 0), requirements };
}

function round4(n: number): number {
  return Math.round(n * 10000) / 10000;
}
