import { z } from "zod";
import { issues } from "../../db/schema";
import { buildCrudRouter } from "../../lib/crudFactory";

const baseSchema = z.object({
  projectId: z.number().int(),
  description: z.string().min(1),
  ownerId: z.number().int().optional(),
  severity: z.enum(["Critical", "High", "Medium", "Low"]).default("Medium"),
  priority: z.enum(["Critical", "High", "Medium", "Low"]).default("Medium"),
  dateRaised: z.string().min(1),
  dueDate: z.string().optional(),
  status: z.enum(["Open", "In Progress", "Resolved", "Closed"]).default("Open"),
  resolution: z.string().optional(),
});

export default buildCrudRouter({
  table: issues,
  tableName: "issues",
  entityType: "issues",
  createSchema: baseSchema,
  updateSchema: baseSchema.partial(),
  codeColumn: "issueCode",
  codePrefix: "ISS",
  projectScoped: true,
});
