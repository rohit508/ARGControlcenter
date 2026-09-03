import { Router } from "express";
import { db } from "../../db/client";
import { employees, tasks, departments } from "../../db/schema";
import { eq, and, isNull, ne, sql } from "drizzle-orm";
import { asyncHandler, notFound } from "../../middleware/errorHandler.middleware";
import { authenticate } from "../../middleware/auth.middleware";

const router = Router();
router.use(authenticate);

/**
 * Allocated hours = sum, across this employee's open tasks, of ONLY the portion of each task's
 * duration that falls in the given month (default: current month) — not the task's whole
 * multi-month span. This is the exact fix applied during the Excel build after testing revealed
 * summing full task duration produced 200%+ "utilization" for most people; same SQL-level logic
 * ported here rather than re-introducing that bug in the rewrite.
 */
function allocatedHoursSubquery(monthStart: string, monthEnd: string) {
  // julianday() is SQLite-only (Postgres date subtraction already yields an integer day count),
  // and SQLite's MIN/MAX(a, b) scalar form doesn't exist in Postgres — LEAST/GREATEST replace it.
  return sql<number>`(
    SELECT COALESCE(SUM(
      GREATEST(0,
        LEAST(${tasks.finishDate}::date, ${monthEnd}::date)
        - GREATEST(${tasks.startDate}::date, ${monthStart}::date)
        + 1
      ) * 6
    ), 0)
    FROM ${tasks}
    WHERE ${tasks.assignedTo} = ${employees.id}
      AND ${tasks.status} != 'Completed'
      AND ${tasks.deletedAt} IS NULL
      AND ${tasks.startDate} IS NOT NULL AND ${tasks.finishDate} IS NOT NULL
  )`;
}

function monthBounds(monthParam?: string) {
  const base = monthParam ? new Date(`${monthParam}-01`) : new Date();
  const start = new Date(base.getFullYear(), base.getMonth(), 1);
  const end = new Date(base.getFullYear(), base.getMonth() + 1, 0);
  return { start: start.toISOString().slice(0, 10), end: end.toISOString().slice(0, 10) };
}

router.get(
  "/",
  asyncHandler(async (req, res) => {
    const { start, end } = monthBounds(req.query.month as string | undefined);
    const rows = await db
      .select({
        id: employees.id,
        employeeCode: employees.employeeCode,
        fullName: employees.fullName,
        roleTitle: employees.roleTitle,
        departmentId: employees.departmentId,
        departmentName: departments.name,
        costRate: employees.costRate,
        capacityHoursPerMonth: employees.capacityHoursPerMonth,
        skill: employees.skill,
        location: employees.location,
        status: employees.status,
        allocatedHours: allocatedHoursSubquery(start, end),
        activeTaskCount: sql<number>`(
          SELECT COUNT(*) FROM ${tasks}
          WHERE ${tasks.assignedTo} = ${employees.id} AND ${tasks.status} != 'Completed' AND ${tasks.deletedAt} IS NULL
        )`,
      })
      .from(employees)
      .leftJoin(departments, eq(departments.id, employees.departmentId))
      .where(isNull(employees.deletedAt));

    const data = rows.map((r) => ({
      ...r,
      utilizationPct: r.capacityHoursPerMonth ? round4((r.allocatedHours as number) / (r.capacityHoursPerMonth as number)) : 0,
      overallocated: r.capacityHoursPerMonth ? (r.allocatedHours as number) > (r.capacityHoursPerMonth as number) : false,
    }));
    res.json({ data, meta: { month: start.slice(0, 7) } });
  })
);

router.get(
  "/:id/utilization",
  asyncHandler(async (req, res) => {
    const { start, end } = monthBounds(req.query.month as string | undefined);
    const id = Number(req.params.id);
    const emp = (await db.select().from(employees).where(and(eq(employees.id, id), isNull(employees.deletedAt))).limit(1))[0];
    if (!emp) throw notFound("Employee");

    const assignedTasks = await db
      .select({ taskCode: tasks.taskCode, name: tasks.name, projectId: tasks.projectId, startDate: tasks.startDate, finishDate: tasks.finishDate, status: tasks.status })
      .from(tasks)
      .where(and(eq(tasks.assignedTo, id), ne(tasks.status, "Completed"), isNull(tasks.deletedAt)));

    const [{ allocatedHours }] = await db
      .select({ allocatedHours: allocatedHoursSubquery(start, end) })
      .from(employees)
      .where(eq(employees.id, id));

    res.json({
      data: {
        employee: emp,
        month: start.slice(0, 7),
        allocatedHours,
        capacityHoursPerMonth: emp.capacityHoursPerMonth,
        utilizationPct: emp.capacityHoursPerMonth ? round4((allocatedHours as number) / (emp.capacityHoursPerMonth as number)) : 0,
        tasks: assignedTasks,
      },
    });
  })
);

function round4(n: number) {
  return Math.round(n * 10000) / 10000;
}

export default router;
