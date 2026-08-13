import { db } from "../../db/client";
import { roles, permissions, rolePermissions } from "../../db/schema";
import { eq } from "drizzle-orm";
import { notFound, conflict } from "../../middleware/errorHandler.middleware";
import { writeAudit } from "../../lib/audit";
import { CreateRoleInput, UpdateRolePermissionsInput } from "./rbac.schema";

export async function getMatrix() {
  const [roleRows, permissionRows, grantRows] = await Promise.all([
    db.select().from(roles).orderBy(roles.name),
    db.select().from(permissions).orderBy(permissions.module, permissions.action),
    db.select().from(rolePermissions),
  ]);
  return { roles: roleRows, permissions: permissionRows, grants: grantRows };
}

export async function createRole(input: CreateRoleInput, actorUserId: number) {
  const existing = (await db.select().from(roles).where(eq(roles.name, input.name)).limit(1))[0];
  if (existing) throw conflict("A role with this name already exists");
  const [row] = await db.insert(roles).values(input).returning();
  await writeAudit({ userId: actorUserId, entityType: "rbac", entityId: row.id, action: "create", after: row });
  return row;
}

export async function updateRolePermissions(roleId: number, input: UpdateRolePermissionsInput, actorUserId: number) {
  const role = (await db.select().from(roles).where(eq(roles.id, roleId)).limit(1))[0];
  if (!role) throw notFound("Role");

  const before = await db.select().from(rolePermissions).where(eq(rolePermissions.roleId, roleId));
  await db.delete(rolePermissions).where(eq(rolePermissions.roleId, roleId));
  if (input.permissionIds.length > 0) {
    await db.insert(rolePermissions).values(input.permissionIds.map((permissionId) => ({ roleId, permissionId })));
  }

  await writeAudit({
    userId: actorUserId,
    entityType: "rbac",
    entityId: roleId,
    action: "permission_change",
    before: before.map((b) => b.permissionId),
    after: input.permissionIds,
  });

  return getMatrix();
}
