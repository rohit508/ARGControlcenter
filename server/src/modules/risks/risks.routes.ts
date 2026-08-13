import { z } from "zod";
import { db } from "../../db/client";
import { risks } from "../../db/schema";
import { eq, and } from "drizzle-orm";
import { buildCrudRouter } from "../../lib/crudFactory";
import { recalculateProject } from "../projects/projects.service";
import { asyncHandler } from "../../middleware/errorHandler.middleware";

const baseSchema = z.object({
  projectId: z.number().int(),
  category: z.string().min(1),
  description: z.string().min(1),
  probability: z.number().int().min(1).max(5),
  impact: z.number().int().min(1).max(5),
  ownerId: z.number().int().optional(),
  mitigation: z.string().optional(),
  status: z.enum(["Open", "Mitigated", "Closed", "Escalated"]).default("Open"),
  targetDate: z.string().optional(),
  closedDate: z.string().optional(),
});

const createSchema = baseSchema.transform((v) => ({ ...v, riskScoreCache: v.probability * v.impact }));
const updateSchema = baseSchema.partial().transform((v) => ({
  ...v,
  ...(v.probability !== undefined && v.impact !== undefined ? { riskScoreCache: v.probability * v.impact } : {}),
}));

async function afterWrite(row: { projectId: number }) {
  await recalculateProject(row.projectId);
}

export default buildCrudRouter({
  table: risks,
  tableName: "risks",
  entityType: "risks",
  createSchema,
  updateSchema,
  codeColumn: "riskCode",
  codePrefix: "RSK",
  projectScoped: true,
  onAfterWrite: afterWrite,
  extraRoutes: (router) => {
    router.get(
      "/heatmap",
      asyncHandler(async (req, res) => {
        const conditions = [eq(risks.status, "Open")];
        if (req.query.projectId) conditions.push(eq(risks.projectId, Number(req.query.projectId)));
        const rows = await db
          .select({ probability: risks.probability, impact: risks.impact })
          .from(risks)
          .where(and(...conditions));
        const matrix: number[][] = Array.from({ length: 5 }, () => Array(5).fill(0));
        for (const r of rows) matrix[r.probability - 1][r.impact - 1]++;
        res.json({ data: matrix });
      })
    );
  },
});
