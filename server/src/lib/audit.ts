import { db } from "../db/client";
import { auditLog } from "../db/schema";

/**
 * Called from the service layer (not controllers) after every create/update/delete/approve — one
 * funnel, so nothing gets missed. Kept as an explicit call rather than fully-generic Express
 * middleware because reliably capturing accurate before/after state generically (across 12+
 * differently-shaped entities) is fragile; an explicit one-line call per service mutation is more
 * honest about what's actually being recorded.
 */
export async function writeAudit(params: {
  userId: number | null;
  entityType: string;
  entityId: number;
  action: "create" | "update" | "delete" | "approve" | "reject" | "login" | "permission_change";
  before?: unknown;
  after?: unknown;
  reason?: string | null;
  ipAddress?: string | null;
}) {
  await db.insert(auditLog).values({
    userId: params.userId,
    entityType: params.entityType,
    entityId: params.entityId,
    action: params.action,
    beforeJson: params.before !== undefined ? JSON.stringify(params.before) : null,
    afterJson: params.after !== undefined ? JSON.stringify(params.after) : null,
    reason: params.reason ?? null,
    ipAddress: params.ipAddress ?? null,
  });
}
