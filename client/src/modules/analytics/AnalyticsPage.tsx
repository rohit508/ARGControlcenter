import { useQuery } from "@tanstack/react-query";
import { api } from "../../services/apiClient";
import DataTable from "../../components/data-table/DataTable";

interface BudgetForecast {
  projectCode: string;
  name: string;
  budget: number;
  projectedFinalCost: number;
  projectedOverrun: number;
  overrunRisk: string;
}
interface ScheduleForecast {
  projectCode: string;
  name: string;
  spi: number;
  forecastFinishDate?: string;
  slipDays?: number;
  forecast?: string;
}
interface Alert {
  severity: string;
  message: string;
}

const RISK_COLOR: Record<string, string> = { High: "text-danger-500", Medium: "text-warning-500", Low: "text-success-500" };

export default function AnalyticsPage() {
  const budget = useQuery({ queryKey: ["analytics", "budget-forecast"], queryFn: () => api.get<{ data: BudgetForecast[] }>("/analytics/budget-forecast") });
  const schedule = useQuery({ queryKey: ["analytics", "schedule-forecast"], queryFn: () => api.get<{ data: ScheduleForecast[] }>("/analytics/schedule-forecast") });
  const alerts = useQuery({ queryKey: ["analytics", "smart-alerts"], queryFn: () => api.get<{ data: Alert[] }>("/analytics/smart-alerts") });

  if (budget.isLoading || schedule.isLoading || alerts.isLoading) return <div className="text-slate-400">Loading analytics…</div>;

  return (
    <div>
      <h1 className="text-xl font-semibold mb-1">Executive Analytics</h1>
      <p className="text-sm text-slate-400 mb-4">
        These are deterministic statistics — linear trend projection (standard EVM technique) and rule-based threshold alerts — not a trained ML model. Labeled honestly rather than oversold.
      </p>

      <h2 className="text-sm font-semibold mb-2">Smart Alerts ({alerts.data!.data.length})</h2>
      <div className="space-y-1 mb-6">
        {alerts.data!.data.map((a, i) => (
          <div key={i} className="text-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-md px-3 py-2">
            <span className={`font-semibold mr-2 ${RISK_COLOR[a.severity]}`}>{a.severity}</span>
            {a.message}
          </div>
        ))}
      </div>

      <h2 className="text-sm font-semibold mb-2">Budget Forecast</h2>
      <div className="mb-6">
        <DataTable
          keyField="projectCode"
          rows={budget.data!.data}
          columns={[
            { key: "name", header: "Project" },
            { key: "budget", header: "Budget", render: (r) => r.budget.toLocaleString() },
            { key: "projectedFinalCost", header: "Projected Final Cost", render: (r) => r.projectedFinalCost.toLocaleString() },
            { key: "projectedOverrun", header: "Projected Overrun", render: (r) => r.projectedOverrun.toLocaleString() },
            { key: "overrunRisk", header: "Risk", render: (r) => <span className={`font-semibold ${RISK_COLOR[r.overrunRisk]}`}>{r.overrunRisk}</span> },
          ]}
        />
      </div>

      <h2 className="text-sm font-semibold mb-2">Schedule Forecast</h2>
      <DataTable
        keyField="projectCode"
        rows={schedule.data!.data}
        columns={[
          { key: "name", header: "Project" },
          { key: "spi", header: "SPI", render: (r) => (r.spi != null ? r.spi.toFixed(2) : "—") },
          { key: "forecastFinishDate", header: "Forecast Finish", render: (r) => r.forecastFinishDate || r.forecast || "—" },
          { key: "slipDays", header: "Slip (days)", render: (r) => (r.slipDays != null ? r.slipDays : "—") },
        ]}
      />
    </div>
  );
}
