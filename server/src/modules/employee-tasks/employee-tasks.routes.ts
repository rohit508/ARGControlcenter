import { Router } from "express";
import * as service from "./employee-tasks.service";
import { createTaskSchema, updateTaskSchema, updateAssignmentStatusSchema, addCommentSchema, deleteTaskSchema } from "./employee-tasks.schema";
import { asyncHandler } from "../../middleware/errorHandler.middleware";
import { authenticate } from "../../middleware/auth.middleware";
import { requirePermission, requireRole } from "../../middleware/rbac.middleware";

const router = Router();
router.use(authenticate);

router.get(
  "/",
  asyncHandler(async (req, res) => {
    const employeeId = req.query.employeeId ? Number(req.query.employeeId) : undefined;
    const departmentId = req.query.departmentId ? Number(req.query.departmentId) : undefined;
    const viewScope = req.query.viewScope === "all" || req.query.viewScope === "my-team" ? req.query.viewScope : undefined;
    const data = await service.listTasks(req.user!, { employeeId, departmentId, viewScope });
    res.json({ data, meta: { total: data.length } });
  })
);

// Registered before "/:id" — a literal path must come before a param path, or Express would
// treat "my-team"/"stats" as an :id value (same rule crudFactory's extraRoutes hook documents).
router.get(
  "/my-team",
  requireRole("DepartmentHead"),
  asyncHandler(async (req, res) => {
    res.json({ data: await service.getMyTeam(req.user!) });
  })
);

router.get(
  "/stats",
  asyncHandler(async (req, res) => {
    const employeeId = req.query.employeeId && !Number.isNaN(Number(req.query.employeeId)) ? Number(req.query.employeeId) : undefined;
    const viewScope = req.query.viewScope === "all" || req.query.viewScope === "my-team" ? req.query.viewScope : undefined;
    res.json({ data: await service.getStats(req.user!, { employeeId, viewScope }) });
  })
);

// Registered before "/:id" for the same reason as "/my-team" and "/stats" above.
router.get(
  "/deleted",
  asyncHandler(async (req, res) => {
    const data = await service.listDeletedTasks(req.user!);
    res.json({ data, meta: { total: data.length } });
  })
);

// Registered before "/:id" for the same reason as "/my-team" and "/stats" above.
router.get(
  "/department-teams",
  asyncHandler(async (req, res) => {
    const data = await service.getAllDepartmentTeams(req.user!);
    res.json({ data, meta: { total: data.length } });
  })
);

router.get(
  "/:id",
  asyncHandler(async (req, res) => {
    res.json({ data: await service.getTask(Number(req.params.id), req.user!) });
  })
);

router.post(
  "/",
  requirePermission("employee-tasks", "create"),
  asyncHandler(async (req, res) => {
    const input = createTaskSchema.parse(req.body);
    const task = await service.createTask(input, req.user!);
    res.status(201).json({ data: task });
  })
);

router.patch(
  "/:id",
  requirePermission("employee-tasks", "update"),
  asyncHandler(async (req, res) => {
    const input = updateTaskSchema.parse(req.body);
    const task = await service.updateTask(Number(req.params.id), input, req.user!);
    res.json({ data: task });
  })
);

router.delete(
  "/:id",
  requirePermission("employee-tasks", "delete"),
  asyncHandler(async (req, res) => {
    const { reason } = deleteTaskSchema.parse(req.body);
    await service.deleteTask(Number(req.params.id), req.user!.userId, reason);
    res.status(204).send();
  })
);

// Self-service: authorized by row ownership (are you the assignee) inside the service, not by
// requirePermission — see employee-tasks.service.ts's authorizeAssignmentAccess().
router.patch(
  "/assignments/:assignmentId/status",
  asyncHandler(async (req, res) => {
    const input = updateAssignmentStatusSchema.parse(req.body);
    const row = await service.updateAssignmentStatus(Number(req.params.assignmentId), req.user!, input);
    res.json({ data: row });
  })
);

router.get(
  "/assignments/:assignmentId/comments",
  asyncHandler(async (req, res) => {
    const data = await service.listComments(Number(req.params.assignmentId), req.user!);
    res.json({ data, meta: { total: data.length } });
  })
);

router.post(
  "/assignments/:assignmentId/comments",
  asyncHandler(async (req, res) => {
    const { body } = addCommentSchema.parse(req.body);
    const row = await service.addComment(Number(req.params.assignmentId), req.user!, body);
    res.status(201).json({ data: row });
  })
);

export default router;
