import { z } from "zod";
import { milestones } from "../../db/schema";
import { buildCrudRouter } from "../../lib/crudFactory";

function computeStatus(plannedDate: string, actualDate: string | null | undefined): string {
  if (actualDate) return "Achieved";
  if (new Date(plannedDate) < new Date()) return "Overdue";
  return "Pending";
}

const baseSchema = z.object({
  projectId: z.number().int(),
  name: z.string().min(1),
  ownerId: z.number().int().optional(),
  plannedDate: z.string().min(1),
  actualDate: z.string().optional(),
});

const createSchema = baseSchema.transform((v) => ({ ...v, status: computeStatus(v.plannedDate, v.actualDate) }));
const updateSchema = baseSchema.partial().transform((v) => ({
  ...v,
  ...(v.plannedDate ? { status: computeStatus(v.plannedDate, v.actualDate) } : {}),
}));

export default buildCrudRouter({
  table: milestones,
  tableName: "milestones",
  entityType: "milestones",
  createSchema,
  updateSchema,
  projectScoped: true,
});
