import { z } from "zod";
import { db } from "../../db/client";
import { tickets, kbArticles } from "../../db/schema";
import { eq, or, like } from "drizzle-orm";
import { buildCrudRouter } from "../../lib/crudFactory";
import { asyncHandler } from "../../middleware/errorHandler.middleware";
import { authenticate } from "../../middleware/auth.middleware";
import { nextCode } from "../../lib/codeGenerator";
import { computeSlaStatus } from "./sla.logic";
import { notifyTicketAssignment } from "./ticketNotifications";

const ticketSchema = z.object({
  subject: z.string().min(1),
  description: z.string().optional(),
  customerId: z.number().int().optional(),
  assignedTo: z.number().int().optional(),
  priority: z.enum(["Critical", "High", "Medium", "Low"]).default("Medium"),
  status: z.enum(["Open", "In Progress", "Resolved", "Closed"]).default("Open"),
  slaHours: z.number().int().min(1).default(48),
});

/** SLA status is computed via the shared, unit-tested sla.logic.ts — see computeSlaStatus. */

const router = buildCrudRouter({
  table: tickets,
  tableName: "tickets",
  entityType: "tickets",
  createSchema: ticketSchema,
  updateSchema: ticketSchema.partial(),
  codeColumn: "ticketCode",
  codePrefix: "TCK",
  onAfterWrite: notifyTicketAssignment,
  extraRoutes: (router) => {
    router.get(
      "/with-sla",
      authenticate,
      asyncHandler(async (_req, res) => {
        const rows = await db.select().from(tickets);
        const data = rows.map((t) => ({ ...t, slaStatus: computeSlaStatus(t) }));
        res.json({ data, meta: { breached: data.filter((t) => t.slaStatus === "Breached").length } });
      })
    );

    router.post(
      "/:id/resolve",
      authenticate,
      asyncHandler(async (req, res) => {
        const [row] = await db.update(tickets).set({ status: "Resolved", resolvedAt: new Date() }).where(eq(tickets.id, Number(req.params.id))).returning();
        res.json({ data: { ...row, slaStatus: computeSlaStatus(row) } });
      })
    );
  },
});
export default router;

const kbRouter = buildCrudRouter({
  table: kbArticles,
  tableName: "kb_articles",
  entityType: "kb-articles",
  createSchema: z.object({ title: z.string().min(1), body: z.string().min(1), category: z.string().optional() }),
  updateSchema: z.object({ title: z.string().min(1), body: z.string().min(1), category: z.string().optional() }).partial(),
  extraRoutes: (router) => {
    router.get(
      "/search",
      authenticate,
      asyncHandler(async (req, res) => {
        const q = String(req.query.q || "");
        if (!q) return res.json({ data: [] });
        const data = await db.select().from(kbArticles).where(or(like(kbArticles.title, `%${q}%`), like(kbArticles.body, `%${q}%`)));
        res.json({ data });
      })
    );
  },
});
export { kbRouter };
