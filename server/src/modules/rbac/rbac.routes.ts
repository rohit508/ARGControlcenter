import { Router } from "express";
import * as service from "./rbac.service";
import { createRoleSchema, updateRolePermissionsSchema } from "./rbac.schema";
import { asyncHandler } from "../../middleware/errorHandler.middleware";
import { authenticate } from "../../middleware/auth.middleware";
import { requirePermission } from "../../middleware/rbac.middleware";

const router = Router();
router.use(authenticate);

router.get(
  "/matrix",
  asyncHandler(async (_req, res) => {
    res.json({ data: await service.getMatrix() });
  })
);

router.post(
  "/roles",
  requirePermission("rbac", "create"),
  asyncHandler(async (req, res) => {
    const input = createRoleSchema.parse(req.body);
    const row = await service.createRole(input, req.user!.userId);
    res.status(201).json({ data: row });
  })
);

router.put(
  "/roles/:roleId/permissions",
  requirePermission("rbac", "update"),
  asyncHandler(async (req, res) => {
    const input = updateRolePermissionsSchema.parse(req.body);
    const data = await service.updateRolePermissions(Number(req.params.roleId), input, req.user!.userId);
    res.json({ data });
  })
);

export default router;
