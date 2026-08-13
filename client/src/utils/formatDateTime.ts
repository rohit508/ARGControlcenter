// Renders "13 Aug 2026, 10:30 AM" — used anywhere a Start/Completed timestamp needs to read
// clearly, rather than relying on toLocaleString()'s locale-dependent default format.
export function formatDateTime(value: string | Date | null | undefined): string {
  if (!value) return "—";
  const d = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(d.getTime())) return "—";
  const datePart = d.toLocaleDateString("en-US", { day: "2-digit", month: "short", year: "numeric" });
  const timePart = d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });
  return `${datePart}, ${timePart}`;
}

// Renders a task's due date + optional due time, e.g. "2026-08-13" -> "2026-08-13" (no time set)
// or "2026-08-13" + "14:00" -> "2026-08-13, 2:00 PM". Due date stays in its stored yyyy-mm-dd
// form (matches how it's shown elsewhere in the app); only the time, when present, is formatted.
export function formatDueDateTime(dueDate: string | null | undefined, dueTime: string | null | undefined): string {
  if (!dueDate) return "—";
  if (!dueTime) return dueDate;
  const [h, m] = dueTime.split(":").map(Number);
  const timePart = new Date(2000, 0, 1, h, m).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });
  return `${dueDate}, ${timePart}`;
}
