import { db } from "../../db/client";
import { stockLevels, stockTransactions, stockItems } from "../../db/schema";
import { eq, and } from "drizzle-orm";
import { ApiError } from "../../middleware/errorHandler.middleware";

/**
 * The only legitimate way stock quantity changes. Every call appends to the immutable
 * stock_transactions ledger AND updates the materialized stock_levels row in the same operation
 * — the level is always a cache of the ledger, never hand-edited, so "how did we end up with this
 * quantity" always has an answer.
 */
export async function recordStockTransaction(params: {
  stockItemId: number;
  warehouseId: number;
  type: "Receipt" | "Issue" | "Transfer" | "Adjustment" | "CycleCount";
  quantity: number; // signed
  reference?: string;
  performedBy: number;
}) {
  const item = (await db.select().from(stockItems).where(eq(stockItems.id, params.stockItemId)).limit(1))[0];
  if (!item) throw new ApiError(400, "VALIDATION_ERROR", "Unknown stock item");

  const existing = (
    await db.select().from(stockLevels).where(and(eq(stockLevels.stockItemId, params.stockItemId), eq(stockLevels.warehouseId, params.warehouseId))).limit(1)
  )[0];
  const currentQty = existing?.quantityOnHand ?? 0;
  const newQty = currentQty + params.quantity;

  if (newQty < 0) {
    throw new ApiError(400, "VALIDATION_ERROR", `Insufficient stock: ${item.name} has ${currentQty} on hand, cannot remove ${-params.quantity}`);
  }

  await db.insert(stockTransactions).values({
    stockItemId: params.stockItemId,
    warehouseId: params.warehouseId,
    type: params.type,
    quantity: params.quantity,
    reference: params.reference,
    performedBy: params.performedBy,
  });

  if (existing) {
    await db.update(stockLevels).set({ quantityOnHand: newQty }).where(eq(stockLevels.id, existing.id));
  } else {
    await db.insert(stockLevels).values({ stockItemId: params.stockItemId, warehouseId: params.warehouseId, quantityOnHand: newQty });
  }
  return { quantityOnHand: newQty };
}
