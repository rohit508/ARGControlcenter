import { z } from "zod";
import { budgetEntries } from "../../db/schema";
import { buildCrudRouter } from "../../lib/crudFactory";
import { recalculateProject } from "../projects/projects.service";

const baseSchema = z.object({
  projectId: z.number().int(),
  costCategory: z.string().min(1),
  vendorName: z.string().optional(),
  poNumber: z.string().optional(),
  invoiceStatus: z.enum(["Paid", "Pending", "Overdue", "Approved"]).default("Pending"),
  transactionDate: z.string().min(1),
  committedCost: z.number().min(0).default(0),
  actualCost: z.number().min(0).default(0),
  forecastCost: z.number().min(0).default(0),
  remarks: z.string().optional(),
});

export default buildCrudRouter({
  table: budgetEntries,
  tableName: "budget_entries",
  entityType: "budget",
  createSchema: baseSchema,
  updateSchema: baseSchema.partial(),
  codeColumn: "entryCode",
  codePrefix: "BUD",
  codePad: 4,
  projectScoped: true,
  onAfterWrite: async (row) => recalculateProject(row.projectId),
});
