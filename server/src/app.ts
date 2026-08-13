import "dotenv/config"; // MUST be first: env.ts reads process.env at import time
import express, { Request, Response, NextFunction } from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import { env, corsOrigins } from "./env";
import { errorHandler } from "./middleware/errorHandler.middleware";
import { sqlite } from "./db/client";

import authRoutes from "./modules/auth/auth.routes";
import projectsRoutes from "./modules/projects/projects.routes";
import tasksRoutes from "./modules/tasks/tasks.routes";
import risksRoutes from "./modules/risks/risks.routes";
import issuesRoutes from "./modules/issues/issues.routes";
import budgetRoutes from "./modules/budget/budget.routes";
import changeRequestsRoutes from "./modules/change-requests/change-requests.routes";
import milestonesRoutes from "./modules/milestones/milestones.routes";
import meetingsRoutes from "./modules/meetings/meetings.routes";
import actionItemsRoutes from "./modules/action-items/action-items.routes";
import lessonsLearnedRoutes from "./modules/lessons-learned/lessons-learned.routes";
import kpiEngineRoutes from "./modules/kpi-engine/kpi-engine.routes";
import configRoutes from "./modules/config/config.routes";
import ganttRoutes from "./modules/tasks/gantt.routes";
import workflowRoutes from "./modules/workflow/workflow.routes";
import resourcesRoutes from "./modules/resources/resources.routes";
import { leadsRouter, customersRouter, opportunitiesRouter } from "./modules/crm/crm.routes";
import financeRoutes from "./modules/finance/finance.routes";
import { vendorsRouter, purchaseOrdersRouter } from "./modules/procurement/procurement.routes";
import { leaveRouter, attendanceRouter } from "./modules/hr/hr.routes";
import inventoryRoutes from "./modules/inventory/inventory.routes";
import manufacturingRoutes from "./modules/manufacturing/manufacturing.routes";
import assetsRoutes from "./modules/assets/assets.routes";
import helpdeskRoutes, { kbRouter } from "./modules/helpdesk/helpdesk.routes";
import analyticsRoutes from "./modules/analytics/analytics.routes";
import employeeTasksRoutes from "./modules/employee-tasks/employee-tasks.routes";
import employeesRoutes from "./modules/employees/employees.routes";
import departmentsRoutes from "./modules/departments/departments.routes";
import attachmentsRoutes from "./modules/attachments/attachments.routes";
import rbacRoutes from "./modules/rbac/rbac.routes";

export function createApp() {
  const app = express();

  app.use(helmet());
  // CORS is an allowlist, not a wildcard — env.CORS_ORIGINS in production should be the real
  // deployed frontend origin(s), never "*". A wildcard here plus credentialed requests is a
  // textbook CORS misconfiguration a real audit would flag on sight.
  app.use(cors({ origin: corsOrigins, credentials: true }));
  app.use(express.json({ limit: "2mb" }));

  // Structured request logging — one line per request with method, path, status, duration.
  // Deliberately dependency-free (no morgan/pino) to avoid pulling in more of the sandbox's
  // constrained npm surface than necessary; this is the minimum a production log aggregator
  // (CloudWatch, Datadog, etc.) needs to be useful.
  if (env.NODE_ENV !== "test") {
    app.use((req: Request, res: Response, next: NextFunction) => {
      const start = Date.now();
      res.on("finish", () => {
        const ms = Date.now() - start;
        console.log(JSON.stringify({ ts: new Date().toISOString(), method: req.method, path: req.originalUrl, status: res.statusCode, ms }));
      });
      next();
    });
  }

  const globalLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 300, standardHeaders: true, legacyHeaders: false });
  app.use("/api/v1", globalLimiter);

  const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 10,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: { code: "RATE_LIMITED", message: "Too many login attempts. Try again later." } },
  });
  app.use("/api/v1/auth/login", authLimiter);

  // Liveness: "is the process up." Never touches the database — a slow/locked DB should not
  // make an orchestrator think the whole process is dead and kill it.
  app.get("/api/v1/health", (_req, res) => res.json({ status: "ok", time: new Date().toISOString() }));

  // Readiness: "is this instance able to actually serve traffic." Checked separately from
  // liveness because that distinction is exactly what a Kubernetes-style orchestrator (or any
  // load balancer health check) needs to route around an instance that's up but DB-broken.
  app.get("/api/v1/ready", (_req, res) => {
    try {
      sqlite.prepare("SELECT 1").get();
      res.json({ status: "ready" });
    } catch (err) {
      res.status(503).json({ status: "not_ready", error: err instanceof Error ? err.message : "unknown" });
    }
  });

  app.use("/api/v1/auth", authRoutes);
  app.use("/api/v1/projects", projectsRoutes);
  app.use("/api/v1/tasks", tasksRoutes);
  app.use("/api/v1/risks", risksRoutes);
  app.use("/api/v1/issues", issuesRoutes);
  app.use("/api/v1/budget-entries", budgetRoutes);
  app.use("/api/v1/change-requests", changeRequestsRoutes);
  app.use("/api/v1/milestones", milestonesRoutes);
  app.use("/api/v1/meetings", meetingsRoutes);
  app.use("/api/v1/action-items", actionItemsRoutes);
  app.use("/api/v1/lessons-learned", lessonsLearnedRoutes);
  app.use("/api/v1/kpi-engine", kpiEngineRoutes);
  app.use("/api/v1/config/lookups", configRoutes);
  app.use("/api/v1/gantt", ganttRoutes);
  app.use("/api/v1/workflows", workflowRoutes);
  app.use("/api/v1/resources", resourcesRoutes);
  app.use("/api/v1/leads", leadsRouter);
  app.use("/api/v1/customers", customersRouter);
  app.use("/api/v1/opportunities", opportunitiesRouter);
  app.use("/api/v1/finance", financeRoutes);
  app.use("/api/v1/vendors", vendorsRouter);
  app.use("/api/v1/purchase-orders", purchaseOrdersRouter);
  app.use("/api/v1/leave-requests", leaveRouter);
  app.use("/api/v1/attendance", attendanceRouter);
  app.use("/api/v1/inventory", inventoryRoutes);
  app.use("/api/v1/manufacturing", manufacturingRoutes);
  app.use("/api/v1/assets", assetsRoutes);
  app.use("/api/v1/tickets", helpdeskRoutes);
  app.use("/api/v1/kb-articles", kbRouter);
  app.use("/api/v1/analytics", analyticsRoutes);
  app.use("/api/v1/employee-tasks", employeeTasksRoutes);
  app.use("/api/v1/employees", employeesRoutes);
  app.use("/api/v1/departments", departmentsRoutes);
  app.use("/api/v1/attachments", attachmentsRoutes);
  app.use("/api/v1/rbac", rbacRoutes);

  app.use((req, res) => res.status(404).json({ error: { code: "NOT_FOUND", message: `No route for ${req.method} ${req.path}` } }));
  app.use(errorHandler);

  return app;
}

export const app = createApp();
