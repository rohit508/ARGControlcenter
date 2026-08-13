import bcrypt from "bcryptjs";
import { db } from "../../db/client";
import { employees, users, userRoles, roles, departments } from "../../db/schema";
import { eq, and, isNull, like, or, inArray } from "drizzle-orm";
import { notFound, conflict } from "../../middleware/errorHandler.middleware";
import { writeAudit } from "../../lib/audit";
import { nextCode } from "../../lib/codeGenerator";
import { CreateEmployeeInput, UpdateEmployeeInput, CreateLoginInput, UpdateRolesInput } from "./employees.schema";

async function withLoginInfo(rows: (typeof employees.$inferSelect)[]) {
  if (rows.length === 0) return [];
  const employeeIds = rows.map((r) => r.id);
  const loginRows = await db.select({ id: users.id, employeeId: users.employeeId, isActive: users.isActive }).from(users);
  const loginByEmployeeId = new Map(loginRows.filter((u) => u.employeeId !== null).map((u) => [u.employeeId as number, u]));
  const deptRows = await db.select().from(departments);
  const deptById = new Map(deptRows.map((d) => [d.id, d.name]));

  const userIds = loginRows.map((u) => u.id);
  const roleGrantRows =
    userIds.length > 0
      ? await db
          .select({ userId: userRoles.userId, roleId: userRoles.roleId, roleName: roles.name })
          .from(userRoles)
          .innerJoin(roles, eq(roles.id, userRoles.roleId))
          .where(inArray(userRoles.userId, userIds))
      : [];
  const rolesByUserId = new Map<number, { id: number; name: string }[]>();
  for (const g of roleGrantRows) {
    const list = rolesByUserId.get(g.userId) ?? [];
    list.push({ id: g.roleId, name: g.roleName });
    rolesByUserId.set(g.userId, list);
  }

  return rows.map((r) => {
    const login = employeeIds.includes(r.id) ? loginByEmployeeId.get(r.id) : undefined;
    return {
      ...r,
      departmentName: r.departmentId ? deptById.get(r.departmentId) ?? null : null,
      hasLogin: !!login,
      loginActive: login?.isActive ?? null,
      roles: login ? rolesByUserId.get(login.id) ?? [] : [],
    };
  });
}

export async function listEmployees(query: { q?: string; departmentId?: number; status?: string }) {
  const conditions = [isNull(employees.deletedAt)];
  if (query.departmentId) conditions.push(eq(employees.departmentId, query.departmentId));
  if (query.status) conditions.push(eq(employees.status, query.status));
  if (query.q) {
    const term = `%${query.q}%`;
    conditions.push(or(like(employees.fullName, term), like(employees.employeeCode, term), like(employees.email, term))!);
  }
  const rows = await db.select().from(employees).where(and(...conditions)).orderBy(employees.fullName);
  return withLoginInfo(rows);
}

export async function getEmployee(id: number) {
  const row = (await db.select().from(employees).where(and(eq(employees.id, id), isNull(employees.deletedAt))).limit(1))[0];
  if (!row) throw notFound("Employee");
  const [withLogin] = await withLoginInfo([row]);
  return withLogin;
}

async function defaultEmployeeRoleId(): Promise<number> {
  const employeeRole = (await db.select().from(roles).where(eq(roles.name, "Employee")).limit(1))[0];
  if (!employeeRole) throw notFound("Employee role");
  return employeeRole.id;
}

// bcrypt.hash() is async and must run before the transaction opens — better-sqlite3's
// transaction wrapper executes its callback fully synchronously (confirmed by spike-testing
// db.transaction() against this driver), so nothing inside the callback below may be awaited.
async function attachLogin(employeeId: number, loginEmail: string, loginPassword: string, roleIds?: number[]) {
  const existing = (await db.select().from(users).where(eq(users.email, loginEmail)).limit(1))[0];
  if (existing) throw conflict("A login with this email already exists");

  // roleIds lets an admin grant a login any role(s) up front (e.g. Finance, ProjectManager)
  // instead of always getting the Employee default and needing a follow-up PUT /:id/roles call.
  const grantRoleIds = roleIds && roleIds.length > 0 ? roleIds : [await defaultEmployeeRoleId()];

  const passwordHash = await bcrypt.hash(loginPassword, 10);
  return db.transaction((tx) => {
    const [user] = tx.insert(users).values({ email: loginEmail, passwordHash, employeeId, contactType: "internal" }).returning().all();
    tx.insert(userRoles).values(grantRoleIds.map((roleId) => ({ userId: user.id, roleId }))).run();
    return user;
  });
}

