interface Props {
  label: string;
  value: string | number;
  tone?: "brand" | "success" | "warning" | "danger";
  onClick?: () => void;
}

const TONES: Record<string, string> = {
  brand: "bg-brand-600",
  success: "bg-success-500",
  warning: "bg-warning-500",
  danger: "bg-danger-500",
};

export default function KpiCard({ label, value, tone = "brand", onClick }: Props) {
  const classes = `${TONES[tone]} rounded-xl p-4 text-white shadow-sm ${onClick ? "cursor-pointer hover:opacity-90" : ""}`;
  return (
    <div onClick={onClick} className={classes} role={onClick ? "button" : undefined} tabIndex={onClick ? 0 : undefined}>
      <div className="text-xs font-semibold uppercase tracking-wide opacity-80">{label}</div>
      <div className="text-2xl font-bold mt-1">{value}</div>
    </div>
  );
}
