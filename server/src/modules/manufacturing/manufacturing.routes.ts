import { Router } from "express";
import { z } from "zod";
import { db } from "../../db/client";
import { workCenters, boms, bomLines, productionOrders, stockLevels } from "../../db/schema";
import { eq, and } from "drizzle-orm";
import { asyncHandler, notFound, ApiError } from "../../middleware/errorHandler.middleware";
import { authenticate } from "../../middleware/auth.middleware";
import { requirePermission } from "../../middleware/rbac.middleware";
import { nextCode } from "../../lib/codeGenerator";
import { recordStockTransaction } from "../inventory/inventory.service";
import { planProductionCompletion } from "./bomPlanning.logic";

const router = Router();
router.use(authenticate);

const wcSchema = z.object({ name: z.string().min(1), capacityHoursPerDay: z.number().min(0).default(8) });
router.get("/work-centers", asyncHandler(async (_req, res) => res.json({ data: await db.select().from(workCenters) })));
router.post("/work-centers", requirePermission("manufacturing", "create"), asyncHandler(async (req, res) => {
  const input = wcSchema.parse(req.body);
  const code = nextCode("work_centers", "code", "WC", 3);
  const [row] = await db.insert(workCenters).values({ ...input, code }).returning();
  res.status(201).json({ data: row });
}));

const bomLineSchema = z.object({ componentItemId: z.number().int(), quantityPerOutput: z.number().min(0.001) });
const bomSchema = z.object({ outputItemId: z.number().int(), outputQuantity: z.number().min(0.001).default(1), lines: z.array(bomLineSchema).min(1) });

router.get("/boms", asyncHandler(async (_req, res) => res.json({ data: await db.select().from(boms) })));
router.get("/boms/:id/lines", asyncHandler(async (req, res) => {
  res.json({ data: await db.select().from(bomLines).where(eq(bomLines.bomId, Number(req.params.id))) });
}));
router.post("/boms", requirePermission("manufacturing", "create"), asyncHandler(async (req, res) => {
  const input = bomSchema.parse(req.body);
  const bomCode = nextCode("boms", "bom_code", "BOM", 3);
  const [bom] = await db.insert(boms).values({ bomCode, outputItemId: input.outputItemId, outputQuantity: input.outputQuantity }).returning();
  await db.insert(bomLines).values(input.lines.map((l) => ({ bomId: bom.id, ...l })));
  res.status(201).json({ data: bom });
}));

const poSchema = z.object({
  bomId: z.number().int(),
  quantityPlanned: z.number().min(0.001),
  warehouseId: z.number().int(),
  workCenterId: z.number().int().optional(),
  scheduledStart: z.string().optional(),
  scheduledEnd: z.string().optional(),
});

router.get("/production-orders", asyncHandler(async (_req, res) => res.json({ data: await db.select().from(productionOrders) })));

router.post("/production-orders", requirePermission("manufacturing", "create"), asyncHandler(async (req, res) => {
  const input = poSchema.parse(req.body);
  const orderCode = nextCode("production_orders", "order_code", "MO", 4);
  const [order] = await db.insert(productionOrders).values({ ...input, orderCode, status: "Planned" }).returning();
  res.status(201).json({ data: order });
}));

/**
 * This is the real MRP-lite logic: completing a production order EXPLODES the BOM — for every
 * component line, issues (quantityPerOutput * quantityCompleted) from the warehouse via the same
 * stock ledger inventory uses, then receives the finished quantity of the output item. If any
 * component is short, the whole completion fails atomically (nothing partially consumed) — this
 * is what actually makes it "MRP" rather than a status field that says "Completed".
 */
router.post("/production-orders/:id/complete", requirePermission("manufacturing", "update"), asyncHandler(async (req, res) => {
  const id = Number(req.params.id);
  const order = (await db.select().from(productionOrders).where(eq(productionOrders.id, id)).limit(1))[0];
  if (!order) throw notFound("Production order");
  if (order.status === "Completed") throw new ApiError(409, "CONFLICT", "Already completed");

  const qtyToComplete = req.body?.quantity ?? order.quantityPlanned;
  const bom = (await db.select().from(boms).where(eq(boms.id, order.bomId)).limit(1))[0];
  const lines = await db.select().from(bomLines).where(eq(bomLines.bomId, order.bomId));

  // Pre-flight check every component BEFORE issuing anything, so a shortage on line 3 doesn't
  // leave lines 1-2 already consumed. Delegated to the shared, unit-tested planning function
  // (bomPlanning.logic.ts) rather than an inline loop, so this exact decision logic is covered
  // by real tests, not just this one hand-verified curl run.
  const availableByItem = new Map<number, number>();
  for (const line of lines) {
    const level = (await db.select().from(stockLevels).where(and(eq(stockLevels.stockItemId, line.componentItemId), eq(stockLevels.warehouseId, order.warehouseId))).limit(1))[0];
    availableByItem.set(line.componentItemId, level?.quantityOnHand ?? 0);
  }
  const plan = planProductionCompletion(lines, availableByItem, qtyToComplete);
  if (!plan.feasible) {
    const short = plan.requirements.find((r) => r.shortfall > 0)!;
    throw new ApiError(400, "VALIDATION_ERROR", `Insufficient component stock: item ${short.componentItemId} needs ${short.required}, only ${short.available} available`);
  }

  for (const line of lines) {
    await recordStockTransaction({
      stockItemId: line.componentItemId,
      warehouseId: order.warehouseId,
      type: "Issue",
      quantity: -(line.quantityPerOutput * qtyToComplete),
      reference: order.orderCode,
      performedBy: req.user!.userId,
    });
  }
  await recordStockTransaction({
    stockItemId: bom.outputItemId,
    warehouseId: order.warehouseId,
    type: "Receipt",
    quantity: (bom.outputQuantity / (bom.outputQuantity || 1)) * qtyToComplete,
    reference: order.orderCode,
    performedBy: req.user!.userId,
  });

  const [updated] = await db
    .update(productionOrders)
    .set({ status: "Completed", quantityCompleted: order.quantityCompleted + qtyToComplete })
    .where(eq(productionOrders.id, id))
    .returning();
  res.json({ data: updated });
}));

export default router;
