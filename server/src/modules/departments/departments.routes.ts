import { Router } from "express";
import { z } from "zod";
import { db } from "../../db/client";
import { departments } from "../../db/schema";
import { eq } from "drizzle-orm";
import { asyncHandler } from "../../middleware/errorHandler.middleware";
import { authenticate } from "../../middleware/auth.middleware";
import { requireRole } from "../../middleware/rbac.middleware";
import { conflict } from "../../middleware/errorHandler.middleware";

const router = Router();
router.use(authenticate);

router.get(
  "/",
  asyncHandler(async (_req, res) => {
    const data = await db.select().from(departments).orderBy(departments.name);
    res.json({ data, meta: { total: data.length } });
  })
);

const createDepartmentSchema = z.object({ name: z.string().trim().min(1), parentId: z.number().int().optional() });

router.post(
  "/",
  requireRole("Admin"),
  asyncHandler(async (req, res) => {
    const input = createDepartmentSchema.parse(req.body);
    const existing = (await db.select().from(departments).where(eq(departments.name, input.name)).limit(1))[0];
    if (existing) throw conflict("A department with this name already exists");
    const [row] = await db.insert(departments).values(input).returning();
    res.status(201).json({ data: row });
  })
);

export default router;