export async function createEmployee(input: CreateEmployeeInput, actorUserId: number) {
  const employeeCode = nextCode("employees", "employee_code", "EMP", 3);
  const { createLogin, loginEmail, loginPassword, roleIds, ...core } = input;

  let grantRoleIds: number[] | undefined;
  let passwordHash: string | undefined;
  if (createLogin && loginEmail && loginPassword) {
    const existing = (await db.select().from(users).where(eq(users.email, loginEmail)).limit(1))[0];
    if (existing) throw conflict("A login with this email already exists");
    grantRoleIds = roleIds && roleIds.length > 0 ? roleIds : [await defaultEmployeeRoleId()];
    passwordHash = await bcrypt.hash(loginPassword, 10); // must hash before the sync transaction below
  }

  // One transaction for employee + optional login, so a failure partway through never leaves an
  // orphaned employee record with no login when the admin explicitly asked for one.
  const row = db.transaction((tx) => {
    const [employee] = tx.insert(employees).values({ ...core, employeeCode }).returning().all();
    if (grantRoleIds && passwordHash) {
      const [user] = tx.insert(users).values({ email: loginEmail!, passwordHash: passwordHash!, employeeId: employee.id, contactType: "internal" }).returning().all();
      tx.insert(userRoles).values(grantRoleIds.map((roleId) => ({ userId: user.id, roleId }))).run();
    }
    return employee;
  });

  await writeAudit({ userId: actorUserId, entityType: "employees", entityId: row.id, action: "create", after: row });
  return getEmployee(row.id);
}

export async function updateEmployee(id: number, input: UpdateEmployeeInput, actorUserId: number) {
  const before = (await db.select().from(employees).where(and(eq(employees.id, id), isNull(employees.deletedAt))).limit(1))[0];
  if (!before) throw notFound("Employee");
  const [after] = await db.update(employees).set(input).where(eq(employees.id, id)).returning();
  await writeAudit({ userId: actorUserId, entityType: "employees", entityId: id, action: "update", before, after });
  return getEmployee(id);
}

export async function deleteEmployee(id: number, actorUserId: number) {
  const before = (await db.select().from(employees).where(and(eq(employees.id, id), isNull(employees.deletedAt))).limit(1))[0];
  if (!before) throw notFound("Employee");

  await db.update(employees).set({ deletedAt: new Date() }).where(eq(employees.id, id));
  // Never delete the user row — it's the audit/login history. Deactivate instead.
  await db.update(users).set({ isActive: false }).where(eq(users.employeeId, id));

  await writeAudit({ userId: actorUserId, entityType: "employees", entityId: id, action: "delete", before });
}

export async function createLoginForEmployee(id: number, input: CreateLoginInput, actorUserId: number) {
  const employee = (await db.select().from(employees).where(and(eq(employees.id, id), isNull(employees.deletedAt))).limit(1))[0];
  if (!employee) throw notFound("Employee");
  const existingLogin = (await db.select().from(users).where(eq(users.employeeId, id)).limit(1))[0];
  if (existingLogin) throw conflict("This employee already has a login");

  const user = await attachLogin(id, input.loginEmail, input.loginPassword, input.roleIds);
  await writeAudit({ userId: actorUserId, entityType: "employees", entityId: id, action: "update", after: { loginCreated: user.email } });
  return getEmployee(id);
}

export async function updateEmployeeRoles(id: number, input: UpdateRolesInput, actorUserId: number) {
  const user = (await db.select().from(users).where(eq(users.employeeId, id)).limit(1))[0];
  if (!user) throw notFound("Login for this employee");

  await db.delete(userRoles).where(eq(userRoles.userId, user.id));
  if (input.roleIds.length > 0) {
    await db.insert(userRoles).values(input.roleIds.map((roleId) => ({ userId: user.id, roleId })));
  }
  await writeAudit({ userId: actorUserId, entityType: "employees", entityId: id, action: "update", after: { roleIds: input.roleIds } });
  return getEmployee(id);
}
