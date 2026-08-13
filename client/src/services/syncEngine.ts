import { db, OutboxEntry } from "./db";
import { Project, Task, Risk } from "../types";

/**
 * Both entry points take an injectable transport function rather than importing the real
 * `apiClient` directly. This is what makes the sync logic itself unit-testable in plain Node
 * (via fake-indexeddb) without needing a browser or a running server — see syncEngine.test.ts.
 * In the app, `services/offlineApi.ts` wires these to the real `api` client.
 */
export type Fetcher = <T>(path: string) => Promise<T>;
export type Sender = (entry: OutboxEntry) => Promise<{ ok: true } | { ok: false; retryable: boolean; message: string }>;

export async function pullAndCache(fetcher: Fetcher): Promise<{ projects: number; tasks: number; risks: number }> {
  const [projectsRes, tasksRes, risksRes] = await Promise.all([
    fetcher<{ data: Project[] }>("/projects"),
    fetcher<{ data: Task[] }>("/tasks"),
    fetcher<{ data: Risk[] }>("/risks"),
  ]);
  await db.transaction("rw", db.projects, db.tasks, db.risks, db.syncMeta, async () => {
    await db.projects.bulkPut(projectsRes.data);
    await db.tasks.bulkPut(tasksRes.data);
    await db.risks.bulkPut(risksRes.data);
    await db.syncMeta.put({ key: "lastPull", value: new Date().toISOString() });
  });
  return { projects: projectsRes.data.length, tasks: tasksRes.data.length, risks: risksRes.data.length };
}

/** Queues a write locally. Called by UI mutations instead of hitting the network directly when offline. */
export async function queueWrite(entry: Omit<OutboxEntry, "id" | "status" | "createdAt">): Promise<number> {
  return db.outbox.add({ ...entry, status: "pending", createdAt: Date.now() });
}

/**
 * Drains the outbox in FIFO order (createdAt) — order matters because, e.g., a task update
 * queued after its parent project's create must not be sent first. Stops at the first entry that
 * fails for a retryable (network) reason, leaving it and everything after it queued for the next
 * attempt; entries that fail for a non-retryable reason (validation, permission) are marked
 * 'conflict'/'failed' and do NOT block the rest of the queue from draining.
 */
export async function drainOutbox(sender: Sender): Promise<{ applied: number; failed: number; stoppedEarly: boolean }> {
  const pending = await db.outbox.where("status").equals("pending").sortBy("createdAt");
  let applied = 0;
  let failed = 0;

  for (const entry of pending) {
    await db.outbox.update(entry.id!, { status: "syncing" });
    const result = await sender(entry);
    if (result.ok) {
      await db.outbox.delete(entry.id!);
      applied++;
    } else if (result.retryable) {
      await db.outbox.update(entry.id!, { status: "pending" }); // leave for next drain attempt
      return { applied, failed, stoppedEarly: true };
    } else {
      await db.outbox.update(entry.id!, { status: "conflict", errorMessage: result.message });
      failed++;
    }
  }
  return { applied, failed, stoppedEarly: false };
}

export async function pendingCount(): Promise<number> {
  return db.outbox.where("status").equals("pending").count();
}

export async function conflictEntries(): Promise<OutboxEntry[]> {
  return db.outbox.where("status").equals("conflict").toArray();
}
