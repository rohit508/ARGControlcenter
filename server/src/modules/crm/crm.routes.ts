import { z } from "zod";
import { db } from "../../db/client";
import { leads, customers, opportunities } from "../../db/schema";
import { eq } from "drizzle-orm";
import { buildCrudRouter } from "../../lib/crudFactory";
import { asyncHandler, notFound } from "../../middleware/errorHandler.middleware";

const leadSchema = z.object({
  companyName: z.string().min(1),
  contactName: z.string().optional(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  source: z.string().optional(),
  status: z.enum(["New", "Contacted", "Qualified", "Disqualified", "Converted"]).default("New"),
  ownerId: z.number().int().optional(),
});

export const leadsRouter = buildCrudRouter({
  table: leads,
  tableName: "leads",
  entityType: "leads",
  createSchema: leadSchema,
  updateSchema: leadSchema.partial(),
  codeColumn: "leadCode",
  codePrefix: "LEAD",
  extraRoutes: (router) => {
    router.post(
      "/:id/convert",
      asyncHandler(async (req, res) => {
        const id = Number(req.params.id);
        const lead = (await db.select().from(leads).where(eq(leads.id, id)).limit(1))[0];
        if (!lead) throw notFound("Lead");
        if (lead.convertedCustomerId) return res.json({ data: { customerId: lead.convertedCustomerId, alreadyConverted: true } });

        const customerCode = `CUST-${String(Date.now()).slice(-6)}`;
        const [customer] = await db
          .insert(customers)
          .values({ customerCode, name: lead.companyName, accountOwnerId: lead.ownerId, status: "Active" })
          .returning();
        await db.update(leads).set({ status: "Converted", convertedCustomerId: customer.id }).where(eq(leads.id, id));
        res.status(201).json({ data: { customerId: customer.id } });
      })
    );
  },
});

const customerSchema = z.object({
  name: z.string().min(1),
  industry: z.string().optional(),
  website: z.string().optional(),
  accountOwnerId: z.number().int().optional(),
  status: z.enum(["Active", "Inactive"]).default("Active"),
});

export const customersRouter = buildCrudRouter({
  table: customers,
  tableName: "customers",
  entityType: "customers",
  createSchema: customerSchema,
  updateSchema: customerSchema.partial(),
  codeColumn: "customerCode",
  codePrefix: "CUST",
});

const opportunitySchema = z.object({
  customerId: z.number().int().optional(),
  name: z.string().min(1),
  stage: z.enum(["Qualification", "Proposal", "Negotiation", "Won", "Lost"]).default("Qualification"),
  amount: z.number().min(0).default(0),
  probability: z.number().int().min(0).max(100).default(20),
  expectedCloseDate: z.string().optional(),
  ownerId: z.number().int().optional(),
});

export const opportunitiesRouter = buildCrudRouter({
  table: opportunities,
  tableName: "opportunities",
  entityType: "opportunities",
  createSchema: opportunitySchema,
  updateSchema: opportunitySchema.partial(),
  codeColumn: "opportunityCode",
  codePrefix: "OPP",
  extraRoutes: (router) => {
    router.get(
      "/pipeline",
      asyncHandler(async (_req, res) => {
        const rows = await db.select().from(opportunities);
        const byStage: Record<string, { count: number; totalAmount: number; weightedAmount: number }> = {};
        for (const o of rows) {
          byStage[o.stage] ??= { count: 0, totalAmount: 0, weightedAmount: 0 };
          byStage[o.stage].count++;
          byStage[o.stage].totalAmount += o.amount;
          byStage[o.stage].weightedAmount += o.amount * (o.probability / 100);
        }
        res.json({ data: byStage });
      })
    );
  },
});
