import { Router } from "express";
import { ZodTypeAny } from "zod";
import { eq, and, isNull, SQL } from "drizzle-orm";
import { db } from "../db/client";
import { asyncHandler } from "../middleware/errorHandler.middleware";
import { authenticate } from "../middleware/auth.middleware";
import { requirePermission } from "../middleware/rbac.middleware";
import { notFound } from "../middleware/errorHandler.middleware";
import { writeAudit } from "./audit";
import { nextCode } from "./codeGenerator";

// Loosely typed on purpose: this factory operates uniformly across ~7 differently-shaped Drizzle
// tables. Each module's own schema.ts still gives full type safety at the Zod validation boundary,
// which is where it actually matters for catching bad input — the plumbing below is intentionally
// generic instead of independently re-typed per module.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyTable = any;

export interface CrudFactoryOptions {
  table: AnyTable;
  tableName: string; // raw SQL table name, for nextCode()
  entityType: string; // for audit log + permission module name
  createSchema: ZodTypeAny;
  updateSchema: ZodTypeAny;
  codeColumn?: string; // e.g. "riskCode" — the Drizzle column key
  codePrefix?: string; // e.g. "RSK"
  codePad?: number;
  projectScoped?: boolean; // true if this table has a projectId column (for ?projectId= filtering)
  onAfterWrite?: (row: AnyTable) => Promise<void>; // e.g. recalculateProject
  /** Register module-specific GET routes (e.g. /heatmap) here — called BEFORE the generic
   *  GET /:id route, which would otherwise swallow any single-segment path as an :id param. */
  extraRoutes?: (router: Router) => void;
}

export function buildCrudRouter(opts: CrudFactoryOptions): Router {
  const router = Router();
  router.use(authenticate);
  const table = opts.table;
  const hasSoftDelete = "deletedAt" in table;

  router.get(
    "/",
    asyncHandler(async (req, res) => {
      const conditions: SQL[] = [];
      if (hasSoftDelete) conditions.push(isNull(table.deletedAt));
      if (opts.projectScoped && req.query.projectId) {
        conditions.push(eq(table.projectId, Number(req.query.projectId)));
      }
      const data = conditions.length
        ? await db.select().from(table).where(and(...conditions))
        : await db.select().from(table);
      res.json({ data, meta: { total: data.length } });
    })
  );

  if (opts.extraRoutes) opts.extraRoutes(router);

  router.get(
    "/:id",
    asyncHandler(async (req, res) => {
      const conditions = [eq(table.id, Number(req.params.id))];
      if (hasSoftDelete) conditions.push(isNull(table.deletedAt));
      const row = (await db.select().from(table).where(and(...conditions)).limit(1))[0];
      if (!row) throw notFound(opts.entityType);
      res.json({ data: row });
    })
  );

  router.post(
    "/",
    requirePermission(opts.entityType, "create"),
    asyncHandler(async (req, res) => {
      const input = opts.createSchema.parse(req.body);
      const values = { ...input };
      if (opts.codeColumn && opts.codePrefix) {
        values[opts.codeColumn] = await nextCode(opts.tableName, camelToSnake(opts.codeColumn), opts.codePrefix, opts.codePad ?? 3);
      }
      const [row] = await (db.insert(table).values(values) as any).returning();
      await writeAudit({ userId: req.user!.userId, entityType: opts.entityType, entityId: row.id, action: "create", after: row });
      if (opts.onAfterWrite) await opts.onAfterWrite(row);
      res.status(201).json({ data: row });
    })
  );

  router.patch(
    "/:id",
    requirePermission(opts.entityType, "update"),
    asyncHandler(async (req, res) => {
      const id = Number(req.params.id);
      const before = (await db.select().from(table).where(eq(table.id, id)).limit(1))[0];
      if (!before) throw notFound(opts.entityType);
      const input = opts.updateSchema.parse(req.body);
      const [row] = await (db.update(table).set(input).where(eq(table.id, id)) as any).returning();
      await writeAudit({ userId: req.user!.userId, entityType: opts.entityType, entityId: id, action: "update", before, after: row });
      if (opts.onAfterWrite) await opts.onAfterWrite(row);
      res.json({ data: row });
    })
  );

  router.delete(
    "/:id",
    requirePermission(opts.entityType, "delete"),
    asyncHandler(async (req, res) => {
      const id = Number(req.params.id);
      const before = (await db.select().from(table).where(eq(table.id, id)).limit(1))[0];
      if (!before) throw notFound(opts.entityType);
      if (hasSoftDelete) {
        await db.update(table).set({ deletedAt: new Date() }).where(eq(table.id, id));
      } else {
        await db.delete(table).where(eq(table.id, id));
      }
      await writeAudit({ userId: req.user!.userId, entityType: opts.entityType, entityId: id, action: "delete", before });
      if (opts.onAfterWrite) await opts.onAfterWrite(before);
      res.status(204).send();
    })
  );

  return router;
}

function camelToSnake(s: string) {
  return s.replace(/[A-Z]/g, (m) => "_" + m.toLowerCase());
}
