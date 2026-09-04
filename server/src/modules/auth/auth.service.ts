import bcrypt from "bcryptjs";
import { db } from "../../db/client";
import { users, userRoles, roles, refreshTokens, permissions, rolePermissions, employees } from "../../db/schema";
import { eq, inArray } from "drizzle-orm";
import { signAccessToken, signRefreshToken, verifyRefreshToken } from "../../lib/jwt";
import { ApiError } from "../../middleware/errorHandler.middleware";
import { writeAudit } from "../../lib/audit";
import crypto from "crypto";

async function getUserRoles(userId: number): Promise<string[]> {
  const rows = await db
    .select({ name: roles.name })
    .from(userRoles)
    .innerJoin(roles, eq(roles.id, userRoles.roleId))
    .where(eq(userRoles.userId, userId));
  return rows.map((r) => r.name);
}

// Access tokens carry roles only (see lib/jwt.ts) — permissions are looked up fresh here so a
// role's grants can change without forcing a re-login; the client picks up the new set on its
// next login or /auth/me refetch (consistent with this app's polling-based refresh model).
export interface EffectivePermission {
  module: string;
  actions: string[];
}

async function getEffectivePermissions(roleNames: string[]): Promise<EffectivePermission[]> {
  let rows: { module: string; action: string }[];
  if (roleNames.includes("Admin")) {
    rows = await db.select({ module: permissions.module, action: permissions.action }).from(permissions);
  } else if (roleNames.length === 0) {
    rows = [];
  } else {
    const roleRows = await db.select({ id: roles.id }).from(roles).where(inArray(roles.name, roleNames));
    const roleIds = roleRows.map((r) => r.id);
    rows =
      roleIds.length === 0
        ? []
        : await db
            .select({ module: permissions.module, action: permissions.action })
            .from(rolePermissions)
            .innerJoin(permissions, eq(permissions.id, rolePermissions.permissionId))
            .where(inArray(rolePermissions.roleId, roleIds));
  }

  const byModule = new Map<string, Set<string>>();
  for (const r of rows) {
    if (!byModule.has(r.module)) byModule.set(r.module, new Set());
    byModule.get(r.module)!.add(r.action);
  }
  return [...byModule.entries()].map(([module, actions]) => ({ module, actions: [...actions] }));
}

function hashToken(token: string) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

async function getEmployeeName(employeeId: number | null): Promise<string | null> {
  if (!employeeId) return null;
  const rows = await db.select({ fullName: employees.fullName }).from(employees).where(eq(employees.id, employeeId)).limit(1);
  return rows[0]?.fullName ?? null;
}

// One-off login aliases: lets a specific account sign in with a short name instead of typing its
// full email, without turning login into a general username system for everyone. users.email
// stays the real identifier everywhere else (audit log, JWT payload, /me, uniqueness) — this only
// resolves the alias to that email before the normal lookup below.
const LOGIN_ALIASES: Record<string, string> = {
  argadmin: "argadmin@erp.local",
};

export async function login(rawEmail: string, password: string, ip: string | null) {
  const email = LOGIN_ALIASES[rawEmail] ?? rawEmail;
  const rows = await db.select().from(users).where(eq(users.email, email)).limit(1);
  const user = rows[0];
  if (!user || !user.isActive) throw new ApiError(401, "UNAUTHENTICATED", "Invalid email or password");

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) throw new ApiError(401, "UNAUTHENTICATED", "Invalid email or password");

  const roleNames = await getUserRoles(user.id);
  const accessToken = signAccessToken({ userId: user.id, email: user.email, roles: roleNames });
  const refreshToken = signRefreshToken(user.id);

  await db.insert(refreshTokens).values({
    userId: user.id,
    tokenHash: hashToken(refreshToken),
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  });
  await db.update(users).set({ lastLoginAt: new Date() }).where(eq(users.id, user.id));
  await writeAudit({ userId: user.id, entityType: "auth", entityId: user.id, action: "login", ipAddress: ip });

  const effectivePermissions = await getEffectivePermissions(roleNames);
  const employeeName = await getEmployeeName(user.employeeId);
  return {
    accessToken,
    refreshToken,
    user: { id: user.id, email: user.email, roles: roleNames, contactType: user.contactType, employeeId: user.employeeId, employeeName, permissions: effectivePermissions },
  };
}

export async function refresh(token: string) {
  let payload: { userId: number };
  try {
    payload = verifyRefreshToken(token);
  } catch {
    throw new ApiError(401, "UNAUTHENTICATED", "Invalid refresh token");
  }
  const tokenHash = hashToken(token);
  const rows = await db.select().from(refreshTokens).where(eq(refreshTokens.tokenHash, tokenHash)).limit(1);
  const stored = rows[0];
  if (!stored || stored.revokedAt || stored.expiresAt < new Date()) {
    throw new ApiError(401, "UNAUTHENTICATED", "Refresh token expired or revoked");
  }

  // rotate: revoke the old one, issue a new pair
  await db.update(refreshTokens).set({ revokedAt: new Date() }).where(eq(refreshTokens.id, stored.id));

  const userRows = await db.select().from(users).where(eq(users.id, payload.userId)).limit(1);
  const user = userRows[0];
  if (!user || !user.isActive) throw new ApiError(401, "UNAUTHENTICATED", "Account no longer active");

  const roleNames = await getUserRoles(user.id);
  const accessToken = signAccessToken({ userId: user.id, email: user.email, roles: roleNames });
  const newRefreshToken = signRefreshToken(user.id);
  await db.insert(refreshTokens).values({
    userId: user.id,
    tokenHash: hashToken(newRefreshToken),
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  });

  return { accessToken, refreshToken: newRefreshToken };
}

export async function logout(token: string) {
  const tokenHash = hashToken(token);
  await db.update(refreshTokens).set({ revokedAt: new Date() }).where(eq(refreshTokens.tokenHash, tokenHash));
}

export async function me(userId: number) {
  const rows = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  const user = rows[0];
  if (!user) throw new ApiError(404, "NOT_FOUND", "User not found");
  const roleNames = await getUserRoles(user.id);
  const effectivePermissions = await getEffectivePermissions(roleNames);
  const employeeName = await getEmployeeName(user.employeeId);
  return { id: user.id, email: user.email, roles: roleNames, contactType: user.contactType, employeeId: user.employeeId, employeeName, permissions: effectivePermissions };
}
