import bcrypt from "bcryptjs";
import { db } from "../db/client";
import {
  roles, permissions, rolePermissions, departments, employees, users, userRoles,
  workflowDefinitions, chartOfAccounts,
} from "../db/schema";

/**
 * Deliberately minimal and deterministic — unlike the full demo seed.ts (randomized dates,
 * dozens of rows for a realistic-looking dashboard), integration tests need just enough fixed
 * data to exercise real code paths predictably. Every row here exists because a test below
 * asserts against it specifically.
 */
export async function seedTestFixtures() {
  const roleNames = ["Admin", "ProjectManager", "Finance", "Employee"];
  const roleRows = await db.insert(roles).values(roleNames.map((name) => ({ name }))).returning();
  const roleId: Record<string, number> = Object.fromEntries(roleRows.map((r) => [r.name, r.id]));

  const moduleActions = [
    ["projects", "create"], ["projects", "update"], ["projects", "delete"],
    ["tasks", "create"], ["tasks", "update"],
    ["change-requests", "create"], ["change-requests", "update"],
    ["finance", "create"], ["finance", "update"],
    ["budget", "create"],
    ["employee-tasks", "create"], ["employee-tasks", "update"], ["employee-tasks", "delete"],
  ] as const;
  const permRows = await db.insert(permissions).values(moduleActions.map(([module, action]) => ({ module, action }))).returning();
  const permId: Record<string, number> = Object.fromEntries(permRows.map((p) => [`${p.module}:${p.action}`, p.id]));

  const grants: [number, number][] = [
    ...moduleActions.map(([m, a]) => [roleId.Admin, permId[`${m}:${a}`]] as [number, number]),
    [roleId.ProjectManager, permId["projects:create"]], [roleId.ProjectManager, permId["projects:update"]],
    [roleId.ProjectManager, permId["tasks:create"]], [roleId.ProjectManager, permId["tasks:update"]],
    [roleId.ProjectManager, permId["change-requests:create"]], [roleId.ProjectManager, permId["change-requests:update"]],
    [roleId.Finance, permId["finance:create"]], [roleId.Finance, permId["finance:update"]], [roleId.Finance, permId["budget:create"]],
  ];
  await db.insert(rolePermissions).values(grants.map(([rId, pId]) => ({ roleId: rId, permissionId: pId })));

  const [dept] = await db.insert(departments).values({ name: "Engineering" }).returning();
  const [pmEmployee] = await db.insert(employees).values({ employeeCode: "EMP-T01", fullName: "Test PM", departmentId: dept.id, capacityHoursPerMonth: 160 }).returning();
  const [staffEmployee] = await db.insert(employees).values({ employeeCode: "EMP-T02", fullName: "Test Employee", departmentId: dept.id, capacityHoursPerMonth: 160 }).returning();

  const passwordHash = await bcrypt.hash("TestPass123!", 10);
  const userSeed = [
    { email: "admin@test.local", role: "Admin", employeeId: undefined as number | undefined },
    { email: "pm@test.local", role: "ProjectManager", employeeId: pmEmployee.id },
    { email: "finance@test.local", role: "Finance", employeeId: undefined },
    { email: "employee@test.local", role: "Employee", employeeId: staffEmployee.id },
  ];
  const userRows = await db.insert(users).values(userSeed.map((u) => ({ email: u.email, passwordHash, employeeId: u.employeeId ?? null }))).returning();
  await db.insert(userRoles).values(userSeed.map((u, i) => ({ userId: userRows[i].id, roleId: roleId[u.role] })));

  await db.insert(workflowDefinitions).values({
    code: "change_request_approval",
    name: "Change Request Approval",
    entityType: "change_request",
    stepsJson: JSON.stringify([
      { step: 1, name: "PM Review", approverRole: "ProjectManager" },
      { step: 2, name: "Finance Sign-off", approverRole: "Finance" },
    ]),
  });

  const coa = await db
    .insert(chartOfAccounts)
    .values([
      { accountCode: "1000", name: "Cash", type: "Asset" },
      { accountCode: "5000", name: "Expenses", type: "Expense" },
    ])
    .returning();

  return {
    accountCashId: coa[0].id,
    accountExpenseId: coa[1].id,
    pmEmployeeId: pmEmployee.id,
    staffEmployeeId: staffEmployee.id,
  };
}

export const TEST_PASSWORD = "TestPass123!";
