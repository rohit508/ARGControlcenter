import { Router } from "express";
import * as service from "./employees.service";
import { createEmployeeSchema, updateEmployeeSchema, createLoginSchema, updateRolesSchema } from "./employees.schema";
import { asyncHandler } from "../../middleware/errorHandler.middleware";
import { authenticate } from "../../middleware/auth.middleware";
import { requirePermission } from "../../middleware/rbac.middleware";

const router = Router();
router.use(authenticate);

router.get(
  "/",
  asyncHandler(async (req, res) => {
    const data = await service.listEmployees({
      q: req.query.q ? String(req.query.q) : undefined,
      departmentId: req.query.departmentId ? Number(req.query.departmentId) : undefined,
      status: req.query.status ? String(req.query.status) : undefined,
    });
    res.json({ data, meta: { total: data.length } });
  })
);

router.get(
  "/:id",
  asyncHandler(async (req, res) => {
    res.json({ data: await service.getEmployee(Number(req.params.id)) });
  })
);

router.post(
  "/",
  requirePermission("employees", "create"),
  asyncHandler(async (req, res) => {
    const input = createEmployeeSchema.parse(req.body);
    const row = await service.createEmployee(input, req.user!.userId);
    res.status(201).json({ data: row });
  })
);

router.patch(
  "/:id",
  requirePermission("employees", "update"),
  asyncHandler(async (req, res) => {
    const input = updateEmployeeSchema.parse(req.body);
    const row = await service.updateEmployee(Number(req.params.id), input, req.user!.userId);
    res.json({ data: row });
  })
);

router.delete(
  "/:id",
  requirePermission("employees", "delete"),
  asyncHandler(async (req, res) => {
    await service.deleteEmployee(Number(req.params.id), req.user!.userId);
    res.status(204).send();
  })
);

router.post(
  "/:id/create-login",
  requirePermission("employees", "update"),
  asyncHandler(async (req, res) => {
    const input = createLoginSchema.parse(req.body);
    const row = await service.createLoginForEmployee(Number(req.params.id), input, req.user!.userId);
    res.status(201).json({ data: row });
  })
);

router.put(
  "/:id/roles",
  requirePermission("employees", "update"),
  asyncHandler(async (req, res) => {
    const input = updateRolesSchema.parse(req.body);
    const row = await service.updateEmployeeRoles(Number(req.params.id), input, req.user!.userId);
    res.json({ data: row });
  })
);

export default router;
