import {
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { ReactNode } from "react";

const attendance = [
  { name: "Present", value: 1056, color: "#159C94" },
  { name: "Absent", value: 74, color: "#EF5C57" },
  { name: "Late", value: 32, color: "#F5A524" },
  { name: "On leave", value: 86, color: "#94A3B8" },
];
const trend = [
  { day: "Mon", value: 962 },
  { day: "Tue", value: 1057 },
  { day: "Wed", value: 995 },
  { day: "Thu", value: 1083 },
  { day: "Fri", value: 1038 },
  { day: "Sat", value: 414 },
  { day: "Sun", value: 238 },
];
const liveAttendance = [
  ["AM", "Arjun Mehta", "Engineering", "08:48 AM", "Present"],
  ["PS", "Priya Sharma", "Finance", "09:02 AM", "Present"],
  ["RV", "Rohan Verma", "Marketing", "09:18 AM", "Late"],
  ["NK", "Neha Kapoor", "HR", "—", "Absent"],
  ["VS", "Vivek Singh", "Operations", "—", "On Leave"],
];
const departments = [
  ["Engineering", 92],
  ["Finance", 89],
  ["Marketing", 85],
  ["HR", 88],
  ["Operations", 84],
  ["Admin", 90],
];

function Icon({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={`inline-flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl text-2xl ${className}`}
    >
      {children}
    </span>
  );
}
function Status({ value }: { value: string }) {
  const styles: Record<string, string> = {
    Present: "bg-emerald-50 text-emerald-700",
    Late: "bg-amber-50 text-amber-700",
    Absent: "bg-rose-50 text-rose-700",
    "On Leave": "bg-slate-100 text-slate-600",
    Pending: "bg-amber-50 text-amber-700",
    Approved: "bg-emerald-50 text-emerald-700",
  };
  return (
    <span
      className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${styles[value] ?? "bg-slate-100 text-slate-600"}`}
    >
      {value}
    </span>
  );
}
function Card({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`rounded-2xl border border-slate-200/90 bg-white p-5 shadow-[0_4px_18px_rgba(15,23,42,.055)] transition-shadow duration-200 hover:shadow-[0_10px_25px_rgba(15,23,42,.075)] ${className}`}
    >
      {children}
    </section>
  );
}

export default function HrDashboardPage() {
  return (
    <div className="mx-auto max-w-[1540px] space-y-5 pb-8 text-slate-800">
      <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
        <div>
          <p className="text-xs font-bold uppercase tracking-[.16em] text-teal-600">
            People operations
          </p>
          <h1 className="mt-1 text-[32px] font-bold tracking-tight text-slate-900">
            HR Dashboard
          </h1>
          <p className="mt-1.5 text-[15px] text-slate-500">
            Overview of your workforce, attendance and people operations.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            aria-label="Choose reporting period"
            className="group inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-[0_2px_6px_rgba(15,23,42,.04)] transition-all duration-200 hover:-translate-y-px hover:border-teal-200 hover:bg-teal-50/40 hover:text-teal-700 hover:shadow-[0_8px_18px_rgba(15,118,110,.12)] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-teal-500/15 focus-visible:border-teal-500 active:translate-y-0 active:scale-[.98]"
          >
            <span className="grid h-5 w-5 place-items-center rounded-md bg-slate-100 text-[11px] text-slate-500 transition-colors group-hover:bg-teal-100 group-hover:text-teal-700">
              ▣
            </span>
            <span>This month</span>
            <span className="text-xs text-slate-400 transition-transform group-hover:translate-y-px">
              ⌄
            </span>
          </button>
          <button
            type="button"
            aria-label="Choose campus or department"
            className="group inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-[0_2px_6px_rgba(15,23,42,.04)] transition-all duration-200 hover:-translate-y-px hover:border-teal-200 hover:bg-teal-50/40 hover:text-teal-700 hover:shadow-[0_8px_18px_rgba(15,118,110,.12)] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-teal-500/15 focus-visible:border-teal-500 active:translate-y-0 active:scale-[.98]"
          >
            <span className="grid h-5 w-5 place-items-center rounded-md bg-slate-100 text-[11px] text-slate-500 transition-colors group-hover:bg-teal-100 group-hover:text-teal-700">
              ⌂
            </span>
            <span>All campuses / departments</span>
            <span className="text-xs text-slate-400 transition-transform group-hover:translate-y-px">
              ⌄
            </span>
          </button>
          <button
            type="button"
            aria-label="Export HR report"
            className="group inline-flex items-center gap-2 rounded-xl border border-teal-600 bg-teal-600 px-4 py-2.5 text-sm font-semibold text-white shadow-[0_5px_14px_rgba(13,148,136,.22)] transition-all duration-200 hover:-translate-y-px hover:bg-teal-700 hover:shadow-[0_9px_20px_rgba(13,148,136,.28)] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-teal-500/25 focus-visible:ring-offset-2 active:translate-y-0 active:scale-[.98]"
          >
            <span className="text-base leading-none transition-transform group-hover:translate-y-0.5">
              ⇩
            </span>
            <span>Export</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Metric
          icon="♟"
          iconClass="bg-blue-50 text-blue-600"
          label="Total employees"
          value="1,248"
          note="—  vs last month"
        />
        <Metric
          icon="✓"
          iconClass="bg-emerald-50 text-emerald-600"
          label="Present today"
          value="1,056"
          note="↑  4.2% vs yesterday"
          accent="text-emerald-600"
        />
        <Metric
          icon="♙"
          iconClass="bg-rose-50 text-rose-500"
          label="Absent today"
          value="74"
          note="↓  8.6% vs yesterday"
          accent="text-rose-500"
        />
        <Metric
          icon="◷"
          iconClass="bg-amber-50 text-amber-500"
          label="Late arrivals"
          value="32"
          note="↓  3.1% vs yesterday"
          accent="text-amber-500"
        />
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-12">
        <Card className="xl:col-span-4">
          <Header title="Today's attendance" />
          <div className="flex flex-col items-center gap-2 pt-1 lg:flex-row">
            <div
              className="relative shrink-0"
              style={{ width: 185, height: 185 }}
            >
              <PieChart width={185} height={185}>
                <Pie
                  data={attendance}
                  dataKey="value"
                  cx={92.5}
                  cy={92.5}
                  innerRadius={56}
                  outerRadius={80}
                  paddingAngle={2}
                  stroke="none"
                >
                  {attendance.map((entry) => (
                    <Cell key={entry.name} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <strong className="text-2xl">1,248</strong>
                <span className="text-xs text-slate-500">Total</span>
              </div>
            </div>
            <div className="min-w-0 flex-1 space-y-2">
              {attendance.map((row) => (
                <div className="flex items-center gap-2 text-xs" key={row.name}>
                  <span className="flex items-center gap-2 whitespace-nowrap text-slate-600">
                    <i
                      className="h-2.5 w-2.5 shrink-0 rounded-full"
                      style={{ background: row.color }}
                    />
                    {row.name}
                  </span>
                  <b className="whitespace-nowrap">
                    {Math.round(row.value / 12.48)}%{" "}
                    <span className="font-normal text-slate-500">
                      ({row.value.toLocaleString()})
                    </span>
                  </b>
                </div>
              ))}
            </div>
          </div>
          <p className="mt-2 border-t border-slate-100 pt-3 text-xs text-slate-500">
            ▣ &nbsp;Data as of today, 10:00 AM
          </p>
        </Card>
        <Card className="xl:col-span-4">
          <Header title="Attendance trend" right="This week  ⌄" />
          <div className="h-[235px] pt-3">
            <ResponsiveContainer>
              <LineChart
                data={trend}
                margin={{ top: 5, right: 10, left: -16, bottom: 0 }}
              >
                <XAxis
                  dataKey="day"
                  tick={{ fontSize: 11, fill: "#64748B" }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: "#64748B" }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip />
                <Line
                  type="monotone"
                  dataKey="value"
                  stroke="#159C94"
                  strokeWidth={2.5}
                  dot={{ fill: "#159C94", r: 4 }}
                  activeDot={{ r: 5 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <i className="h-2 w-5 rounded-full bg-teal-600" />
            Present employees
          </div>
        </Card>
        <Card className="xl:col-span-4">
          <Header title="Live attendance" action="View all" />
          <div className="mt-2 overflow-x-auto">
            <table className="w-full min-w-[420px] text-left text-xs">
              <thead className="border-b border-slate-100 text-slate-500">
                <tr>
                  <th className="pb-2 font-medium">Employee</th>
                  <th className="pb-2 font-medium">Department</th>
                  <th className="pb-2 font-medium">Check-in</th>
                  <th className="pb-2 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {liveAttendance.map(
                  ([initials, name, dept, checkIn, status]) => (
                    <tr
                      key={name}
                      className="border-b border-slate-50 last:border-0"
                    >
                      <td className="py-2">
                        <span className="flex items-center gap-2">
                          <b className="grid h-7 w-7 place-items-center rounded-full bg-slate-100 text-[10px] text-slate-600">
                            {initials}
                          </b>
                          <strong className="font-medium">{name}</strong>
                        </span>
                      </td>
                      <td className="py-2 text-slate-600">{dept}</td>
                      <td className="py-2">{checkIn}</td>
                      <td className="py-2">
                        <Status value={status} />
                      </td>
                    </tr>
                  ),
                )}
              </tbody>
            </table>
          </div>
          <button className="mt-3 text-xs font-semibold text-blue-600">
            View full live attendance&nbsp; ›
          </button>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-12">
        <Card className="xl:col-span-4">
          <Header title="Department attendance" right="This month  ⌄" />{" "}
          <div className="mt-4 space-y-2.5">
            {departments.map(([name, value]) => (
              <div
                className="grid grid-cols-[95px_1fr_32px] items-center gap-2 text-xs"
                key={String(name)}
              >
                <span className="text-slate-600">{name}</span>
                <div className="h-2 rounded-full bg-slate-100">
                  <div
                    className="h-2 rounded-full bg-teal-600"
                    style={{ width: `${value}%` }}
                  />
                </div>
                <b className="text-right">{value}%</b>
              </div>
            ))}
          </div>
          <div className="mt-3 flex justify-between pl-[95px] text-[10px] text-slate-500">
            <span>0%</span>
            <span>25%</span>
            <span>50%</span>
            <span>75%</span>
            <span>100%</span>
          </div>
        </Card>
        <Card className="xl:col-span-4">
          <Header title="Leave requests" action="View all" />
          <div className="mt-3 grid grid-cols-3 gap-2">
            <MiniStat
              label="Pending"
              value="18"
              className="bg-amber-50 text-amber-800"
            />
            <MiniStat
              label="Approved"
              value="42"
              className="bg-emerald-50 text-emerald-800"
            />
            <MiniStat
              label="Rejected"
              value="6"
              className="bg-rose-50 text-rose-800"
            />
          </div>
          <div className="mt-3 space-y-2.5 text-xs">
            {[
              ["Ananya Iyer", "Marketing", "May 20 – May 22", "Pending"],
              ["Karan Patel", "Engineering", "May 19 – May 23", "Pending"],
              ["Sneha Reddy", "Finance", "May 16", "Approved"],
            ].map(([name, dept, dates, status]) => (
              <div
                className="grid grid-cols-[1.2fr_1fr_1.2fr_auto] items-center gap-2"
                key={name}
              >
                <span className="font-medium">{name}</span>
                <span className="text-slate-500">{dept}</span>
                <span className="text-slate-500">{dates}</span>
                <Status value={status} />
              </div>
            ))}
          </div>
          <button className="mt-4 text-xs font-semibold text-blue-600">
            Manage leave requests&nbsp; ›
          </button>
        </Card>
        <Card className="xl:col-span-4">
          <Header title="Alerts & exceptions" />{" "}
          <div className="mt-2 divide-y divide-slate-100">
            {[
              [
                "▣",
                "Missing punches",
                "Employees with incomplete punches today",
                "23",
                "text-rose-500 bg-rose-50",
              ],
              [
                "♙",
                "Unapproved leave",
                "Leave taken without approval",
                "7",
                "text-amber-500 bg-amber-50",
              ],
              [
                "◷",
                "Overtime risk",
                "Employees at risk of overtime this week",
                "14",
                "text-teal-600 bg-teal-50",
              ],
            ].map(([icon, title, desc, count, tone]) => (
              <div className="flex items-center gap-3 py-3" key={title}>
                <span
                  className={`grid h-9 w-9 place-items-center rounded-xl ${tone}`}
                >
                  {icon}
                </span>
                <span className="min-w-0 flex-1">
                  <b className="block text-sm">{title}</b>
                  <small className="text-xs text-slate-500">{desc}</small>
                </span>
                <strong className="text-xl text-slate-700">{count}</strong>
                <span className="text-slate-400">›</span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-3 xl:grid-cols-3">
        <Card>
          <Header title="Payroll readiness" right="This month  ⌄" />
          <div className="mt-3 flex items-center gap-5">
            <div className="relative h-24 w-24">
              <div className="grid h-24 w-24 place-items-center rounded-full border-[10px] border-slate-100 border-r-teal-600 border-t-teal-600">
                <b className="text-xl">72%</b>
              </div>
            </div>
            <div className="flex-1 space-y-2 text-sm">
              <p className="flex justify-between border-b pb-1.5">
                <span className="text-slate-500">Total employees</span>
                <b>1,248</b>
              </p>
              <p className="flex justify-between border-b pb-1.5">
                <span className="text-slate-500">Processed</span>
                <b className="text-emerald-600">898</b>
              </p>
              <p className="flex justify-between">
                <span className="text-slate-500">Pending</span>
                <b className="text-rose-500">350</b>
              </p>
            </div>
          </div>
          <button className="mt-3 text-xs font-semibold text-blue-600">
            View payroll readiness&nbsp; ›
          </button>
        </Card>
        <Card>
          <Header title="Upcoming holidays" right="May 2025  ‹  ›" />
          <div className="mt-4 grid grid-cols-[1fr_1.15fr] gap-3">
            <div className="grid grid-cols-7 gap-1 text-center text-[10px] text-slate-500">
              {[
                "S",
                "M",
                "T",
                "W",
                "T",
                "F",
                "S",
                "27",
                "28",
                "29",
                "30",
                "1",
                "2",
                "3",
                "4",
                "5",
                "6",
                "7",
                "8",
                "9",
                "10",
                "11",
                "12",
                "13",
                "14",
                "15",
                "16",
                "17",
                "18",
                "19",
                "20",
                "21",
                "22",
                "23",
                "24",
                "25",
                "26",
                "27",
                "28",
                "29",
                "30",
                "31",
              ].map((d, i) => (
                <span
                  key={`${d}${i}`}
                  className={
                    d === "26"
                      ? "rounded-full bg-teal-600 py-1 text-white"
                      : "py-1"
                  }
                >
                  {d}
                </span>
              ))}
            </div>
            <div className="self-center border-l border-slate-100 pl-3">
              <p className="text-sm font-semibold">May 26, 2025</p>
              <p className="mt-1 text-sm text-teal-600">Memorial Day</p>
            </div>
          </div>
          <button className="mt-3 text-xs font-semibold text-blue-600">
            View holiday calendar&nbsp; ›
          </button>
        </Card>
        <Card>
          <Header title="Top absence departments" right="This month  ⌄" />
          <div className="mt-4 space-y-4">
            {[
              ["Operations", "9.2%", 78],
              ["Marketing", "7.8%", 68],
              ["Admin", "6.5%", 57],
            ].map(([name, amount, pct], i) => (
              <div
                className="grid grid-cols-[24px_1fr_1.5fr_40px] items-center gap-2 text-sm"
                key={String(name)}
              >
                <span className="grid h-6 w-6 place-items-center rounded-md bg-rose-50 text-xs font-bold text-rose-500">
                  {i + 1}
                </span>
                <span>{name}</span>
                <div className="h-2 rounded-full bg-slate-100">
                  <div
                    className="h-2 rounded-full bg-rose-500"
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <b className="text-right text-xs">{amount}</b>
              </div>
            ))}
          </div>
          <button className="mt-7 text-xs font-semibold text-blue-600">
            View absence report&nbsp; ›
          </button>
        </Card>
      </div>
    </div>
  );
}

function Header({
  title,
  right,
  action,
}: {
  title: string;
  right?: string;
  action?: string;
}) {
  return (
    <div className="flex items-center justify-between gap-2">
      <h2 className="text-[15px] font-bold text-slate-800">{title}</h2>
      {right && (
        <button className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs text-slate-600">
          {right}
        </button>
      )}
      {action && (
        <button className="text-sm font-semibold text-blue-600">
          {action}
        </button>
      )}
    </div>
  );
}
function Metric({
  icon,
  iconClass,
  label,
  value,
  note,
  accent = "text-slate-800",
}: {
  icon: string;
  iconClass: string;
  label: string;
  value: string;
  note: string;
  accent?: string;
}) {
  return (
    <Card className="flex min-h-[122px] items-center gap-4">
      <Icon className={iconClass}>{icon}</Icon>
      <div>
        <p className="text-[15px] text-slate-600">{label}</p>
        <p className={`mt-1 text-[30px] font-bold leading-none ${accent}`}>
          {value}
        </p>
        <p className={`mt-2 text-xs ${accent}`}>{note}</p>
      </div>
    </Card>
  );
}
function MiniStat({
  label,
  value,
  className,
}: {
  label: string;
  value: string;
  className: string;
}) {
  return (
    <div className={`rounded-lg p-2.5 ${className}`}>
      <p className="text-[10px]">{label}</p>
      <p className="mt-1 text-lg font-bold">{value}</p>
    </div>
  );
}
