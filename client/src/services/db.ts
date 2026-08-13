import Dexie, { Table } from "dexie";
import { Project, Task, Risk } from "../types";

export interface OutboxEntry {
  id?: number; // Dexie auto-increment local id
  method: "POST" | "PATCH" | "DELETE";
  path: string;
  body?: unknown;
  entityType: string;
  createdAt: number;
  status: "pending" | "syncing" | "conflict" | "failed";
  errorMessage?: string;
}

export interface SyncMeta {
  key: string;
  value: string;
}

/**
 * The offline-first local database described in 01-system-architecture.md §1.2. The UI reads
 * from and writes to these tables directly and NEVER blocks on the network — the sync engine
 * (syncEngine.ts) is what reconciles this with the server, not the components themselves.
 */
export class ErpDatabase extends Dexie {
  projects!: Table<Project, number>;
  tasks!: Table<Task, number>;
  risks!: Table<Risk, number>;
  outbox!: Table<OutboxEntry, number>;
  syncMeta!: Table<SyncMeta, string>;

  constructor() {
    super("erp-offline-db");
    this.version(1).stores({
      projects: "id, projectCode, status, healthCache",
      tasks: "id, projectId, status",
      risks: "id, projectId, status",
      outbox: "++id, status, createdAt, entityType",
      syncMeta: "key",
    });
  }
}

export const db = new ErpDatabase();
