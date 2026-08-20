import { z } from "zod";
import { db } from "../../db/client";
import { vendors, purchaseOrders, poLines } from "../../db/schema";
import { eq } from "drizzle-orm";
import { buildCrudRouter } from "../../lib/crudFactory";
import { asyncHandler, notFound, ApiError } from "../../middleware/errorHandler.middleware";
import { nextCode } from "../../lib/codeGenerator";
import * as workflowService from "../workflow/workflow.service";
import { Request, Response } from "express";

const vendorSchema = z.object({
  name: z.string().min(1),
  category: z.string().optional(),
  contactEmail: z.string().email().optional(),
  contactPhone: z.string().optional(),
  status: z.enum(["Active", "Inactive", "Blacklisted"]).default("Active"),
  rating: z.number().min(1).max(5).optional(),
});

export const vendorsRouter = buildCrudRouter({
  table: vendors,
  tableName: "vendors",
  entityType: "vendors",
  createSchema: vendorSchema,
  updateSchema: vendorSchema.partial(),
  codeColumn: "vendorCode",
  codePrefix: "VEN",
});

const poLineSchema = z.object({ description: z.string().min(1), quantity: z.number().min(0.01), unitPrice: z.number().min(0) });
const poSchema = z.object({
  vendorId: z.number().int(),
  projectId: z.number().int().optional(),
  orderDate: z.string().min(1),
  expectedDate: z.string().optional(),
  lines: z.array(poLineSchema).min(1),
});

export const purchaseOrdersRouter = buildCrudRouter({
  table: purchaseOrders,
  tableName: "purchase_orders",
  entityType: "purchase-orders",
  // create/update handled by bespoke extraRoutes below for the normal "create with lines" flow
  // (POST /with-lines) — the factory's generic POST "/" still exists and creates a bare PO shell
  // with totalAmount 0 and no lines, useful only for building one up incrementally. Documented
  // here rather than silently having two creation paths with no explanation.
  createSchema: poSchema.omit({ lines: true }),
  updateSchema: poSchema.omit({ lines: true }).partial(),
  codeColumn: "poNumber",
  codePrefix: "PO",
  extraRoutes: (router) => {
    router.post(
      "/with-lines",
      asyncHandler(async (req, res) => {
        const input = poSchema.parse(req.body);
        const totalAmount = round2(input.lines.reduce((s, l) => s + l.quantity * l.unitPrice, 0));
        const poNumber = await nextCode("purchase_orders", "po_number", "PO", 5);
        const [po] = await db
          .insert(purchaseOrders)
          .values({
            poNumber,
            vendorId: input.vendorId,
            projectId: input.projectId,
            orderDate: input.orderDate,
            expectedDate: input.expectedDate,
            totalAmount,
            requestedBy: req.user!.userId,
            status: "Draft",
          })
          .returning();
        await db.insert(poLines).values(
          input.lines.map((l) => ({ purchaseOrderId: po.id, description: l.description, quantity: l.quantity, unitPrice: l.unitPrice, lineTotal: round2(l.quantity * l.unitPrice) }))
        );
        res.status(201).json({ data: po });
      })
    );

    router.get(
      "/:id/lines",
      asyncHandler(async (req, res) => {
        const lines = await db.select().from(poLines).where(eq(poLines.purchaseOrderId, Number(req.params.id)));
        res.json({ data: lines });
      })
    );

    router.post("/:id/submit", asyncHandler(async (req, res) => submitPo(req, res)));
    router.post("/:id/approve", asyncHandler(async (req, res) => actOnPo(req, res, "approve")));
    router.post("/:id/reject", asyncHandler(async (req, res) => actOnPo(req, res, "reject")));
  },
});

async function submitPo(req: Request, res: Response) {
  const id = Number(req.params.id);
  const po = (await db.select().from(purchaseOrders).where(eq(purchaseOrders.id, id)).limit(1))[0];
  if (!po) throw notFound("Purchase order");
  if (po.workflowInstanceId) throw new ApiError(409, "CONFLICT", "Already submitted for approval");
  const instance = await workflowService.submitForApproval({ workflowCode: "purchase_order_approval", entityType: "purchase_order", entityId: id, userId: req.user!.userId });
  await db.update(purchaseOrders).set({ workflowInstanceId: instance.id, status: "Submitted" }).where(eq(purchaseOrders.id, id));
  res.json({ data: { ...po, workflowInstanceId: instance.id, status: "Submitted" } });
}

async function actOnPo(req: Request, res: Response, action: "approve" | "reject") {
  const id = Number(req.params.id);
  const po = (await db.select().from(purchaseOrders).where(eq(purchaseOrders.id, id)).limit(1))[0];
  if (!po) throw notFound("Purchase order");
  if (!po.workflowInstanceId) throw new ApiError(400, "VALIDATION_ERROR", "This PO has not been submitted for approval yet");
  const result = await workflowService.act({ instanceId: po.workflowInstanceId, userId: req.user!.userId, userRoles: req.user!.roles, action, comment: req.body?.comment });
  const status = result.status === "approved" ? "Approved" : result.status === "rejected" ? "Rejected" : "Submitted";
  await db.update(purchaseOrders).set({ status }).where(eq(purchaseOrders.id, id));
  res.json({ data: { workflowInstance: result, status } });
}

function round2(n: number) {
  return Math.round(n * 100) / 100;
}
