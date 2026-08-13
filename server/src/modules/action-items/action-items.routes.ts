import { z } from "zod";
import { db } from "../../db/client";
import { actionItems, meetings } from "../../db/schema";
import { eq } from "drizzle-orm";
import { buildCrudRouter } from "../../lib/crudFactory";
import { asyncHandler } from "../../middleware/errorHandler.middleware";

const baseSchema = z.object({
  meetingId: z.number().int().optional(),
  description: z.string().min(1),
  ownerId: z.number().int().optional(),
  dueDate: z.string().optional(),
  status: z.enum(["Open", "In Progress", "Completed", "Overdue"]).default("Open"),
});

export default buildCrudRouter({
  table: actionItems,
  tableName: "action_items",
  entityType: "action-items",
  createSchema: baseSchema,
  updateSchema: baseSchema.partial(),
  codeColumn: "actionCode",
  codePrefix: "ACT",
  extraRoutes: (router) => {
    // Mirrors the workbook's "linked, not duplicated" principle: Meeting Date comes from the
    // Meeting Log via meetingId, resolved server-side rather than copy-pasted onto every row.
    router.get(
      "/with-meeting-context",
      asyncHandler(async (_req, res) => {
        const rows = await db
          .select({
            id: actionItems.id,
            actionCode: actionItems.actionCode,
            description: actionItems.description,
            status: actionItems.status,
            dueDate: actionItems.dueDate,
            ownerId: actionItems.ownerId,
            meetingId: actionItems.meetingId,
            meetingDate: meetings.meetingDate,
            meetingCode: meetings.meetingCode,
          })
          .from(actionItems)
          .leftJoin(meetings, eq(meetings.id, actionItems.meetingId));
        res.json({ data: rows });
      })
    );
  },
});
