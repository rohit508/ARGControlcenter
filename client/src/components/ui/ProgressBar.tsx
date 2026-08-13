export default function ProgressBar({ pct }: { pct: number }) {
  const clamped = Math.max(0, Math.min(100, pct));
  const color = clamped >= 100 ? "bg-success-500" : clamped >= 50 ? "bg-brand-500" : "bg-warning-500";
  return (
    <div className="flex items-center gap-2 min-w-[100px]">
      <div className="flex-1 h-2 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${clamped}%` }} />
      </div>
      <span className="text-xs text-slate-500 tabular-nums w-9 text-right">{Math.round(clamped)}%</span>
    </div>
  );
}
