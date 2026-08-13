import { describe, it, expect, beforeEach } from "vitest";
import { db } from "./db";
import { pullAndCache, queueWrite, drainOutbox, pendingCount, conflictEntries } from "./syncEngine";
import { Project, Task, Risk } from "../types";

const sampleProject: Project = {
  id: 1, projectCode: "PRJ-001", name: "Test Project", departmentId: null, projectManagerId: null,
  sponsorId: null, client: null, priority: "High", category: null, status: "In Progress",
  startDate: null, endDate: null, baselineStart: null, baselineFinish: null, forecastFinish: null,
  budget: 100000, description: null, progressPctCache: 0.5, actualCostCache: 40000,
  forecastCostCache: 90000, healthCache: "Green", spiCache: 1, cpiCache: 1, riskScoreCache: 0,
};

beforeEach(async () => {
  // fresh local DB state before every test — proves each test's assertions come from that test,
  // not leftover state from a previous one
  await db.projects.clear();
  await db.tasks.clear();
  await db.risks.clear();
  await db.outbox.clear();
  await db.syncMeta.clear();
});

describe("pullAndCache", () => {
  it("stores fetched projects/tasks/risks into IndexedDB", async () => {
    const fetcher = async <T,>(path: string): Promise<T> => {
      if (path === "/projects") return { data: [sampleProject] } as unknown as T;
      if (path === "/tasks") return { data: [] as Task[] } as unknown as T;
      if (path === "/risks") return { data: [] as Risk[] } as unknown as T;
      throw new Error("unexpected path " + path);
    };

    const result = await pullAndCache(fetcher);
    expect(result).toEqual({ projects: 1, tasks: 0, risks: 0 });

    const cached = await db.projects.get(1);
    expect(cached?.name).toBe("Test Project");
    expect(cached?.healthCache).toBe("Green");

    const meta = await db.syncMeta.get("lastPull");
    expect(meta?.value).toBeTruthy();
  });

  it("overwrites (bulkPut) rather than duplicates on repeated pulls", async () => {
    const fetcher = async <T,>() => ({ data: [sampleProject] }) as unknown as T;
    await pullAndCache(fetcher);
    await pullAndCache(fetcher); // pull again
    const all = await db.projects.toArray();
    expect(all).toHaveLength(1); // not 2
  });
});

describe("queueWrite + drainOutbox", () => {
  it("queues an entry as pending", async () => {
    await queueWrite({ method: "POST", path: "/tasks", body: { name: "x" }, entityType: "task" });
    expect(await pendingCount()).toBe(1);
  });

  it("removes entries from the outbox on successful send, in FIFO order", async () => {
    const order: string[] = [];
    await queueWrite({ method: "POST", path: "/a", entityType: "task" });
    await queueWrite({ method: "POST", path: "/b", entityType: "task" });
    await queueWrite({ method: "POST", path: "/c", entityType: "task" });

    const result = await drainOutbox(async (entry) => {
      order.push(entry.path);
      return { ok: true };
    });

    expect(order).toEqual(["/a", "/b", "/c"]); // proves FIFO ordering is respected
    expect(result).toEqual({ applied: 3, failed: 0, stoppedEarly: false });
    expect(await pendingCount()).toBe(0);
  });

  it("stops draining on a retryable (network) failure and leaves the rest queued", async () => {
    await queueWrite({ method: "POST", path: "/a", entityType: "task" });
    await queueWrite({ method: "POST", path: "/b", entityType: "task" });
    await queueWrite({ method: "POST", path: "/c", entityType: "task" });

    let calls = 0;
    const result = await drainOutbox(async (entry) => {
      calls++;
      if (entry.path === "/b") return { ok: false, retryable: true, message: "network down" };
      return { ok: true };
    });

    expect(calls).toBe(2); // /a succeeded, /b failed and stopped the drain — /c never attempted
    expect(result.stoppedEarly).toBe(true);
    expect(result.applied).toBe(1);
    expect(await pendingCount()).toBe(2); // /b and /c both still pending, ready for the next attempt
  });

  it("marks non-retryable failures as conflict but keeps draining the rest of the queue", async () => {
    await queueWrite({ method: "PATCH", path: "/tasks/1", entityType: "task" });
    await queueWrite({ method: "PATCH", path: "/tasks/2", entityType: "task" });

    const result = await drainOutbox(async (entry) => {
      if (entry.path === "/tasks/1") return { ok: false, retryable: false, message: "422 validation error" };
      return { ok: true };
    });

    expect(result).toEqual({ applied: 1, failed: 1, stoppedEarly: false });
    expect(await pendingCount()).toBe(0); // nothing left pending — the failed one moved to 'conflict', not stuck as pending

    const conflicts = await conflictEntries();
    expect(conflicts).toHaveLength(1);
    expect(conflicts[0].path).toBe("/tasks/1");
    expect(conflicts[0].errorMessage).toBe("422 validation error");
  });

  it("does nothing when the outbox is empty", async () => {
    const result = await drainOutbox(async () => ({ ok: true }));
    expect(result).toEqual({ applied: 0, failed: 0, stoppedEarly: false });
  });
});
