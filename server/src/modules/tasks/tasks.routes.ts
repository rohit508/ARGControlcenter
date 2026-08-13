import { Router } from "express";
import * as service from "./tasks.service";
import { createTaskSchema, updateTaskSchema, updateProgressSchema } from "./tasks.schema";
import { asyncHandler } from "../../middleware/errorHandler.middleware";
import { authenticate } from "../../middleware/auth.middleware";
import { requirePermission } from "../../middleware/rbac.middleware";

const router = Router();
router.use(authenticate);

router.get(
  "/",
  asyncHandler(async (req, res) => {
    const projectId = req.query.projectId ? Number(req.query.projectId) : undefined;
    const data = await service.listTasks(projectId);
    res.json({ data, meta: { total: data.length } });
  })
);

router.get(
  "/:id",
  asyncHandler(async (req, res) => {
    res.json({ data: await service.getTask(Number(req.params.id)) });
  })
);

router.post(
  "/",
  requirePermission("tasks", "create"),
  asyncHandler(async (req, res) => {
    const input = createTaskSchema.parse(req.body);
    const task = await service.createTask(input, req.user!.userId);
    res.status(201).json({ data: task });
  })
);

router.patch(
  "/:id",
  requirePermission("tasks", "update"),
  asyncHandler(async (req, res) => {
    const input = updateTaskSchema.parse(req.body);
    const task = await service.updateTask(Number(req.params.id), input, req.user!.userId);
    res.json({ data: task });
  })
);

router.patch(
  "/:id/progress",
  requirePermission("tasks", "update"),
  asyncHandler(async (req, res) => {
    const { progressPct } = updateProgressSchema.parse(req.body);
    const task = await service.updateTaskProgress(Number(req.params.id), progressPct, req.user!.userId);
    res.json({ data: task });
  })
);

router.delete(
  "/:id",
  requirePermission("tasks", "delete"),
  asyncHandler(async (req, res) => {
    await service.deleteTask(Number(req.params.id), req.user!.userId);
    res.status(204).send();
  })
);

export default router;
