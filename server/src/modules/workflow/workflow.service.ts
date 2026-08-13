import { db } from "../../db/client";
import { workflowDefinitions, workflowInstances, workflowActions } from "../../db/schema";
import { eq } from "drizzle-orm";
import { ApiError, notFound } from "../../middleware/errorHandler.middleware";
import { writeAudit } from "../../lib/audit";

export interface WorkflowStep {
  step: number;
  name: string;
  approverRole: string;
  slaHours?: number;
}

/**
 * Genuinely generic: a workflow_definition's steps are JSON data, not a switch statement. Adding
 * a new approval flow (e.g. Purchase Order approval in Phase 2) means inserting a row, not
 * shipping code — this is the direct implementation of 00-scope-and-roadmap.md §0.4.
 */
export async function submitForApproval(params: { workflowCode: string; entityType: string; entityId: number; userId: number }) {
  const def = (await db.select().from(workflowDefinitions).where(eq(workflowDefinitions.code, params.workflowCode)).limit(1))[0];
  if (!def) throw notFound("Workflow definition");
  const steps: WorkflowStep[] = JSON.parse(def.stepsJson);
  if (steps.length === 0) throw new ApiError(400, "VALIDATION_ERROR", "Workflow has no steps configured");

  const [instance] = await db
    .insert(workflowInstances)
    .values({
      workflowDefinitionId: def.id,
      entityType: params.entityType,
      entityId: params.entityId,
      currentStep: 1,
      status: "pending",
    })
    .returning();

  await db.insert(workflowActions).values({
    workflowInstanceId: instance.id,
    step: 1,
    action: "submit",
    actorUserId: params.userId,
  });
  await writeAudit({ userId: params.userId, entityType: "workflow_instance", entityId: instance.id, action: "create", after: instance });
  return instance;
}

export async function act(params: {
  instanceId: number;
  userId: number;
  userRoles: string[];
  action: "approve" | "reject";
  comment?: string;
}) {
  const instance = (await db.select().from(workflowInstances).where(eq(workflowInstances.id, params.instanceId)).limit(1))[0];
  if (!instance) throw notFound("Workflow instance");
  if (instance.status !== "pending") throw new ApiError(409, "CONFLICT", `Workflow is already ${instance.status}`);

  const def = (await db.select().from(workflowDefinitions).where(eq(workflowDefinitions.id, instance.workflowDefinitionId)).limit(1))[0];
  const steps: WorkflowStep[] = JSON.parse(def.stepsJson);
  const currentStepDef = steps.find((s) => s.step === instance.currentStep);
  if (!currentStepDef) throw new ApiError(500, "INTERNAL_ERROR", "Workflow step configuration missing");

  const authorized = params.userRoles.includes("Admin") || params.userRoles.includes(currentStepDef.approverRole);
  if (!authorized) {
    throw new ApiError(403, "FORBIDDEN", `Only '${currentStepDef.approverRole}' can act on step ${instance.currentStep}`);
  }

  await db.insert(workflowActions).values({
    workflowInstanceId: instance.id,
    step: instance.currentStep,
    action: params.action,
    actorUserId: params.userId,
    comment: params.comment,
  });

  if (params.action === "reject") {
    await db.update(workflowInstances).set({ status: "rejected" }).where(eq(workflowInstances.id, instance.id));
    await writeAudit({ userId: params.userId, entityType: "workflow_instance", entityId: instance.id, action: "reject", before: instance });
    return { ...instance, status: "rejected" };
  }

  const isLastStep = instance.currentStep >= Math.max(...steps.map((s) => s.step));
  const updated = isLastStep
    ? { status: "approved" as const, currentStep: instance.currentStep }
    : { status: "pending" as const, currentStep: instance.currentStep + 1, enteredStepAt: new Date() };

  await db.update(workflowInstances).set(updated).where(eq(workflowInstances.id, instance.id));
  await writeAudit({ userId: params.userId, entityType: "workflow_instance", entityId: instance.id, action: "approve", before: instance, after: updated });
  return { ...instance, ...updated };
}

/** My Approvals inbox: pending instances where the current step's approverRole is one of mine. */
export async function pendingFor(userRoles: string[]) {
  const pending = await db.select().from(workflowInstances).where(eq(workflowInstances.status, "pending"));
  const results = [];
  for (const inst of pending) {
    const def = (await db.select().from(workflowDefinitions).where(eq(workflowDefinitions.id, inst.workflowDefinitionId)).limit(1))[0];
    const steps: WorkflowStep[] = JSON.parse(def.stepsJson);
    const currentStepDef = steps.find((s) => s.step === inst.currentStep);
    if (currentStepDef && (userRoles.includes("Admin") || userRoles.includes(currentStepDef.approverRole))) {
      results.push({ ...inst, stepName: currentStepDef.name, approverRole: currentStepDef.approverRole });
    }
  }
  return results;
}
