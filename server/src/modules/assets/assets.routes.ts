import { z } from "zod";
import { db } from "../../db/client";
import { assets, maintenanceLogs } from "../../db/schema";
import { eq } from "drizzle-orm";
import { buildCrudRouter } from "../../lib/crudFactory";
import { asyncHandler } from "../../middleware/errorHandler.middleware";
import { computeDepreciation } from "./depreciation.logic";

function round2(n: number) { return Math.round(n * 100) / 100; }

const assetSchema = z.object({
  name: z.string().min(1),
  category: z.string().optional(),
  purchaseDate: z.string().min(1),
  purchaseCost: z.number().min(0),
  usefulLifeYears: z.number().min(0.1).default(5),
  salvageValue: z.number().min(0).default(0),
  location: z.string().optional(),
  assignedTo: z.number().int().optional(),
  projectId: z.number().int().optional(),
  status: z.enum(["Active", "Under Maintenance", "Disposed"]).default("Active"),
});

const router = buildCrudRouter({
  table: assets,
  tableName: "assets",
  entityType: "assets",
  createSchema: assetSchema,
  updateSchema: assetSchema.partial(),
  codeColumn: "assetCode",
  codePrefix: "AST",
  extraRoutes: (router) => {
    router.get("/register", asyncHandler(async (_req, res) => {
      const rows = await db.select().from(assets);
      const data = rows.map((a) => ({ ...a, ...computeDepreciation(a) }));
      const totals = data.reduce((acc, a) => ({ cost: acc.cost + a.purchaseCost, nbv: acc.nbv + a.netBookValue }), { cost: 0, nbv: 0 });
      res.json({ data, meta: { totalCost: round2(totals.cost), totalNetBookValue: round2(totals.nbv) } });
    }));

    router.get("/maintenance", asyncHandler(async (_req, res) => {
      res.json({ data: await db.select().from(maintenanceLogs) });
    }));
    const maintSchema = z.object({ assetId: z.number().int(), scheduledDate: z.string().min(1), type: z.enum(["Preventive", "Corrective"]).default("Preventive") });
    router.post("/maintenance", asyncHandler(async (req, res) => {
      const input = maintSchema.parse(req.body);
      const [row] = await db.insert(maintenanceLogs).values(input).returning();
      res.status(201).json({ data: row });
    }));
    router.post("/maintenance/:id/complete", asyncHandler(async (req, res) => {
      const id = Number(req.params.id);
      const cost = Number(req.body?.cost || 0);
      const [row] = await db.update(maintenanceLogs).set({ status: "Completed", completedDate: new Date().toISOString().slice(0, 10), cost }).where(eq(maintenanceLogs.id, id)).returning();
      res.json({ data: row });
    }));
  },
});

export default router;
