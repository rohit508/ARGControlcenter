interface Props {
  label: string;
  value: string | number;
  icon: string;
  accent: "indigo" | "emerald" | "slate" | "rose" | "amber" | "cyan" | "violet";
  onClick?: () => void;
}

// Distinct from the shared KpiCard (flat solid tiles used elsewhere, e.g. Task Analytics) —
// this gives the Executive Dashboard its own visual identity: soft gradient surface, a colored
// icon badge, and a matching left accent bar instead of a fully-painted block.
const ACCENTS: Record<Props["accent"], { bar: string; badgeBg: string; badgeText: string; ring: string }> = {
  indigo: { bar: "bg-indigo-500", badgeBg: "bg-indigo-100 dark:bg-indigo-500/15", badgeText: "text-indigo-600 dark:text-indigo-300", ring: "hover:ring-indigo-200 dark:hover:ring-indigo-500/30" },
  emerald: { bar: "bg-emerald-500", badgeBg: "bg-emerald-100 dark:bg-emerald-500/15", badgeText: "text-emerald-600 dark:text-emerald-300", ring: "hover:ring-emerald-200 dark:hover:ring-emerald-500/30" },
  slate: { bar: "bg-slate-500", badgeBg: "bg-slate-100 dark:bg-slate-500/15", badgeText: "text-slate-600 dark:text-slate-300", ring: "hover:ring-slate-200 dark:hover:ring-slate-500/30" },
  rose: { bar: "bg-rose-500", badgeBg: "bg-rose-100 dark:bg-rose-500/15", badgeText: "text-rose-600 dark:text-rose-300", ring: "hover:ring-rose-200 dark:hover:ring-rose-500/30" },
  amber: { bar: "bg-amber-500", badgeBg: "bg-amber-100 dark:bg-amber-500/15", badgeText: "text-amber-600 dark:text-amber-300", ring: "hover:ring-amber-200 dark:hover:ring-amber-500/30" },
  cyan: { bar: "bg-cyan-500", badgeBg: "bg-cyan-100 dark:bg-cyan-500/15", badgeText: "text-cyan-600 dark:text-cyan-300", ring: "hover:ring-cyan-200 dark:hover:ring-cyan-500/30" },
  violet: { bar: "bg-violet-500", badgeBg: "bg-violet-100 dark:bg-violet-500/15", badgeText: "text-violet-600 dark:text-violet-300", ring: "hover:ring-violet-200 dark:hover:ring-violet-500/30" },
};

export default function StatTile({ label, value, icon, accent, onClick }: Props) {
  const a = ACCENTS[accent];
  return (
    <div
      onClick={onClick}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      className={`group relative overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-sm ring-1 ring-transparent transition-all duration-150 ${
        onClick ? `cursor-pointer hover:-translate-y-0.5 hover:shadow-md ${a.ring}` : ""
      }`}
    >
      <span className={`absolute inset-y-0 left-0 w-1 ${a.bar}`} aria-hidden />
      <div className="flex items-start justify-between gap-2 pl-2">
        <div className="min-w-0">
          <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500 truncate">
            {label}
          </div>
          <div className="text-2xl font-bold mt-1 text-slate-800 dark:text-slate-50 tabular-nums">{value}</div>
        </div>
        <div className={`shrink-0 w-9 h-9 rounded-xl flex items-center justify-center text-base ${a.badgeBg} ${a.badgeText}`} aria-hidden>
          {icon}
        </div>
      </div>
    </div>
  );
}
