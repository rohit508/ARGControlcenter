import { Router } from "express";
import { z } from "zod";
import { db } from "../../db/client";
import { lookupLists, lookupValues } from "../../db/schema";
import { eq } from "drizzle-orm";
import { asyncHandler, notFound } from "../../middleware/errorHandler.middleware";
import { authenticate } from "../../middleware/auth.middleware";
import { requirePermission } from "../../middleware/rbac.middleware";

const router = Router();
router.use(authenticate);

router.get(
  "/",
  asyncHandler(async (_req, res) => {
    const lists = await db.select().from(lookupLists);
    const values = await db.select().from(lookupValues).where(eq(lookupValues.isActive, true));
    const data = lists.map((l) => ({ ...l, values: values.filter((v) => v.lookupListId === l.id) }));
    res.json({ data });
  })
);

router.get(
  "/:code",
  asyncHandler(async (req, res) => {
    const list = (await db.select().from(lookupLists).where(eq(lookupLists.code, req.params.code)).limit(1))[0];
    if (!list) throw notFound("Lookup list");
    const values = await db
      .select()
      .from(lookupValues)
      .where(eq(lookupValues.lookupListId, list.id));
    res.json({ data: { ...list, values } });
  })
);

const addValueSchema = z.object({ value: z.string().min(1), sortOrder: z.number().int().optional() });

router.post(
  "/:code/values",
  requirePermission("configuration", "update"),
  asyncHandler(async (req, res) => {
    const list = (await db.select().from(lookupLists).where(eq(lookupLists.code, req.params.code)).limit(1))[0];
    if (!list) throw notFound("Lookup list");
    const input = addValueSchema.parse(req.body);
    const [row] = await db
      .insert(lookupValues)
      .values({ lookupListId: list.id, value: input.value, sortOrder: input.sortOrder ?? 0 })
      .returning();
    res.status(201).json({ data: row });
  })
);

export default router;
