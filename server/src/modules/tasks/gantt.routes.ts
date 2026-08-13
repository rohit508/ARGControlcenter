import { Router } from "express";
import { db } from "../../db/client";
import { tasks } from "../../db/schema";
import { eq, and, isNull } from "drizzle-orm";
import { asyncHandler } from "../../middleware/errorHandler.middleware";
import { authenticate } from "../../middleware/auth.middleware";

const router = Router();
router.use(authenticate);

// Portfolio-wide Gantt (no :projectId) or scoped to one project. Registered before the generic
// /:id in projects.routes.ts is irrelevant here since this lives on its own router, mounted at
// /api/v1/gantt in server.ts — no route-shadowing risk like the earlier heatmap/search bugs.
router.get(
  "/",
  asyncHandler(async (req, res) => {
    const conditions = [isNull(tasks.deletedAt)];
    if (req.query.projectId) conditions.push(eq(tasks.projectId, Number(req.query.projectId)));
    const rows = await db
      .select({
        id: tasks.id,
        taskCode: tasks.taskCode,
        projectId: tasks.projectId,
        name: tasks.name,
        status: tasks.status,
        startDate: tasks.startDate,
        finishDate: tasks.finishDate,
        progressPct: tasks.progressPct,
        isCriticalCache: tasks.isCriticalCache,
        isMilestone: tasks.isMilestone,
        parentTaskId: tasks.parentTaskId,
      })
      .from(tasks)
      .where(and(...conditions))
      .orderBy(tasks.startDate);
    res.json({ data: rows });
  })
);

export default router;
