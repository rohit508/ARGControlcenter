import { describe, it, expect } from "vitest";
import { computeSlaStatus } from "./sla.logic";

describe("computeSlaStatus", () => {
  const created = new Date("2026-08-01T00:00:00Z");

  it("is Within SLA when open and well before the deadline", () => {
    const now = new Date("2026-08-01T02:00:00Z"); // 2 hours in, 24h SLA
    expect(computeSlaStatus({ createdAt: created, slaHours: 24, status: "Open", resolvedAt: null }, now)).toBe("Within SLA");
  });

  it("is Breached when still open past the deadline", () => {
    const now = new Date("2026-08-02T01:00:00Z"); // 25 hours in, 24h SLA
    expect(computeSlaStatus({ createdAt: created, slaHours: 24, status: "Open", resolvedAt: null }, now)).toBe("Breached");
  });

  it("is exactly on the boundary — not yet breached at precisely the deadline", () => {
    const now = new Date("2026-08-02T00:00:00Z"); // exactly 24h later
    expect(computeSlaStatus({ createdAt: created, slaHours: 24, status: "Open", resolvedAt: null }, now)).toBe("Within SLA");
  });

  it("is Met when resolved before the deadline", () => {
    const resolvedAt = new Date("2026-08-01T10:00:00Z"); // resolved at 10h, 24h SLA
    const now = new Date("2026-08-05T00:00:00Z"); // "now" is irrelevant once resolved
    expect(computeSlaStatus({ createdAt: created, slaHours: 24, status: "Resolved", resolvedAt }, now)).toBe("Met");
  });

  it("is Breached (not Met) when resolved AFTER the deadline had already passed", () => {
    const resolvedAt = new Date("2026-08-03T00:00:00Z"); // resolved 48h later, 24h SLA
    expect(computeSlaStatus({ createdAt: created, slaHours: 24, status: "Resolved", resolvedAt }, new Date())).toBe("Breached");
  });

  it("treats Closed the same as Resolved for SLA purposes", () => {
    const resolvedAt = new Date("2026-08-01T10:00:00Z");
    expect(computeSlaStatus({ createdAt: created, slaHours: 24, status: "Closed", resolvedAt }, new Date())).toBe("Met");
  });
});
