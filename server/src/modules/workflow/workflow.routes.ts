import { Router } from "express";
import { z } from "zod";
import * as workflowService from "./workflow.service";
import { asyncHandler } from "../../middleware/errorHandler.middleware";
import { authenticate } from "../../middleware/auth.middleware";

const router = Router();
router.use(authenticate);

router.get(
  "/pending",
  asyncHandler(async (req, res) => {
    const data = await workflowService.pendingFor(req.user!.roles);
    res.json({ data });
  })
);

const actSchema = z.object({ action: z.enum(["approve", "reject"]), comment: z.string().optional() });

router.post(
  "/:instanceId/act",
  asyncHandler(async (req, res) => {
    const { action, comment } = actSchema.parse(req.body);
    const result = await workflowService.act({
      instanceId: Number(req.params.instanceId),
      userId: req.user!.userId,
      userRoles: req.user!.roles,
      action,
      comment,
    });
    res.json({ data: result });
  })
);

export default router;
