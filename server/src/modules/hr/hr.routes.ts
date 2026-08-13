import { z } from "zod";
import { db } from "../../db/client";
import { leaveRequests, attendanceRecords, employees } from "../../db/schema";
import { eq, and, gte, lte } from "drizzle-orm";
import { buildCrudRouter } from "../../lib/crudFactory";
import { asyncHandler, notFound } from "../../middleware/errorHandler.middleware";
import { requirePermission } from "../../middleware/rbac.middleware";

const leaveSchema = z.object({
  employeeId: z.number().int(),
  leaveType: z.enum(["Annual", "Sick", "Unpaid", "Other"]),
  startDate: z.string().min(1),
  endDate: z.string().min(1),
  reason: z.string().optional(),
  status: z.enum(["Pending", "Approved", "Rejected"]).default("Pending"),
});

export const leaveRouter = buildCrudRouter({
  table: leaveRequests,
  tableName: "leave_requests",
  entityType: "leave-requests",
  createSchema: leaveSchema,
  updateSchema: leaveSchema.partial(),
  codeColumn: "leaveCode",
  codePrefix: "LV",
  extraRoutes: (router) => {
    router.post(
      "/:id/approve",
      requirePermission("leave-requests", "update"),
      asyncHandler(async (req, res) => {
        const id = Number(req.params.id);
        const lr = (await db.select().from(leaveRequests).where(eq(leaveRequests.id, id)).limit(1))[0];
        if (!lr) throw notFound("Leave request");
        const [row] = await db.update(leaveRequests).set({ status: "Approved", approvedBy: req.user!.userId }).where(eq(leaveRequests.id, id)).returning();
        res.json({ data: row });
      })
    );
    router.post(
      "/:id/reject",
      requirePermission("leave-requests", "update"),
      asyncHandler(async (req, res) => {
        const id = Number(req.params.id);
        const [row] = await db.update(leaveRequests).set({ status: "Rejected", approvedBy: req.user!.userId }).where(eq(leaveRequests.id, id)).returning();
        if (!row) throw notFound("Leave request");
        res.json({ data: row });
      })
    );
  },
});

const attendanceSchema = z.object({
  employeeId: z.number().int(),
  date: z.string().min(1),
  status: z.enum(["Present", "Absent", "Half Day", "Leave", "Holiday"]).default("Present"),
  checkIn: z.string().optional(),
  checkOut: z.string().optional(),
});

export const attendanceRouter = buildCrudRouter({
  table: attendanceRecords,
  tableName: "attendance_records",
  entityType: "attendance",
  createSchema: attendanceSchema,
  updateSchema: attendanceSchema.partial(),
  extraRoutes: (router) => {
    router.get(
      "/summary",
      asyncHandler(async (req, res) => {
        const month = (req.query.month as string) || new Date().toISOString().slice(0, 7);
        const start = `${month}-01`;
        const end = `${month}-31`;
        const emps = await db.select().from(employees);
        const records = await db.select().from(attendanceRecords).where(and(gte(attendanceRecords.date, start), lte(attendanceRecords.date, end)));
        const data = emps.map((e) => {
          const recs = records.filter((r) => r.employeeId === e.id);
          return {
            employeeId: e.id,
            fullName: e.fullName,
            present: recs.filter((r) => r.status === "Present").length,
            absent: recs.filter((r) => r.status === "Absent").length,
            leave: recs.filter((r) => r.status === "Leave").length,
          };
        });
        res.json({ data, meta: { month } });
      })
    );
  },
});
