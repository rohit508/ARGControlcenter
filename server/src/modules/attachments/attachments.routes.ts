import { Router } from "express";
import path from "path";
import fs from "fs";
import { Request } from "express";
import { db } from "../../db/client";
import { attachments } from "../../db/schema";
import { eq, and } from "drizzle-orm";
import { asyncHandler } from "../../middleware/errorHandler.middleware";
import { authenticate } from "../../middleware/auth.middleware";
import { notFound, forbidden, unauthenticated } from "../../middleware/errorHandler.middleware";
import { upload, UPLOAD_DIR } from "../../lib/upload";
import { writeAudit } from "../../lib/audit";
import { canManageAllTasks, isEmployeeTaskAssignee, authorizeAssignmentAccess, getAssignmentForAccessCheck } from "../employee-tasks/employee-tasks.service";

const router = Router();
router.use(authenticate);

// Generic per the `attachments` table's design (entityType/entityId), but only two entity types
// are wired up today — extend this switch if another module adopts attachments later.
async function assertCanAccessEntity(req: Request, entityType: string, entityId: number) {
  if (!req.user) throw unauthenticated();
  if (entityType === "employee-task") {
    if (await canManageAllTasks(req.user)) return;
    if (await isEmployeeTaskAssignee(req.user, entityId)) return;
    throw forbidden();
  }
  if (entityType === "employee-task-assignment") {
    // entityId here is an assignment id, not a task id — voice notes/files attached to a single
    // ticket's discussion thread, scoped the same way that thread's comments already are.
    const assignment = await getAssignmentForAccessCheck(entityId);
    await authorizeAssignmentAccess(assignment, req.user);
    return;
  }
  throw forbidden("Unsupported attachment entity type");
}

router.get(
  "/",
  asyncHandler(async (req, res) => {
    const entityType = String(req.query.entityType || "");
    const entityId = Number(req.query.entityId);
    if (!entityType || !entityId) throw notFound("Attachment");
    await assertCanAccessEntity(req, entityType, entityId);
    const rows = await db.select().from(attachments).where(and(eq(attachments.entityType, entityType), eq(attachments.entityId, entityId)));
    res.json({ data: rows, meta: { total: rows.length } });
  })
);

router.post(
  "/",
  upload.single("file"),
  asyncHandler(async (req, res) => {
    const entityType = String(req.query.entityType || "");
    const entityId = Number(req.query.entityId);
    const commentId = req.query.commentId ? Number(req.query.commentId) : null;
    if (!entityType || !entityId || !req.file) throw notFound("Attachment");
    await assertCanAccessEntity(req, entityType, entityId);

    const [row] = await db
      .insert(attachments)
      .values({
        entityType,
        entityId,
        commentId,
        fileName: req.file.originalname,
        filePath: req.file.filename,
        mimeType: req.file.mimetype,
        sizeBytes: req.file.size,
        uploadedBy: req.user!.userId,
      })
      .returning();
    await writeAudit({ userId: req.user!.userId, entityType: "attachment", entityId: row.id, action: "create", after: row });
    res.status(201).json({ data: row });
  })
);

router.get(
  "/:id/download",
  asyncHandler(async (req, res) => {
    const row = (await db.select().from(attachments).where(eq(attachments.id, Number(req.params.id))).limit(1))[0];
    if (!row) throw notFound("Attachment");
    await assertCanAccessEntity(req, row.entityType, row.entityId);
    res.download(path.join(UPLOAD_DIR, row.filePath), row.fileName);
  })
);

router.delete(
  "/:id",
  asyncHandler(async (req, res) => {
    const row = (await db.select().from(attachments).where(eq(attachments.id, Number(req.params.id))).limit(1))[0];
    if (!row) throw notFound("Attachment");
    const manageAll = await canManageAllTasks(req.user!);
    if (row.uploadedBy !== req.user!.userId && !manageAll) throw forbidden();

    await db.delete(attachments).where(eq(attachments.id, row.id));
    await writeAudit({ userId: req.user!.userId, entityType: "attachment", entityId: row.id, action: "delete", before: row });
    fs.unlink(path.join(UPLOAD_DIR, row.filePath), () => {});
    res.status(204).send();
  })
);

export default router;
