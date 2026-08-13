const STATUS_COLOR: Record<string, string> = {
  Pending: "bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-200",
  "In Progress": "bg-brand-100 text-brand-600",
  Completed: "bg-success-100 text-success-500",
  "Not Done": "bg-danger-100 text-danger-500",
  "Completed After Due Date": "bg-orange-100 text-orange-600",
};

const PRIORITY_COLOR: Record<string, string> = {
  Critical: "bg-danger-100 text-danger-500",
  High: "bg-warning-100 text-warning-500",
  Medium: "bg-brand-100 text-brand-600",
  Low: "bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-200",
};

export function StatusBadge({ status }: { status: string }) {
  return <span className={`px-2 py-0.5 rounded-full text-xs font-semibold whitespace-nowrap ${STATUS_COLOR[status] || "bg-slate-200 text-slate-600"}`}>{status}</span>;
}

export function PriorityBadge({ priority }: { priority: string }) {
  return <span className={`px-2 py-0.5 rounded-full text-xs font-semibold whitespace-nowrap ${PRIORITY_COLOR[priority] || "bg-slate-200 text-slate-600"}`}>{priority}</span>;
}
