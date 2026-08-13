import { api } from "./apiClient";
import { db } from "./db";
import { pullAndCache, queueWrite, drainOutbox, Sender } from "./syncEngine";
import { Project } from "../types";

export function isOnline(): boolean {
  return typeof navigator === "undefined" ? true : navigator.onLine;
}

const realSender: Sender = async (entry) => {
  try {
    if (entry.method === "POST") await api.post(entry.path, entry.body);
    else if (entry.method === "PATCH") await api.patch(entry.path, entry.body);
    else if (entry.method === "DELETE") await api.delete(entry.path);
    return { ok: true };
  } catch (err: any) {
    // 4xx (validation/permission/conflict) = not retryable, surfaces to the user as a real
    // problem with the write itself. Network failures / 5xx = retryable, stays queued.
    const status = err?.status;
    const retryable = !status || status >= 500;
    return { ok: false, retryable, message: err?.message || "Sync failed" };
  }
};

export async function syncNow() {
  if (!isOnline()) return { synced: false, reason: "offline" as const };
  const drainResult = await drainOutbox(realSender);
  const pullResult = await pullAndCache(<T,>(path: string) => api.get<T>(path));
  return { synced: true, drainResult, pullResult };
}

/** Read path used by pages: prefer live data when online, transparently fall back to the local
 *  cache when offline or when the network call fails — the UI never has to branch on this itself. */
export async function getProjects(): Promise<Project[]> {
  if (isOnline()) {
    try {
      const res = await api.get<{ data: Project[] }>("/projects");
      await db.projects.bulkPut(res.data);
      return res.data;
    } catch {
      // fall through to cache
    }
  }
  return db.projects.toArray();
}

export async function createProjectOffline(input: Partial<Project>) {
  if (isOnline()) {
    return api.post<{ data: Project }>("/projects", input);
  }
  // optimistic local write with a negative temp id so it's visually distinguishable and never
  // collides with a real server id until the outbox drains and replaces it
  const tempId = -Date.now();
  const optimistic = { ...input, id: tempId } as Project;
  await db.projects.put(optimistic);
  await queueWrite({ method: "POST", path: "/projects", body: input, entityType: "project" });
  return { data: optimistic };
}
