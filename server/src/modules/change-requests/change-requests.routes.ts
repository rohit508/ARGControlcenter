import { z } from "zod";
import { db } from "../../db/client";
import { changeRequests } from "../../db/schema";
import { eq } from "drizzle-orm";
import { buildCrudRouter } from "../../lib/crudFactory";
import { asyncHandler, notFound, ApiError } from "../../middleware/errorHandler.middleware";
import * as workflowService from "../workflow/workflow.service";
import { Request, Response } from "express";

const baseSchema = z.object({
  projectId: z.number().int(),
  description: z.string().min(1),
  impact: z.enum(["Schedule", "Cost", "Scope", "Schedule & Cost"]).optional(),
  approvalStatus: z.enum(["Pending", "Approved", "Rejected"]).default("Pending"),
  ownerId: z.number().int().optional(),
  approvalDate: z.string().optional(),
  implementationDate: z.string().optional(),
  status: z.string().default("Under Review"),
});

export default buildCrudRouter({
  table: changeRequests,
  tableName: "change_requests",
  entityType: "change-requests",
  createSchema: baseSchema,
  updateSchema: baseSchema.partial(),
  codeColumn: "changeCode",
  codePrefix: "CHG",
  projectScoped: true,
  extraRoutes: (router) => {
    // These three routes are the concrete, working instance of the generic workflow engine
    // described in 00-scope-and-roadmap.md §0.4 — Change Requests are the first entity wired to
    // it; Purchase Orders (Phase 2) reuse the exact same workflowService with a different
    // workflow_definitions row, not new code.
    router.post(
      "/:id/submit",
      asyncHandler(async (req, res) => {
        const id = Number(req.params.id);
        const cr = (await db.select().from(changeRequests).where(eq(changeRequests.id, id)).limit(1))[0];
        if (!cr) throw notFound("Change request");
        if (cr.workflowInstanceId) throw new ApiError(409, "CONFLICT", "Already submitted for approval");

        const instance = await workflowService.submitForApproval({
          workflowCode: "change_request_approval",
          entityType: "change_request",
          entityId: id,
          userId: req.user!.userId,
        });
        await db.update(changeRequests).set({ workflowInstanceId: instance.id, status: "Under Review" }).where(eq(changeRequests.id, id));
        res.json({ data: { ...cr, workflowInstanceId: instance.id, status: "Under Review" } });
      })
    );

    router.post(
      "/:id/approve",
      asyncHandler(async (req, res) => {
        await actOnChangeRequest(req, res, "approve");
      })
    );

    router.post(
      "/:id/reject",
      asyncHandler(async (req, res) => {
        await actOnChangeRequest(req, res, "reject");
      })
    );
  },
});

async function actOnChangeRequest(req: Request, res: Response, action: "approve" | "reject") {
  const id = Number(req.params.id);
  const cr = (await db.select().from(changeRequests).where(eq(changeRequests.id, id)).limit(1))[0];
  if (!cr) throw notFound("Change request");
  if (!cr.workflowInstanceId) throw new ApiError(400, "VALIDATION_ERROR", "This change request has not been submitted for approval yet");

  const result = await workflowService.act({
    instanceId: cr.workflowInstanceId,
    userId: req.user!.userId,
    userRoles: req.user!.roles,
    action,
    comment: req.body?.comment,
  });

  // Reflect the workflow's outcome back onto the business record — only fully "Approved" once
  // every step in the workflow has signed off; a mid-flow approval keeps it Pending.
  const approvalStatus = result.status === "approved" ? "Approved" : result.status === "rejected" ? "Rejected" : "Pending";
  const status = result.status === "approved" ? "Implemented" : result.status === "rejected" ? "Closed" : "Under Review";
  await db
    .update(changeRequests)
    .set({ approvalStatus, status, approvalDate: result.status === "approved" ? new Date().toISOString().slice(0, 10) : cr.approvalDate })
    .where(eq(changeRequests.id, id));

  res.json({ data: { workflowInstance: result, approvalStatus, status } });
}
