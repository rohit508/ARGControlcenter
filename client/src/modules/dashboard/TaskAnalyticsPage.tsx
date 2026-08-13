import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  LineChart,
  Line,
} from "recharts";
import StatTile from "./StatTile";
import { useEmployeeTaskStats } from "../employee-tasks/useEmployeeTasks";
import { useEmployees } from "../employees/useEmployees";
import { useAuthStore } from "../../store/authStore";

const STATUS_PIE_COLORS: Record<string, string> = {
  Pending: "#94a3b8",
  "In Progress": "#f59e0b",
  Completed: "#10b981",
  "Not Done": "#f43f5e",
  "Completed After Due Date": "#f97316",
};

export default function TaskAnalyticsPage() {
  const navigate = useNavigate();
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>("");
  const user = useAuthStore((s) => s.user);
  // The employee filter lets you view someone else's stats — the backend already ignores this
  // param for a plain "User" (see getStats in employee-tasks.service.ts, which forces the
  // caller's own employeeId), so hiding it here just keeps the UI honest about what's possible.
  const canFilterByEmployee = user?.roles.some((r) => r === "Admin" || r === "CEO") ?? false;

  // Only Admin/CEO ever need the full employee list for the filter dropdown.
  const { data: employeesQuery, isLoading: employeesLoading } = useEmployees({}, { enabled: canFilterByEmployee });
  const { data, isLoading, error } = useEmployeeTaskStats(
    canFilterByEmployee && selectedEmployeeId ? Number(selectedEmployeeId) : undefined
  );

  const loading = isLoading || (canFilterByEmployee && employeesLoading);
  if (loading) return <div className="text-slate-400">Loading…</div>;
  if (error)
    return (
      <div className="text-danger-500">
        Failed to load task analytics: {(error as Error).message}
      </div>
    );

  const stats = data!.data;
  const statusData = Object.entries(stats.statusCounts).map(([name, value]) => ({
    name,
    value,
  }));
  const completionData = stats.employeeCompletion
    .slice(0, 10)
    .map((e) => ({ name: e.employeeName, pct: e.completionPct }));
  const monthlyData = stats.monthlyTrend.map((m) => ({ name: m.month, count: m.count }));
  const weeklyData = stats.weeklyTrend.map((w) => ({ name: w.week, count: w.count }));
  const chartEmpty = stats.totalTasks === 0;

  return (
    <div className="space-y-6 bg-[#F8FAFC] dark:bg-slate-950 min-h-screen px-4 py-6 md:px-8">
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-violet-600 via-violet-600 to-fuchsia-600 px-6 py-6 shadow-lg">
        <div className="absolute -right-8 -top-12 w-44 h-44 rounded-full bg-white/10" aria-hidden />
        <div className="absolute right-16 bottom-0 w-20 h-20 rounded-full bg-white/10" aria-hidden />
        <div className="relative flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white">Task Analytics</h1>
            <p className="mt-1 text-sm text-white/80">
              Fresh insights, now filtered by employee.
            </p>
          </div>

          {canFilterByEmployee && (
            <div>
              <label className="block text-sm font-medium text-white/90 mb-2">
                Employee
              </label>
              <select
                className="min-w-[220px] rounded-2xl border border-white/0 bg-white px-4 py-3 text-sm text-slate-700 shadow-lg transition duration-200 ease-in-out hover:shadow-xl focus:outline-none focus:ring-2 focus:ring-white/60"
                value={selectedEmployeeId}
                onChange={(e) => setSelectedEmployeeId(e.target.value)}
              >
                <option value="">All Employees</option>
                {employeesQuery?.data.map((employee) => (
                  <option key={employee.id} value={employee.id}>
                    {employee.fullName}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-4">
        <StatTile
          label="Total Tasks"
          value={stats.totalTasks}
          icon="📋"
          accent="indigo"
          onClick={() => navigate("/employee-tasks")}
        />
        <StatTile label="Pending" value={stats.statusCounts.Pending} icon="🕐" accent="slate" />
        <StatTile
          label="In Progress"
          value={stats.statusCounts["In Progress"]}
          icon="⚙️"
          accent="amber"
        />
        <StatTile label="Completed" value={stats.statusCounts.Completed} icon="✅" accent="emerald" />
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-4">
        <StatTile label="Not Done" value={stats.statusCounts["Not Done"]} icon="⛔" accent="rose" />
        <StatTile
          label="Completed After Due Date"
          value={stats.statusCounts["Completed After Due Date"]}
          icon="⏰"
          accent="amber"
        />
        <StatTile
          label="Completion Rate"
          value={`${stats.completionPct}%`}
          icon="🎯"
          accent="cyan"
        />
        <StatTile label="Overdue" value={stats.overdueCount} icon="🚨" accent="rose" />
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <div className="rounded-2xl bg-white dark:bg-slate-900 p-6 shadow-lg">
          <div className="flex items-center gap-2 mb-4">
            <span className="w-8 h-8 rounded-lg bg-violet-100 dark:bg-violet-500/15 text-violet-600 dark:text-violet-300 flex items-center justify-center text-sm" aria-hidden>🍩</span>
            <div>
              <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">Status Breakdown</h2>
              <p className="text-sm text-slate-500 dark:text-slate-400">Current task distribution.</p>
            </div>
          </div>
          {chartEmpty ? (
            <div className="flex h-64 items-center justify-center rounded-2xl border border-dashed border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 text-slate-500">
              No task data available for the selected employee.
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={320}>
              <PieChart>
                <Pie
                  data={statusData}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={70}
                  outerRadius={110}
                  paddingAngle={4}
                >
                  {statusData.map((d) => (
                    <Cell key={d.name} stroke="none" fill={STATUS_PIE_COLORS[d.name] ?? "#f43f5e"} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    borderRadius: 16,
                    border: "none",
                    boxShadow: "0 20px 60px rgba(15, 23, 42, 0.08)",
                  }}
                />
                <Legend verticalAlign="bottom" align="center" iconType="circle" />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="rounded-2xl bg-white dark:bg-slate-900 p-6 shadow-lg">
          <div className="flex items-center gap-2 mb-4">
            <span className="w-8 h-8 rounded-lg bg-cyan-100 dark:bg-cyan-500/15 text-cyan-600 dark:text-cyan-300 flex items-center justify-center text-sm" aria-hidden>🏆</span>
            <div>
              <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">Employee Completion</h2>
              <p className="text-sm text-slate-500 dark:text-slate-400">Performance across team members.</p>
            </div>
          </div>
          {chartEmpty ? (
            <div className="flex h-64 items-center justify-center rounded-2xl border border-dashed border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 text-slate-500">
              No task data available for the selected employee.
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={320}>
              <BarChart data={completionData} layout="vertical" margin={{ left: 20 }}>
                <defs>
                  <linearGradient id="completionBarFill" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="#06b6d4" stopOpacity={0.9} />
                    <stop offset="100%" stopColor="#0891b2" stopOpacity={1} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" opacity={0.2} vertical={false} />
                <XAxis type="number" domain={[0, 100]} tickFormatter={(v) => `${v}%`} />
                <YAxis type="category" dataKey="name" width={120} />
                <Tooltip formatter={(v: number) => `${v}%`} />
                <Bar dataKey="pct" fill="url(#completionBarFill)" radius={[0, 8, 8, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <div className="rounded-2xl bg-white dark:bg-slate-900 p-6 shadow-lg">
          <div className="flex items-center gap-2 mb-4">
            <span className="w-8 h-8 rounded-lg bg-indigo-100 dark:bg-indigo-500/15 text-indigo-600 dark:text-indigo-300 flex items-center justify-center text-sm" aria-hidden>📅</span>
            <div>
              <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">Monthly Completion Trend</h2>
              <p className="text-sm text-slate-500 dark:text-slate-400">Monthly completed tasks.</p>
            </div>
          </div>
          {chartEmpty ? (
            <div className="flex h-72 items-center justify-center rounded-2xl border border-dashed border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 text-slate-500">
              No task data available for the selected employee.
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={monthlyData}>
                <defs>
                  <linearGradient id="monthlyLineFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#6366f1" stopOpacity={0.25} />
                    <stop offset="100%" stopColor="#6366f1" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                <XAxis dataKey="name" tick={{ fill: "#64748B" }} />
                <YAxis tick={{ fill: "#64748B" }} allowDecimals={false} />
                <Tooltip />
                <Line
                  type="monotone"
                  dataKey="count"
                  stroke="#6366f1"
                  strokeWidth={3}
                  dot={{ r: 4, strokeWidth: 2, fill: "#fff", stroke: "#6366f1" }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="rounded-2xl bg-white dark:bg-slate-900 p-6 shadow-lg">
          <div className="flex items-center gap-2 mb-4">
            <span className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-500/15 text-emerald-600 dark:text-emerald-300 flex items-center justify-center text-sm" aria-hidden>📆</span>
            <div>
              <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">Weekly Completion Trend</h2>
              <p className="text-sm text-slate-500 dark:text-slate-400">Week-by-week completed tasks.</p>
            </div>
          </div>
          {chartEmpty ? (
            <div className="flex h-72 items-center justify-center rounded-2xl border border-dashed border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 text-slate-500">
              No task data available for the selected employee.
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={weeklyData}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                <XAxis dataKey="name" tick={{ fill: "#64748B" }} />
                <YAxis tick={{ fill: "#64748B" }} allowDecimals={false} />
                <Tooltip />
                <Line
                  type="monotone"
                  dataKey="count"
                  stroke="#10b981"
                  strokeWidth={3}
                  dot={{ r: 4, strokeWidth: 2, fill: "#fff", stroke: "#10b981" }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </div>
  );
}
