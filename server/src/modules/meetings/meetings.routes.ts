import { z } from "zod";
import { meetings } from "../../db/schema";
import { buildCrudRouter } from "../../lib/crudFactory";

const baseSchema = z.object({
  meetingDate: z.string().min(1),
  projectId: z.number().int().optional(),
  discussion: z.string().optional(),
  ownerId: z.number().int().optional(),
  status: z.enum(["Open", "Closed"]).default("Open"),
});

export default buildCrudRouter({
  table: meetings,
  tableName: "meetings",
  entityType: "meetings",
  createSchema: baseSchema,
  updateSchema: baseSchema.partial(),
  codeColumn: "meetingCode",
  codePrefix: "MTG",
  projectScoped: true,
});
