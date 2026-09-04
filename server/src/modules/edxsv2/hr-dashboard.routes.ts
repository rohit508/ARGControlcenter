import { Router } from "express";
import { authenticate } from "../../middleware/auth.middleware";
import { requireRole } from "../../middleware/rbac.middleware";
import { asyncHandler } from "../../middleware/errorHandler.middleware";
import { getHrDashboard } from "./hr-dashboard.service";

const router = Router();

// The dashboard deliberately exposes a read-only aggregate. All HR create,
// update, approval, and deletion actions remain in EDXSv2.
router.use(authenticate, requireRole("HR", "CEO"));
router.get("/", asyncHandler(async (req, res) => {
  const requestedPeriod = String(req.query.period ?? "month").toLowerCase();
  const period = ["week", "month", "quarter", "year"].includes(requestedPeriod)
    ? requestedPeriod as "week" | "month" | "quarter" | "year"
    : "month";
  const entityValue = String(req.query.entityId ?? "").toLowerCase();
  const requestedEntityId = Number(entityValue);
  const entityId = entityValue === "all"
    ? null
    : Number.isInteger(requestedEntityId) && requestedEntityId > 0 ? requestedEntityId : undefined;
  const requestedStartDate = String(req.query.startDate ?? "");
  const startDate = /^\d{4}-\d{2}-\d{2}$/.test(requestedStartDate) ? requestedStartDate : undefined;
  res.json({ data: await getHrDashboard(period, entityId, startDate) });
}));

export default router;
