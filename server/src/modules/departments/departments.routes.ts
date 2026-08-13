import { Router } from "express";
import { db } from "../../db/client";
import { departments } from "../../db/schema";
import { asyncHandler } from "../../middleware/errorHandler.middleware";
import { authenticate } from "../../middleware/auth.middleware";

const router = Router();
router.use(authenticate);

router.get(
  "/",
  asyncHandler(async (_req, res) => {
    const data = await db.select().from(departments).orderBy(departments.name);
    res.json({ data, meta: { total: data.length } });
  })
);

export default router;
