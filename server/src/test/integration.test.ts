import "../test/setup"; // MUST be first: creates + migrates the isolated test database
import { describe, it, expect, beforeAll } from "vitest";
import request from "supertest";
import { createApp } from "../app";
import { seedTestFixtures, TEST_PASSWORD } from "../test/fixtures";
import { isOverdue, getEffectiveStatus, sweepOverdueTasks } from "../modules/employee-tasks/employee-tasks.service";

const app = createApp();

function isoDateOffset(days: number): string {
  return new Date(Date.now() + days * 86_400_000).toISOString().slice(0, 10);
}

async function login(email: string, password = TEST_PASSWORD) {
  const res = await request(app).post("/api/v1/auth/login").send({ email, password });
  return res.body.accessToken as string;
}

describe("Enterprise ERP — integration suite", () => {
  let adminToken: string, pmToken: string, financeToken: string, employeeToken: string;
  let accountCashId: number, accountExpenseId: number, staffEmployeeId: number;

  beforeAll(async () => {
    const fx = await seedTestFixtures();
    accountCashId = fx.accountCashId;
    accountExpenseId = fx.accountExpenseId;
    staffEmployeeId = fx.staffEmployeeId;
    adminToken = await login("admin@test.local");
    pmToken = await login("pm@test.local");
    financeToken = await login("finance@test.local");
    employeeToken = await login("employee@test.local");
  });

  // ============================================================== HEALTH ===
  describe("Health & readiness", () => {
    it("GET /health returns 200 without hitting the database", async () => {
      const res = await request(app).get("/api/v1/health");
      expect(res.status).toBe(200);
      expect(res.body.status).toBe("ok");
    });
    it("GET /ready confirms the database is actually reachable", async () => {
      const res = await request(app).get("/api/v1/ready");
      expect(res.status).toBe(200);
      expect(res.body.status).toBe("ready");
    });
  });

  // ================================================================ AUTH ===
  describe("Authentication", () => {
    it("rejects an unknown email", async () => {
      const res = await request(app).post("/api/v1/auth/login").send({ email: "nobody@test.local", password: "whatever" });
      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe("UNAUTHENTICATED");
    });
    it("rejects a wrong password", async () => {
      const res = await request(app).post("/api/v1/auth/login").send({ email: "admin@test.local", password: "wrong" });
      expect(res.status).toBe(401);
    });
    it("issues an access + refresh token pair on success", async () => {
      const res = await request(app).post("/api/v1/auth/login").send({ email: "admin@test.local", password: TEST_PASSWORD });
      expect(res.status).toBe(200);
      expect(res.body.accessToken).toBeTruthy();
      expect(res.body.refreshToken).toBeTruthy();
      expect(res.body.user.roles).toContain("Admin");
    });
    it("rejects any request with no token", async () => {
      const res = await request(app).get("/api/v1/projects");
      expect(res.status).toBe(401);
    });
    it("rejects a malformed/garbage token", async () => {
      const res = await request(app).get("/api/v1/projects").set("Authorization", "Bearer not-a-real-token");
      expect(res.status).toBe(401);
    });
    it("refresh token rotation issues a new access token", async () => {
      const loginRes = await request(app).post("/api/v1/auth/login").send({ email: "admin@test.local", password: TEST_PASSWORD });
      const refreshRes = await request(app).post("/api/v1/auth/refresh").send({ refreshToken: loginRes.body.refreshToken });
      expect(refreshRes.status).toBe(200);
      expect(refreshRes.body.accessToken).toBeTruthy();
      expect(refreshRes.body.accessToken).not.toBe(loginRes.body.accessToken);
    });
  });

  // ================================================================ RBAC ===
  describe("RBAC enforcement", () => {
    it("blocks an Employee from creating a project", async () => {
      const res = await request(app).post("/api/v1/projects").set("Authorization", `Bearer ${employeeToken}`).send({ name: "Should be blocked" });
      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe("FORBIDDEN");
    });
    it("allows a ProjectManager to create a project", async () => {
      const res = await request(app).post("/api/v1/projects").set("Authorization", `Bearer ${pmToken}`).send({ name: "PM-created project", budget: 500000 });
      expect(res.status).toBe(201);
    });
    it("blocks Finance from creating a project but allows creating a budget entry", async () => {
      const projRes = await request(app).post("/api/v1/projects").set("Authorization", `Bearer ${adminToken}`).send({ name: "Finance RBAC test project", budget: 100000 });
      const blocked = await request(app).post("/api/v1/projects").set("Authorization", `Bearer ${financeToken}`).send({ name: "x" });
      expect(blocked.status).toBe(403);
      const allowed = await request(app)
        .post("/api/v1/budget-entries")
        .set("Authorization", `Bearer ${financeToken}`)
        .send({ projectId: projRes.body.data.id, costCategory: "Labor", transactionDate: "2026-08-01", actualCost: 1000 });
      expect(allowed.status).toBe(201);
    });
  });

  // ============================================================ PROJECTS ===
  describe("Project EVM recalculation chain", () => {
    it("recalculates project progress automatically when a task is written", async () => {
      const proj = await request(app).post("/api/v1/projects").set("Authorization", `Bearer ${adminToken}`).send({
        name: "EVM chain test", budget: 1000000, baselineStart: "2026-01-01", baselineFinish: "2026-12-31",
      });
      const projectId = proj.body.data.id;
      expect(proj.body.data.progressPctCache).toBe(0);

      await request(app).post("/api/v1/tasks").set("Authorization", `Bearer ${adminToken}`).send({
        projectId, name: "Design", status: "In Progress", progressPct: 0.5, startDate: "2026-01-01", finishDate: "2026-01-15",
      });

      const updated = await request(app).get(`/api/v1/projects/${projectId}`).set("Authorization", `Bearer ${adminToken}`);
      expect(updated.body.data.progressPctCache).toBe(0.5); // proves the write chain actually fired, not just accepted the POST
    });

    it("computes duration-weighted progress across multiple tasks, not a simple average", async () => {
      const proj = await request(app).post("/api/v1/projects").set("Authorization", `Bearer ${adminToken}`).send({ name: "Weighted progress test", budget: 100000 });
      const projectId = proj.body.data.id;
      // 10-day task at 100%, 30-day task at 0% -> weighted average should be 0.25, NOT 0.5
      await request(app).post("/api/v1/tasks").set("Authorization", `Bearer ${adminToken}`).send({ projectId, name: "Short", status: "Completed", progressPct: 1, startDate: "2026-01-01", finishDate: "2026-01-10" });
      await request(app).post("/api/v1/tasks").set("Authorization", `Bearer ${adminToken}`).send({ projectId, name: "Long", status: "Not Started", progressPct: 0, startDate: "2026-01-01", finishDate: "2026-01-30" });
      const updated = await request(app).get(`/api/v1/projects/${projectId}`).set("Authorization", `Bearer ${adminToken}`);
      expect(updated.body.data.progressPctCache).toBeCloseTo(0.25, 2);
    });
  });

  // ========================================================== WORKFLOW ===
  describe("Change Request workflow engine", () => {
    it("enforces step order and step-specific approver roles end to end", async () => {
      const proj = await request(app).post("/api/v1/projects").set("Authorization", `Bearer ${adminToken}`).send({ name: "Workflow test project", budget: 50000 });
      const cr = await request(app).post("/api/v1/change-requests").set("Authorization", `Bearer ${pmToken}`).send({ projectId: proj.body.data.id, description: "Test change" });
      const crId = cr.body.data.id;

      const submit = await request(app).post(`/api/v1/change-requests/${crId}/submit`).set("Authorization", `Bearer ${pmToken}`);
      expect(submit.status).toBe(200);
      expect(submit.body.data.status).toBe("Under Review");

      const wrongRole = await request(app).post(`/api/v1/change-requests/${crId}/approve`).set("Authorization", `Bearer ${financeToken}`);
      expect(wrongRole.status).toBe(403);

      const step1 = await request(app).post(`/api/v1/change-requests/${crId}/approve`).set("Authorization", `Bearer ${pmToken}`);
      expect(step1.status).toBe(200);
      expect(step1.body.data.approvalStatus).toBe("Pending");

      const step2 = await request(app).post(`/api/v1/change-requests/${crId}/approve`).set("Authorization", `Bearer ${financeToken}`);
      expect(step2.status).toBe(200);
      expect(step2.body.data.approvalStatus).toBe("Approved");
      expect(step2.body.data.status).toBe("Implemented");
    });

    it("rejects at any step and stops the flow immediately", async () => {
      const proj = await request(app).post("/api/v1/projects").set("Authorization", `Bearer ${adminToken}`).send({ name: "Reject test project", budget: 10000 });
      const cr = await request(app).post("/api/v1/change-requests").set("Authorization", `Bearer ${pmToken}`).send({ projectId: proj.body.data.id, description: "Will be rejected" });
      await request(app).post(`/api/v1/change-requests/${cr.body.data.id}/submit`).set("Authorization", `Bearer ${pmToken}`);
      const rejected = await request(app).post(`/api/v1/change-requests/${cr.body.data.id}/reject`).set("Authorization", `Bearer ${pmToken}`);
      expect(rejected.body.data.approvalStatus).toBe("Rejected");
      const secondAction = await request(app).post(`/api/v1/change-requests/${cr.body.data.id}/approve`).set("Authorization", `Bearer ${financeToken}`);
      expect(secondAction.status).toBe(409);
    });
  });

  // ============================================================ FINANCE ===
  describe("Double-entry ledger validation", () => {
    it("rejects an unbalanced journal entry", async () => {
      const res = await request(app)
        .post("/api/v1/finance/journal-entries")
        .set("Authorization", `Bearer ${financeToken}`)
        .send({ entryDate: "2026-08-01", lines: [{ accountId: accountExpenseId, debit: 100, credit: 0 }, { accountId: accountCashId, debit: 0, credit: 50 }] });
      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe("VALIDATION_ERROR");
    });
    it("accepts a balanced journal entry and reflects it in the trial balance", async () => {
      const res = await request(app)
        .post("/api/v1/finance/journal-entries")
        .set("Authorization", `Bearer ${financeToken}`)
        .send({ entryDate: "2026-08-01", lines: [{ accountId: accountExpenseId, debit: 250, credit: 0 }, { accountId: accountCashId, debit: 0, credit: 250 }] });
      expect(res.status).toBe(201);

      const tb = await request(app).get("/api/v1/finance/trial-balance").set("Authorization", `Bearer ${adminToken}`);
      const cash = tb.body.data.find((a: { accountId: number }) => a.accountId === accountCashId);
      expect(cash.credit).toBeGreaterThanOrEqual(250);
    });
    it("rejects a journal line with both a debit and a credit amount", async () => {
      const res = await request(app)
        .post("/api/v1/finance/journal-entries")
        .set("Authorization", `Bearer ${financeToken}`)
        .send({ entryDate: "2026-08-01", lines: [{ accountId: accountCashId, debit: 10, credit: 10 }, { accountId: accountExpenseId, debit: 0, credit: 10 }] });
      expect(res.status).toBe(400);
    });
  });

  // ==================================================== EMPLOYEE TASKS ===
  describe("Employee task overdue/late-completion workflow", () => {
    it("isOverdue treats the due date as an end-of-day cutoff when no due time is set", () => {
      const dueDate = isoDateOffset(0); // today
      expect(isOverdue(dueDate, null, new Date(`${dueDate}T10:00:00`))).toBe(false);
      expect(isOverdue(dueDate, null, new Date(`${dueDate}T23:59:59`))).toBe(false);
      expect(isOverdue(isoDateOffset(-1), null, new Date())).toBe(true);
      expect(isOverdue(null, null, new Date())).toBe(false);
    });

    it("isOverdue uses the exact due time when one is set, instead of end-of-day", () => {
      const dueDate = isoDateOffset(0); // today
      expect(isOverdue(dueDate, "14:00", new Date(`${dueDate}T13:59:00`))).toBe(false);
      expect(isOverdue(dueDate, "14:00", new Date(`${dueDate}T14:01:00`))).toBe(true);
    });

    it("getEffectiveStatus only reclassifies Pending/In Progress past their due date", () => {
      const overdueDate = isoDateOffset(-1);
      expect(getEffectiveStatus("Pending", overdueDate, null)).toBe("Not Done");
      expect(getEffectiveStatus("In Progress", overdueDate, null)).toBe("Not Done");
      expect(getEffectiveStatus("Completed", overdueDate, null)).toBe("Completed");
      expect(getEffectiveStatus("Not Done", overdueDate, null)).toBe("Not Done");
      expect(getEffectiveStatus("Pending", isoDateOffset(1), null)).toBe("Pending");
    });

    it("completing an assignment before its due date stays Completed", async () => {
      const task = await request(app)
        .post("/api/v1/employee-tasks")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ title: "On-time task", dueDate: isoDateOffset(5), assigneeIds: [staffEmployeeId] });
      const assignmentId = task.body.data.assignments[0].id;

      const res = await request(app)
        .patch(`/api/v1/employee-tasks/assignments/${assignmentId}/status`)
        .set("Authorization", `Bearer ${employeeToken}`)
        .send({ status: "Completed" });

      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe("Completed");
      expect(res.body.data.completedAt).toBeTruthy();
    });

    it("completing an assignment after its due date has passed becomes Completed After Due Date", async () => {
      const task = await request(app)
        .post("/api/v1/employee-tasks")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ title: "Overdue task", dueDate: isoDateOffset(-2), assigneeIds: [staffEmployeeId] });
      const assignmentId = task.body.data.assignments[0].id;

      const res = await request(app)
        .patch(`/api/v1/employee-tasks/assignments/${assignmentId}/status`)
        .set("Authorization", `Bearer ${employeeToken}`)
        .send({ status: "Completed" });

      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe("Completed After Due Date");
    });

    it("list/get responses reflect overdue status live even before the sweep runs", async () => {
      const task = await request(app)
        .post("/api/v1/employee-tasks")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ title: "Not yet swept", dueDate: isoDateOffset(-1), assigneeIds: [staffEmployeeId] });
      const taskId = task.body.data.id;

      const fetched = await request(app).get(`/api/v1/employee-tasks/${taskId}`).set("Authorization", `Bearer ${adminToken}`);
      expect(fetched.body.data.assignments[0].status).toBe("Not Done");
    });

    it("sweepOverdueTasks persists the Not Done transition with a system reason", async () => {
      const task = await request(app)
        .post("/api/v1/employee-tasks")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ title: "Sweep target", dueDate: isoDateOffset(-3), assigneeIds: [staffEmployeeId] });
      const assignmentId = task.body.data.assignments[0].id;

      const swept = await sweepOverdueTasks();
      expect(swept).toBeGreaterThanOrEqual(1);

      const fetched = await request(app).get(`/api/v1/employee-tasks/${task.body.data.id}`).set("Authorization", `Bearer ${adminToken}`);
      const assignment = fetched.body.data.assignments.find((a: { id: number }) => a.id === assignmentId);
      expect(assignment.status).toBe("Not Done");
      expect(assignment.notDoneReason).toMatch(/due date passed/i);
    });

    it("stats separate Completed from Completed After Due Date but count both toward completionPct", async () => {
      const onTime = await request(app)
        .post("/api/v1/employee-tasks")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ title: "Stats on-time", dueDate: isoDateOffset(5), assigneeIds: [staffEmployeeId] });
      await request(app)
        .patch(`/api/v1/employee-tasks/assignments/${onTime.body.data.assignments[0].id}/status`)
        .set("Authorization", `Bearer ${employeeToken}`)
        .send({ status: "Completed" });

      const late = await request(app)
        .post("/api/v1/employee-tasks")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ title: "Stats late", dueDate: isoDateOffset(-2), assigneeIds: [staffEmployeeId] });
      await request(app)
        .patch(`/api/v1/employee-tasks/assignments/${late.body.data.assignments[0].id}/status`)
        .set("Authorization", `Bearer ${employeeToken}`)
        .send({ status: "Completed" });

      const stats = await request(app)
        .get(`/api/v1/employee-tasks/stats?employeeId=${staffEmployeeId}`)
        .set("Authorization", `Bearer ${adminToken}`);
      expect(stats.body.data.statusCounts.Completed).toBeGreaterThanOrEqual(1);
      expect(stats.body.data.statusCounts["Completed After Due Date"]).toBeGreaterThanOrEqual(1);
    });
  });

  // ========================================================= RATE LIMIT ===
  describe("Auth rate limiting", () => {
    it("blocks after repeated failed login attempts, even with a fresh correct password", async () => {
      for (let i = 0; i < 10; i++) {
        await request(app).post("/api/v1/auth/login").send({ email: "admin@test.local", password: "wrong-" + i });
      }
      const res = await request(app).post("/api/v1/auth/login").send({ email: "admin@test.local", password: TEST_PASSWORD });
      expect(res.status).toBe(429);
      expect(res.body.error.code).toBe("RATE_LIMITED");
    });
  });

  // =============================================================== MISC ===
  describe("Error handling", () => {
    it("returns a structured 404 for an unknown route", async () => {
      const res = await request(app).get("/api/v1/this-route-does-not-exist").set("Authorization", `Bearer ${adminToken}`);
      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe("NOT_FOUND");
    });
    it("returns a structured 404 for a real resource with a bogus id", async () => {
      const res = await request(app).get("/api/v1/projects/999999").set("Authorization", `Bearer ${adminToken}`);
      expect(res.status).toBe(404);
    });
  });
});
