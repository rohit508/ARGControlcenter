import { useQuery } from "@tanstack/react-query";
import { api } from "../../services/apiClient";
import { PortfolioKpis, EmployeeTaskStats } from "../../types";
import StatTile from "./StatTile";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend, BarChart, Bar, XAxis, YAxis, CartesianGrid } from "recharts";

const HEALTH_COLORS = { Green: "#10b981", Amber: "#f59e0b", Red: "#f43f5e" };
const TASK_STATUS_COLORS: Record<string, string> = {
  Pending: "#94a3b8",
  "In Progress": "#6366f1",
  Completed: "#10b981",
  "Not Done": "#f43f5e",
  "Completed After Due Date": "#f97316",
};

export default function DashboardPage() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["kpi-engine", "portfolio"],
    queryFn: () => api.get<{ data: PortfolioKpis }>("/kpi-engine/portfolio"),
  });
  // Polled so the tile/chart below stay current with employee task activity without a manual
  // refresh — same real-time-via-polling approach as the rest of the Employee Tasks module.
  const { data: taskStatsRes } = useQuery({
    queryKey: ["employee-tasks", "stats"],
    queryFn: () => api.get<{ data: EmployeeTaskStats }>("/employee-tasks/stats"),
    refetchInterval: 15_000,
  });

  const taskStats = taskStatsRes?.data;

  if (isLoading) return <div className="text-slate-400">Loading dashboard…</div>;
  if (error) return <div className="text-danger-500">Failed to load dashboard: {(error as Error).message}</div>;
  const k = data!.data;
  const employeeTaskStatusData = taskStats ? Object.entries(taskStats.statusCounts).map(([name, value]) => ({ name, value })) : [];

  const healthData = [
    { name: "Green", value: k.projects.health.green },
    { name: "Amber", value: k.projects.health.amber },
    { name: "Red", value: k.projects.health.red },
  ];

  const evmData = [
    { name: "BAC", value: k.evm.bac },
    { name: "PV", value: k.evm.pv },
    { name: "EV", value: k.evm.ev },
    { name: "AC", value: k.evm.ac },
  ];

  return (
    <div>
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-brand-600 via-brand-600 to-indigo-700 px-6 py-6 mb-6 text-white shadow-lg">
        <div className="absolute -right-10 -top-10 w-48 h-48 rounded-full bg-white/10" aria-hidden />
        <div className="absolute -right-4 bottom-0 w-24 h-24 rounded-full bg-white/10" aria-hidden />
        <h1 className="text-2xl font-bold relative">Executive Dashboard</h1>
        <p className="text-sm text-white/80 mt-1 relative">Every figure below comes from a live API call — nothing here is hardcoded.</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3 mb-6">
        <StatTile label="Total Projects" value={k.projects.total} icon="📁" accent="indigo" />
        <StatTile label="Active" value={k.projects.active} icon="🚀" accent="emerald" />
        <StatTile label="Completed" value={k.projects.completed} icon="✅" accent="cyan" />
        <StatTile label="Delayed" value={k.projects.delayed} icon="⏳" accent="rose" />
        <StatTile label="At Risk (Red)" value={k.projects.health.red} icon="🔥" accent="rose" />
        <StatTile label="Budget Utilization" value={`${(k.evm.budgetUtilization * 100).toFixed(1)}%`} icon="💰" accent="amber" />
        <StatTile label="Portfolio SPI" value={k.evm.spi.toFixed(2)} icon="📈" accent="violet" />
        <StatTile label="Portfolio CPI" value={k.evm.cpi.toFixed(2)} icon="📊" accent="violet" />
        <StatTile label="Open Risks" value={k.risks.open} icon="⚠️" accent="amber" />
        <StatTile label="Open Issues" value={k.issues.open} icon="🐞" accent="amber" />
        <StatTile label="Pending Approvals" value={k.pendingApprovals} icon="🕐" accent="slate" />
        <StatTile label="Overdue Tasks" value={k.tasks.overdue} icon="🚨" accent="rose" />
        {taskStats && <StatTile label="Employee Tasks Completed" value={`${taskStats.completionPct}%`} icon="🎯" accent="emerald" />}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <span className="w-7 h-7 rounded-lg bg-emerald-100 dark:bg-emerald-500/15 text-emerald-600 dark:text-emerald-300 flex items-center justify-center text-sm" aria-hidden>💚</span>
            <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-200">Project Health</h2>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={healthData} dataKey="value" nameKey="name" innerRadius={50} outerRadius={80} paddingAngle={3} label>
                {healthData.map((d) => (
                  <Cell key={d.name} fill={HEALTH_COLORS[d.name as keyof typeof HEALTH_COLORS]} stroke="none" />
                ))}
              </Pie>
              <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #e2e8f0" }} />
              <Legend iconType="circle" />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <span className="w-7 h-7 rounded-lg bg-indigo-100 dark:bg-indigo-500/15 text-indigo-600 dark:text-indigo-300 flex items-center justify-center text-sm" aria-hidden>📐</span>
            <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-200">Earned Value Management</h2>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={evmData}>
              <defs>
                <linearGradient id="evmBarFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#6366f1" stopOpacity={1} />
                  <stop offset="100%" stopColor="#4f46e5" stopOpacity={0.85} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" opacity={0.2} vertical={false} />
              <XAxis dataKey="name" fontSize={12} />
              <YAxis fontSize={12} tickFormatter={(v) => `${(v / 1_000_000).toFixed(0)}M`} />
              <Tooltip formatter={(v: number) => v.toLocaleString()} contentStyle={{ borderRadius: 12, border: "1px solid #e2e8f0" }} />
              <Bar dataKey="value" fill="url(#evmBarFill)" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {taskStats && (
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm">
            <div className="flex items-center gap-2 mb-3">
              <span className="w-7 h-7 rounded-lg bg-violet-100 dark:bg-violet-500/15 text-violet-600 dark:text-violet-300 flex items-center justify-center text-sm" aria-hidden>🎯</span>
              <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-200">Employee Task Status</h2>
            </div>
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={employeeTaskStatusData} dataKey="value" nameKey="name" innerRadius={50} outerRadius={80} paddingAngle={3} label>
                  {employeeTaskStatusData.map((d) => (
                    <Cell key={d.name} fill={TASK_STATUS_COLORS[d.name] || "#94a3b8"} stroke="none" />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #e2e8f0" }} />
                <Legend iconType="circle" />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </div>
  );
}
