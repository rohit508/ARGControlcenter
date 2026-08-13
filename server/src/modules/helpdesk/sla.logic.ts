/**
 * SLA status is computed, not stored: a ticket still open past createdAt + slaHours is breached.
 * This can never silently drift out of sync the way a manually-set flag could.
 *
 * Extracted from helpdesk.routes.ts for the same reason as depreciation.logic.ts — real,
 * repeatable unit tests instead of a single hand-verified curl call.
 */
export type SlaStatus = "Within SLA" | "Breached" | "Met";

export interface TicketForSla {
  createdAt: Date | number;
  slaHours: number;
  status: string;
  resolvedAt: Date | number | null;
}

export function computeSlaStatus(t: TicketForSla, now: Date = new Date()): SlaStatus {
  const created = new Date(t.createdAt).getTime();
  const deadline = created + t.slaHours * 3_600_000;
  const isResolved = t.status === "Resolved" || t.status === "Closed";

  if (isResolved) {
    const resolvedTime = t.resolvedAt ? new Date(t.resolvedAt).getTime() : now.getTime();
    return resolvedTime > deadline ? "Breached" : "Met";
  }
  return now.getTime() > deadline ? "Breached" : "Within SLA";
}
