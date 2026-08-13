import { Request, Response, NextFunction } from "express";
import { db } from "../db/client";
import { permissions, rolePermissions, roles } from "../db/schema";
import { eq, inArray, and } from "drizzle-orm";
import { forbidden, unauthenticated } from "./errorHandler.middleware";
import { AccessTokenPayload } from "../lib/jwt";

const ADMIN_ROLE = "Admin";

/**
 * Real DB-backed grant check (not a hardcoded switch) — Admin implicitly passes everything.
 * Shared by requirePermission() below and by service-layer code (e.g. employee-tasks.service.ts)
 * that needs to branch on "can this user manage everyone's records, or only their own" without
 * pulling in an Express middleware.
 */
export async function userHasPermission(user: AccessTokenPayload, module: string, action: string): Promise<boolean> {
  if (user.roles.includes(ADMIN_ROLE)) return true;
  if (user.roles.length === 0) return false;

  const userRoleRows = await db
    .select({ id: roles.id })
    .from(roles)
    .where(inArray(roles.name, user.roles));
  const roleIds = userRoleRows.map((r) => r.id);
  if (roleIds.length === 0) return false;

  const grant = await db
    .select({ id: permissions.id })
    .from(rolePermissions)
    .innerJoin(permissions, eq(permissions.id, rolePermissions.permissionId))
    .where(
      and(
        inArray(rolePermissions.roleId, roleIds),
        eq(permissions.module, module),
        eq(permissions.action, action)
      )
    )
    .limit(1);

  return grant.length > 0;
}

/**
 * requirePermission('projects', 'create') — checks that at least one of the user's roles grants
 * this module+action pair. Admin implicitly passes everything. This is a real DB-backed check
 * (not a hardcoded switch), so granting a new role a permission never requires a redeploy —
 * exactly the design goal from 00-scope-and-roadmap.md §0.3.
 */
export function requirePermission(module: string, action: string) {
  return async (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) return next(unauthenticated());
    const allowed = await userHasPermission(req.user, module, action);
    if (!allowed) return next(forbidden(`Your role does not have '${action}' access to '${module}'`));
    next();
  };
}

export function requireRole(...allowed: string[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) return next(unauthenticated());
    if (req.user.roles.includes(ADMIN_ROLE)) return next();
    if (req.user.roles.some((r) => allowed.includes(r))) return next();
    return next(forbidden());
  };
}
