import { Router } from "express";
import { z } from "zod";
import { db } from "../../db/client";
import { warehouses, stockItems, stockLevels, stockTransactions } from "../../db/schema";
import { eq, and, lte, sql } from "drizzle-orm";
import { asyncHandler } from "../../middleware/errorHandler.middleware";
import { authenticate } from "../../middleware/auth.middleware";
import { requirePermission } from "../../middleware/rbac.middleware";
import * as inventoryService from "./inventory.service";
import { nextCode } from "../../lib/codeGenerator";

const router = Router();
router.use(authenticate);

const warehouseSchema = z.object({ name: z.string().min(1), location: z.string().optional() });
router.get("/warehouses", asyncHandler(async (_req, res) => res.json({ data: await db.select().from(warehouses) })));
router.post("/warehouses", requirePermission("inventory", "create"), asyncHandler(async (req, res) => {
  const input = warehouseSchema.parse(req.body);
  const code = nextCode("warehouses", "code", "WH", 3);
  const [row] = await db.insert(warehouses).values({ ...input, code }).returning();
  res.status(201).json({ data: row });
}));

const itemSchema = z.object({
  name: z.string().min(1),
  category: z.string().optional(),
  unitOfMeasure: z.string().default("ea"),
  reorderPoint: z.number().min(0).default(0),
  standardCost: z.number().min(0).default(0),
});
router.get("/items", asyncHandler(async (_req, res) => {
  const items = await db.select().from(stockItems);
  const levels = await db.select().from(stockLevels);
  const data = items.map((it) => ({
    ...it,
    totalOnHand: levels.filter((l) => l.stockItemId === it.id).reduce((s, l) => s + l.quantityOnHand, 0),
    belowReorderPoint: levels.filter((l) => l.stockItemId === it.id).reduce((s, l) => s + l.quantityOnHand, 0) < it.reorderPoint,
  }));
  res.json({ data, meta: { total: data.length } });
}));
router.post("/items", requirePermission("inventory", "create"), asyncHandler(async (req, res) => {
  const input = itemSchema.parse(req.body);
  const sku = nextCode("stock_items", "sku", "SKU", 4);
  const [row] = await db.insert(stockItems).values({ ...input, sku }).returning();
  res.status(201).json({ data: row });
}));

router.get("/levels", asyncHandler(async (req, res) => {
  const conditions = [];
  if (req.query.warehouseId) conditions.push(eq(stockLevels.warehouseId, Number(req.query.warehouseId)));
  const rows = conditions.length ? await db.select().from(stockLevels).where(and(...conditions)) : await db.select().from(stockLevels);
  res.json({ data: rows });
}));

router.get("/low-stock", asyncHandler(async (_req, res) => {
  const items = await db.select().from(stockItems);
  const levels = await db.select().from(stockLevels);
  const low = items
    .map((it) => ({ ...it, totalOnHand: levels.filter((l) => l.stockItemId === it.id).reduce((s, l) => s + l.quantityOnHand, 0) }))
    .filter((it) => it.totalOnHand < it.reorderPoint);
  res.json({ data: low });
}));

const txnSchema = z.object({
  stockItemId: z.number().int(),
  warehouseId: z.number().int(),
  type: z.enum(["Receipt", "Issue", "Transfer", "Adjustment", "CycleCount"]),
  quantity: z.number(),
  reference: z.string().optional(),
});
router.get("/transactions", asyncHandler(async (req, res) => {
  const conditions = [];
  if (req.query.stockItemId) conditions.push(eq(stockTransactions.stockItemId, Number(req.query.stockItemId)));
  const rows = conditions.length ? await db.select().from(stockTransactions).where(and(...conditions)) : await db.select().from(stockTransactions);
  res.json({ data: rows });
}));
router.post("/transactions", requirePermission("inventory", "create"), asyncHandler(async (req, res) => {
  const input = txnSchema.parse(req.body);
  const result = await inventoryService.recordStockTransaction({ ...input, performedBy: req.user!.userId });
  res.status(201).json({ data: result });
}));

export default router;
