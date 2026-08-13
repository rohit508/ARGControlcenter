const COLORS: Record<string, string> = {
  Green: "bg-success-100 text-success-500",
  Amber: "bg-warning-100 text-warning-500",
  Red: "bg-danger-100 text-danger-500",
};

export default function HealthBadge({ value }: { value: string }) {
  return <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${COLORS[value] || "bg-slate-100 text-slate-500"}`}>{value}</span>;
}
