import { Router } from "express";
import { z } from "zod";
import * as service from "./projects.service";
import { createProjectSchema, updateProjectSchema } from "./projects.schema";
import { asyncHandler, ApiError } from "../../middleware/errorHandler.middleware";
import { authenticate } from "../../middleware/auth.middleware";
import { requirePermission } from "../../middleware/rbac.middleware";
import { scopedProjectIds } from "../../lib/scopeResolver";

const router = Router();
router.use(authenticate);

router.get(
  "/",
  asyncHandler(async (req, res) => {
    const scopeIds = await scopedProjectIds(req.user!);
    const status = typeof req.query["filter[status]"] === "string" ? (req.query["filter[status]"] as string) : undefined;
    const health = typeof req.query["filter[health]"] === "string" ? (req.query["filter[health]"] as string) : undefined;
    const data = await service.listProjects(scopeIds, { status, health });
    res.json({ data, meta: { total: data.length } });
  })
);

router.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const project = await service.getProject(Number(req.params.id));
    res.json({ data: project });
  })
);

router.post(
  "/",
  requirePermission("projects", "create"),
  asyncHandler(async (req, res) => {
    const input = createProjectSchema.parse(req.body);
    const project = await service.createProject(input, req.user!.userId);
    res.status(201).json({ data: project });
  })
);

router.patch(
  "/:id",
  requirePermission("projects", "update"),
  asyncHandler(async (req, res) => {
    const input = updateProjectSchema.parse(req.body);
    const project = await service.updateProject(Number(req.params.id), input, req.user!.userId);
    res.json({ data: project });
  })
);

router.delete(
  "/:id",
  requirePermission("projects", "delete"),
  asyncHandler(async (req, res) => {
    await service.deleteProject(Number(req.params.id), req.user!.userId);
    res.status(204).send();
  })
);

router.post(
  "/:id/recalculate",
  asyncHandler(async (req, res) => {
    await service.recalculateProject(Number(req.params.id));
    const project = await service.getProject(Number(req.params.id));
    res.json({ data: project });
  })
);

export default router;
