import { or, eq, inArray, SQL } from "drizzle-orm";
import { projects } from "../db/schema";
import { AccessTokenPayload } from "./jwt";
import { db } from "../db/client";
import { employees } from "../db/schema";

/**
 * Resolves which projects a user may see, per 01-system-architecture.md §1.6.
 * Returns `undefined` for "no extra filter" (Admin/CEO/Auditor/Finance — read-broadly roles),
 * or a Drizzle SQL condition to AND onto the base query otherwise.
 *
 * Only `projects` is implemented in this build. Every other Phase-1 table (tasks, risks, budget
 * entries...) scopes through its `project_id` using the same resolved project-ID set — see
 * `scopedProjectIds()` below, reused by every module's list query.
 */
const BROAD_READ_ROLES = ["Admin", "CEO", "Auditor", "Finance"];

export async function scopedProjectIds(user: AccessTokenPayload): Promise<number[] | undefined> {
  if (user.roles.some((r) => BROAD_READ_ROLES.includes(r))) return undefined; // no filter

  const myEmployee = await db.select({ id: employees.id }).from(employees).where(eq(employees.email, user.email)).limit(1);
  const employeeId = myEmployee[0]?.id;

  if (user.roles.includes("ProjectManager") && employeeId) {
    const owned = await db.select({ id: projects.id }).from(projects).where(eq(projects.projectManagerId, employeeId));
    return owned.map((p) => p.id);
  }

  if (user.roles.includes("DepartmentHead") && employeeId) {
    const emp = await db.select({ departmentId: employees.departmentId }).from(employees).where(eq(employees.id, employeeId)).limit(1);
    if (!emp[0]?.departmentId) return [];
    const deptProjects = await db.select({ id: projects.id }).from(projects).where(eq(projects.departmentId, emp[0].departmentId));
    return deptProjects.map((p) => p.id);
  }

  // Employee / Client / Vendor default: no projects unless explicitly a PM/member (Phase 1 keeps
  // this simple — project_shares / project_members join is a Phase-1.1 follow-up, not yet wired).
  if (employeeId) {
    const managed = await db.select({ id: projects.id }).from(projects).where(eq(projects.projectManagerId, employeeId));
    return managed.map((p) => p.id);
  }
  return [];
}

export function projectScopeCondition(ids: number[] | undefined): SQL | undefined {
  if (ids === undefined) return undefined;
  if (ids.length === 0) return eq(projects.id, -1); // guaranteed no match
  return inArray(projects.id, ids);
}
