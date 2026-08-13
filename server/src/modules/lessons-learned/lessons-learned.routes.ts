import { z } from "zod";
import { db } from "../../db/client";
import { lessonsLearned } from "../../db/schema";
import { like, or } from "drizzle-orm";
import { buildCrudRouter } from "../../lib/crudFactory";
import { asyncHandler } from "../../middleware/errorHandler.middleware";

const baseSchema = z.object({
  projectId: z.number().int().optional(),
  category: z.string().min(1),
  description: z.string().min(1),
  impact: z.string().optional(),
  recommendation: z.string().optional(),
  dateLogged: z.string().min(1),
});

export default buildCrudRouter({
  table: lessonsLearned,
  tableName: "lessons_learned",
  entityType: "lessons-learned",
  createSchema: baseSchema,
  updateSchema: baseSchema.partial(),
  codeColumn: "lessonCode",
  codePrefix: "LL",
  projectScoped: true,
  extraRoutes: (router) => {
    router.get(
      "/search",
      asyncHandler(async (req, res) => {
        const q = String(req.query.q || "");
        if (!q) return res.json({ data: [] });
        const pattern = `%${q}%`;
        const data = await db
          .select()
          .from(lessonsLearned)
          .where(or(like(lessonsLearned.description, pattern), like(lessonsLearned.recommendation, pattern), like(lessonsLearned.category, pattern)));
        res.json({ data });
      })
    );
  },
});
