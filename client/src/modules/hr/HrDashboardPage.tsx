import { useQuery } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { Cell, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { api } from "../../services/apiClient";
import Dropdown from "../../components/ui/Dropdown";
import Modal from "../../components/ui/Modal";

type AttendanceSlice = { name: string; value: number; color: string };
type LiveAttendance = {
  id: number;
  employeeId: number | null;
  employeeName: string;
  employeeCode: string;
  department: string;
  attendanceTime: string | null;
  attendanceOutTime: string | null;
  status: string;
};
type AttendanceRecord = LiveAttendance & { attendanceDate: string | null };
type Employee = { id: number; employeeName: string; employeeCode: string; department: string; entityId: number | null };
type Leave = { id: number; employeeName: string; leaveType: string; fromDate: string | null; tillDate: string | null; status: string };
type Holiday = { id: number; name: string; startDate: string | null; endDate: string | null; days: number };
type HrDashboard = {
  asOf: string;
  selectedEntityId: number | null;
  entities: { id: number; name: string }[];
  totalEmployees: number;
  employees: Employee[];
  attendance: AttendanceSlice[];
  trend: { day: string; value: number }[];
  liveAttendance: LiveAttendance[];
  attendanceRecords: AttendanceRecord[];
  departments: { name: string; value: number }[];
  leaves: { pending: number; approved: number; rejected: number; recent: Leave[] };
  alerts: { missingPunches: number; unapprovedLeave: number; overtimeRisk: number };
  payroll: { processed: number; pending: number; completion: number };
  upcomingHolidays: Holiday[];
  absenceDepartments: { name: string; value: number; count: number }[];
};

const EMPTY_DASHBOARD: HrDashboard = {
  asOf: new Date().toISOString(), selectedEntityId: null, entities: [], totalEmployees: 0, employees: [], attendance: [], trend: [], liveAttendance: [], attendanceRecords: [], departments: [],
  leaves: { pending: 0, approved: 0, rejected: 0, recent: [] }, alerts: { missingPunches: 0, unapprovedLeave: 0, overtimeRisk: 0 },
  payroll: { processed: 0, pending: 0, completion: 0 }, upcomingHolidays: [], absenceDepartments: [],
};

const initials = (name: string) => name.split(" ").filter(Boolean).slice(0, 2).map((part) => part[0]).join("").toUpperCase() || "?";
const formatDate = (value: string | null) => value ? new Date(`${value}T00:00:00`).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "—";
const formatTime = (value: string | null) => {
  if (!value) return "—";
  const parsed = new Date(value);
  if (!Number.isNaN(parsed.getTime())) return parsed.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  return value.slice(0, 5);
};
const localDateInput = (date = new Date()) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};
const defaultStartDate = () => {
  const date = new Date();
  date.setDate(1);
  return localDateInput(date);
};
const rangeLabel = (startDate: string) => `Since ${formatDate(startDate)}`;

const parseLocalDate = (value: string) => {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day);
};
const displayDateInput = (value: string) => parseLocalDate(value).toLocaleDateString("en-US", { month: "2-digit", day: "2-digit", year: "numeric" });

function StartDatePicker({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const [open, setOpen] = useState(false);
  const [viewMonth, setViewMonth] = useState(() => {
    const date = parseLocalDate(value);
    return new Date(date.getFullYear(), date.getMonth(), 1);
  });
  const containerRef = useRef<HTMLDivElement>(null);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayValue = localDateInput(today);

  useEffect(() => {
    const closeOnOutsideClick = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", closeOnOutsideClick);
    window.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("mousedown", closeOnOutsideClick);
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, []);

  useEffect(() => {
    const date = parseLocalDate(value);
    setViewMonth(new Date(date.getFullYear(), date.getMonth(), 1));
  }, [value]);

  const firstGridDate = new Date(viewMonth.getFullYear(), viewMonth.getMonth(), 1 - viewMonth.getDay());
  const calendarDays = Array.from({ length: 42 }, (_, index) => {
    const date = new Date(firstGridDate);
    date.setDate(firstGridDate.getDate() + index);
    return date;
  });
  const canGoForward = viewMonth.getFullYear() < today.getFullYear() || (viewMonth.getFullYear() === today.getFullYear() && viewMonth.getMonth() < today.getMonth());

  return <div ref={containerRef} className="relative w-[280px]">
    <button type="button" aria-label="Choose attendance start date" aria-haspopup="dialog" aria-expanded={open} onClick={() => setOpen((current) => !current)} className={`group inline-flex h-12 w-full items-center gap-3 rounded-xl border bg-white px-3.5 text-left shadow-[0_2px_6px_rgba(15,23,42,.04)] outline-none transition-all duration-200 hover:-translate-y-px hover:border-teal-400 hover:bg-teal-50/60 hover:shadow-[0_8px_18px_rgba(15,118,110,.12)] hover:ring-4 hover:ring-teal-500/10 focus-visible:ring-4 focus-visible:ring-teal-500/20 active:translate-y-0 active:scale-[.985] ${open ? "border-teal-500 bg-teal-50/60 shadow-[0_8px_18px_rgba(15,118,110,.12)] ring-4 ring-teal-500/10" : "border-slate-200"}`}>
      <span className={`grid h-7 w-7 shrink-0 place-items-center rounded-lg transition-colors ${open ? "bg-teal-100 text-teal-700" : "bg-slate-100 text-slate-500 group-hover:bg-teal-100 group-hover:text-teal-700"}`}><Icon name="calendar" /></span>
      <span className="min-w-0 flex-1"><span className="block text-[10px] font-bold uppercase tracking-[.08em] text-slate-400">Start date</span><span className="mt-0.5 block text-sm font-semibold text-slate-700">{displayDateInput(value)}</span></span>
      <svg className={`h-4 w-4 shrink-0 text-slate-400 transition-transform duration-200 ${open ? "rotate-180 text-teal-600" : ""}`} viewBox="0 0 16 16" fill="none" aria-hidden><path d="m4 6 4 4 4-4" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" /></svg>
    </button>
    {open && <div role="dialog" aria-label="Choose start date" className="absolute left-0 top-full z-50 mt-2 w-[340px] overflow-hidden rounded-xl border border-slate-200 bg-white p-3 shadow-[0_18px_40px_rgba(15,23,42,.16)]">
      <div className="mb-3 flex items-center justify-between px-1"><button type="button" onClick={() => setViewMonth((month) => new Date(month.getFullYear(), month.getMonth() - 1, 1))} className="grid h-8 w-8 place-items-center rounded-lg text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900" aria-label="Previous month"><svg viewBox="0 0 16 16" className="h-4 w-4" fill="none"><path d="m10 3-5 5 5 5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg></button><p className="text-sm font-bold text-slate-900">{viewMonth.toLocaleDateString("en-US", { month: "long", year: "numeric" })}</p><button type="button" disabled={!canGoForward} onClick={() => setViewMonth((month) => new Date(month.getFullYear(), month.getMonth() + 1, 1))} className="grid h-8 w-8 place-items-center rounded-lg text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900 disabled:cursor-not-allowed disabled:text-slate-200" aria-label="Next month"><svg viewBox="0 0 16 16" className="h-4 w-4" fill="none"><path d="m6 3 5 5-5 5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg></button></div>
      <div className="grid grid-cols-7 text-center text-xs">{["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((day) => <span key={day} className="py-2 font-semibold text-slate-600">{day}</span>)}{calendarDays.map((date) => { const dayValue = localDateInput(date); const isSelected = dayValue === value; const isOutsideMonth = date.getMonth() !== viewMonth.getMonth(); const isFuture = date > today; return <button key={dayValue} type="button" disabled={isFuture} onClick={() => { onChange(dayValue); setOpen(false); }} className={`mx-auto grid h-9 w-9 place-items-center rounded-lg font-medium transition-colors ${isSelected ? "bg-blue-600 text-white shadow-sm" : isOutsideMonth ? "text-slate-300" : "text-slate-700 hover:bg-teal-50 hover:text-teal-700"} ${isFuture ? "cursor-not-allowed text-slate-200 hover:bg-transparent hover:text-slate-200" : ""}`}>{date.getDate()}</button>; })}</div>
      <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-3 text-sm font-semibold"><button type="button" onClick={() => { onChange(defaultStartDate()); setOpen(false); }} className="rounded-md px-2 py-1 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-800">Clear</button><button type="button" onClick={() => { onChange(todayValue); setOpen(false); }} className="rounded-md px-2 py-1 text-blue-600 transition-colors hover:bg-blue-50 hover:text-blue-800">Today</button></div>
    </div>}
  </div>;
}

function Icon({ name }: { name: "people" | "present" | "absent" | "clock" | "calendar" | "building" | "download" }) {
  const paths = {
    people: <><circle cx="9" cy="8" r="3"/><circle cx="17" cy="9" r="2.5"/><path d="M3.5 20v-2.2A4.8 4.8 0 0 1 8.3 13h1.4a4.8 4.8 0 0 1 4.8 4.8V20M14 14.2h2.8a3.7 3.7 0 0 1 3.7 3.7V20"/></>,
    present: <><circle cx="12" cy="12" r="9"/><path d="m8 12 2.7 2.7L16.5 9"/></>,
    absent: <><circle cx="10" cy="8" r="3"/><path d="M4 20v-2a5 5 0 0 1 5-5h2M16 15l5 5m0-5-5 5"/></>,
    clock: <><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3.5 2"/></>,
    calendar: <><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M8 3v4m8-4v4M3 10h18"/></>,
    building: <><path d="M4 21V5l8-2v18M12 8h8v13M7 8h2m-2 4h2m-2 4h2m8-5h1m-1 4h1"/></>,
    download: <><path d="M12 3v12m-4-4 4 4 4-4M5 20h14"/></>,
  };
  return <svg viewBox="0 0 24 24" className="h-6 w-6 transition-transform duration-300 ease-out group-hover:scale-105" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>{paths[name]}</svg>;
}

function Status({ value }: { value: string }) {
  const styles: Record<string, string> = {
    Present: "bg-emerald-50 text-emerald-700", Late: "bg-amber-50 text-amber-700", Absent: "bg-rose-50 text-rose-700", "On Leave": "bg-slate-100 text-slate-600",
    Pending: "bg-amber-50 text-amber-700", Approved: "bg-emerald-50 text-emerald-700", Rejected: "bg-rose-50 text-rose-700",
  };
  return <span className={`inline-flex rounded-md px-2.5 py-1 text-[10px] font-semibold ${styles[value] ?? "bg-slate-100 text-slate-600"}`}>{value}</span>;
}

function Card({ children, className = "", onClick }: { children: React.ReactNode; className?: string; onClick?: () => void }) {
  return <section onClick={onClick} onKeyDown={(event) => { if (onClick && (event.key === "Enter" || event.key === " ")) { event.preventDefault(); onClick(); } }} role={onClick ? "button" : undefined} tabIndex={onClick ? 0 : undefined} className={`group rounded-2xl border border-slate-200/90 bg-white p-5 shadow-[0_4px_18px_rgba(15,23,42,.055)] transition-[transform,border-color,box-shadow] duration-300 ease-out hover:-translate-y-1 hover:border-teal-300 hover:shadow-[0_16px_34px_rgba(15,118,110,.16)] ${onClick ? "cursor-pointer focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-teal-500/25" : ""} ${className}`}>{children}</section>;
}

function SectionTitle({ children, aside }: { children: React.ReactNode; aside?: React.ReactNode }) {
  return <div className="flex items-center justify-between gap-3"><h2 className="text-[15px] font-bold text-slate-900">{children}</h2>{aside}</div>;
}

function Metric({ label, value, tone, icon, iconBg, onClick, actionLabel }: { label: string; value: number; tone: string; icon: "people" | "present" | "absent" | "clock"; iconBg: string; onClick?: () => void; actionLabel?: string }) {
  return <Card onClick={onClick} className="flex min-h-[122px] items-center gap-4">
    <div className={`grid h-14 w-14 shrink-0 place-items-center rounded-2xl ${iconBg}`}><Icon name={icon} /></div>
    <div className="min-w-0"><p className="text-sm font-medium text-slate-700">{label}</p><p className={`mt-1 text-[30px] font-bold leading-none ${tone}`}>{value.toLocaleString()}</p>{onClick && <p className="mt-2 text-[11px] font-semibold text-blue-600 group-hover:underline">{actionLabel ?? "View employees"}</p>}</div>
  </Card>;
}

function Empty({ children }: { children: React.ReactNode }) {
  return <div className="grid min-h-[100px] place-items-center rounded-lg border border-dashed border-slate-200 bg-slate-50/60 px-4 text-center text-xs text-slate-500">{children}</div>;
}

function LiveDataLoader() {
  return <div className="absolute inset-0 z-20 grid place-items-center rounded-2xl bg-slate-50/72 p-5 backdrop-blur-[2px]">
    <div className="w-full max-w-sm overflow-hidden rounded-2xl border border-white/80 bg-white/95 p-5 shadow-[0_18px_55px_rgba(15,23,42,.16)]">
      <div className="flex items-center gap-4"><div className="relative grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-[#082650] via-blue-700 to-teal-500 shadow-lg shadow-blue-900/20"><span className="absolute inset-1 rounded-xl border-2 border-white/30 border-t-white animate-spin" /><span className="h-2 w-2 rounded-full bg-white shadow-[0_0_12px_rgba(255,255,255,.9)]" /></div><div><p className="text-sm font-bold tracking-tight text-slate-900">Preparing your HR workspace</p><p className="mt-1 text-xs leading-5 text-slate-500">Securely syncing live employee and attendance data.</p></div></div>
      <div className="mt-5 h-1.5 overflow-hidden rounded-full bg-slate-100"><div className="h-full w-2/3 rounded-full bg-gradient-to-r from-[#082650] via-blue-600 to-teal-400 animate-pulse" /></div>
    </div>
  </div>;
}

export default function HrDashboardPage() {
  const [startDate, setStartDate] = useState(defaultStartDate);
  const [entityId, setEntityId] = useState<number | "all">("all");
  const [isAttendanceModalOpen, setIsAttendanceModalOpen] = useState(false);
  const [isEmployeesModalOpen, setIsEmployeesModalOpen] = useState(false);
  const [employeeSearch, setEmployeeSearch] = useState("");
  const [attendanceView, setAttendanceView] = useState<"Present" | "Absent" | "Late" | null>(null);
  const { data, isLoading, error, refetch, isFetching } = useQuery({
    queryKey: ["edxsv2", "hr-dashboard", startDate, entityId],
    queryFn: () => {
      const params = new URLSearchParams({ startDate });
      params.set("entityId", String(entityId));
      return api.get<{ data: HrDashboard }>(`/edxsv2/hr-dashboard?${params.toString()}`);
    },
    refetchInterval: 60_000,
  });

  const dashboard = data?.data ?? EMPTY_DASHBOARD;
  const isInitialLoad = isLoading && !data;
  const selectedEntityId = typeof entityId === "number" ? entityId : null;
  const attendanceByName = Object.fromEntries(dashboard.attendance.map((item) => [item.name, item.value]));
  const totalRecorded = dashboard.attendance.reduce((sum, item) => sum + item.value, 0);
  const normalizedEmployeeSearch = employeeSearch.trim().toLowerCase();
  const visibleEmployees = normalizedEmployeeSearch
    ? dashboard.employees.filter((employee) => `${employee.employeeName} ${employee.employeeCode} ${employee.department}`.toLowerCase().includes(normalizedEmployeeSearch))
    : dashboard.employees;
  const viewedAttendance = attendanceView ? dashboard.liveAttendance.filter((row) => row.status === attendanceView) : [];

  const exportDashboard = () => {
    const rows = [
      ["Employee", "Code", "Department", "Check-in", "Check-out", "Status"],
      ...dashboard.attendanceRecords.map((row) => [row.employeeName, row.employeeCode, row.department, formatTime(row.attendanceTime), formatTime(row.attendanceOutTime), row.status]),
    ];
    const csv = rows.map((row) => row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(",")).join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `edxsv2-hr-attendance-${dashboard.asOf.slice(0, 10)}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  return <div className="mx-auto max-w-[1540px] space-y-6 pb-10 text-slate-800">
    <header className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
      <div><h1 className="text-[30px] font-bold tracking-tight text-slate-900">HR Dashboard</h1><p className="text-sm text-slate-500">Overview of your workforce and attendance</p></div>
      <div className="flex flex-wrap items-center gap-2">
        <StartDatePicker value={startDate} onChange={setStartDate} />
        {dashboard.entities.length > 0 ? <Dropdown value={entityId === "all" ? "all" : String(selectedEntityId ?? "")} onChange={(value) => setEntityId(value === "all" ? "all" : Number(value))} menuLabel="Organization entity" ariaLabel="Choose organization entity" className="w-[300px]" align="right" icon={<Icon name="building" />} options={[{ value: "all", label: "All branches" }, ...dashboard.entities.map((entity) => ({ value: String(entity.id), label: entity.name }))]} /> : <div className="flex h-12 w-[300px] items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-medium text-slate-400"><Icon name="building" />Loading entities…</div>}
        <button type="button" onClick={exportDashboard} disabled={!data} className="group inline-flex h-12 items-center gap-2 rounded-xl border border-teal-600 bg-teal-600 px-4 text-sm font-semibold text-white shadow-[0_5px_14px_rgba(13,148,136,.22)] transition-all duration-200 hover:-translate-y-px hover:bg-teal-700 hover:shadow-[0_9px_20px_rgba(13,148,136,.28)] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-teal-500/25 focus-visible:ring-offset-2 active:translate-y-0 active:scale-[.98] disabled:cursor-not-allowed disabled:opacity-50"><Icon name="download" /><span>Export</span></button>
        <button type="button" onClick={() => refetch()} disabled={isFetching} className="h-10 rounded-lg bg-[#082650] px-4 text-xs font-semibold text-white disabled:opacity-50">{isFetching ? "Refreshing…" : "Refresh"}</button>
      </div>
    </header>

    {error && <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950"><span>{error instanceof Error ? error.message : "Live HR data could not be loaded."}</span><button type="button" onClick={() => refetch()} className="rounded-lg bg-amber-900 px-3 py-1.5 text-xs font-semibold text-white">Try again</button></div>}

    <div className="relative space-y-6">
    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-4">
      <Metric label="Total Employees" value={dashboard.totalEmployees} tone="text-slate-900" icon="people" iconBg="bg-blue-50 text-blue-600" onClick={() => setIsEmployeesModalOpen(true)} actionLabel="View employees" />
      <Metric label="Present Today" value={attendanceByName.Present ?? 0} tone="text-emerald-600" icon="present" iconBg="bg-emerald-50 text-emerald-600" onClick={() => setAttendanceView("Present")} actionLabel="View present employees" />
      <Metric label="Absent Today" value={attendanceByName.Absent ?? 0} tone="text-rose-500" icon="absent" iconBg="bg-rose-50 text-rose-500" onClick={() => setAttendanceView("Absent")} actionLabel="View absent employees" />
      <Metric label="Late Arrivals" value={attendanceByName.Late ?? 0} tone="text-amber-500" icon="clock" iconBg="bg-amber-50 text-amber-500" onClick={() => setAttendanceView("Late")} actionLabel="View late arrivals" />
    </div>

    <div className="grid grid-cols-1 gap-6 xl:grid-cols-12">
      <Card className="xl:col-span-4">
        <SectionTitle>Today&apos;s Attendance</SectionTitle>
        <div className="mt-2 flex flex-col items-center gap-2 sm:flex-row">
          <div className="relative h-[190px] w-[190px] shrink-0"><PieChart width={190} height={190}><Pie data={dashboard.attendance} dataKey="value" cx={95} cy={95} innerRadius={54} outerRadius={80} stroke="white" strokeWidth={2}>{dashboard.attendance.map((entry) => <Cell key={entry.name} fill={entry.color} />)}</Pie><Tooltip /></PieChart><div className="absolute inset-0 flex flex-col items-center justify-center"><strong className="text-2xl text-slate-900">{totalRecorded}</strong><span className="text-[11px] text-slate-500">Total recorded</span></div></div>
          <div className="w-full min-w-0 flex-1 space-y-3">{dashboard.attendance.map((row) => <div className="flex items-center justify-between gap-3 text-xs" key={row.name}><span className="flex items-center gap-2 text-slate-600"><i className="h-2.5 w-2.5 rounded-full" style={{ background: row.color }} />{row.name}</span><span><b>{row.value.toLocaleString()}</b><small className="ml-1 text-slate-400">{totalRecorded ? `${Math.round(row.value / totalRecorded * 100)}%` : "0%"}</small></span></div>)}</div>
        </div>
        <p className="mt-1 text-[10px] text-slate-400">Data as of {new Date(dashboard.asOf).toLocaleString()}</p>
      </Card>

      <Card className="xl:col-span-4">
        <SectionTitle aside={<span className="rounded-md border border-slate-200 px-2 py-1 text-[10px] text-slate-500">{rangeLabel(startDate)}</span>}>Attendance Trend</SectionTitle>
        <div className="mt-3 h-[230px]"><ResponsiveContainer><LineChart data={dashboard.trend} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}><XAxis dataKey="day" tick={{ fontSize: 10, fill: "#64748B" }} axisLine={false} tickLine={false} /><YAxis allowDecimals={false} tick={{ fontSize: 10, fill: "#64748B" }} axisLine={false} tickLine={false} /><Tooltip /><Line type="monotone" dataKey="value" name="Present employees" stroke="#159C94" strokeWidth={2.5} dot={{ fill: "#159C94", r: 4 }} /></LineChart></ResponsiveContainer></div>
        <div className="flex items-center justify-center gap-2 text-[10px] text-slate-500"><i className="h-0.5 w-6 bg-teal-600" />Present Employees</div>
      </Card>

      <Card className="xl:col-span-4">
        <SectionTitle aside={<span className="flex items-center gap-3"><span className="text-[10px] font-semibold text-slate-500">{dashboard.attendanceRecords.length.toLocaleString()} records</span><button type="button" onClick={() => setIsAttendanceModalOpen(true)} className="text-[11px] font-semibold text-blue-600 transition-colors hover:text-blue-800 hover:underline">View full attendance</button></span>}>Live Attendance</SectionTitle>
        <div className="mt-3 max-h-[245px] overflow-auto"><table className="w-full min-w-[420px] text-left text-[11px]"><thead className="sticky top-0 border-b border-slate-100 bg-white text-slate-500"><tr><th className="pb-2 font-medium">Employee</th><th className="pb-2 font-medium">Department</th><th className="pb-2 font-medium">Check-in</th><th className="pb-2 font-medium">Status</th></tr></thead><tbody>{dashboard.attendanceRecords.slice(0, 4).map((row) => <tr key={`${row.id}-${row.employeeId}-${row.attendanceDate}`} className="border-b border-slate-50 last:border-0"><td className="py-2"><span className="flex items-center gap-2"><b className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-blue-50 text-[9px] text-blue-700">{initials(row.employeeName)}</b><span className="max-w-[110px] truncate font-medium text-slate-800" title={row.employeeName}>{row.employeeName}</span></span></td><td className="max-w-[90px] truncate py-2 text-slate-500" title={row.department}>{row.department}</td><td className="py-2 text-slate-600">{formatTime(row.attendanceTime)}</td><td className="py-2"><Status value={row.status} /></td></tr>)}{dashboard.attendanceRecords.length === 0 && <tr><td colSpan={4} className="py-12 text-center text-slate-500">No attendance records found since {formatDate(startDate)}.</td></tr>}</tbody></table></div>
      </Card>
    </div>

    <div className="grid grid-cols-1 gap-6 xl:grid-cols-12">
      <Card className="xl:col-span-4">
        <SectionTitle>Department Attendance</SectionTitle>
        <div className="mt-4 space-y-3">{dashboard.departments.map((department) => <div className="grid grid-cols-[105px_1fr_38px] items-center gap-3 text-[11px]" key={department.name}><span className="truncate text-slate-600" title={department.name}>{department.name}</span><div className="h-2 rounded-full bg-slate-100"><div className="h-2 rounded-full bg-teal-600" style={{ width: `${department.value}%` }} /></div><b className="text-right">{department.value}%</b></div>)}{dashboard.departments.length === 0 && <Empty>No department attendance exists for today.</Empty>}</div>
      </Card>

      <Card className="xl:col-span-4">
        <SectionTitle>Leave Requests</SectionTitle>
        <div className="mt-3 grid grid-cols-3 gap-2"><MiniStat label="Pending" value={dashboard.leaves.pending} className="bg-amber-50 text-amber-800" /><MiniStat label="Approved" value={dashboard.leaves.approved} className="bg-emerald-50 text-emerald-800" /><MiniStat label="Rejected" value={dashboard.leaves.rejected} className="bg-rose-50 text-rose-800" /></div>
        <div className="mt-3 space-y-2 text-[11px]">{dashboard.leaves.recent.map((leave) => <div className="grid grid-cols-[1fr_.8fr_auto] items-center gap-2 border-b border-slate-50 pb-2" key={leave.id}><span className="truncate font-medium" title={leave.employeeName}>{leave.employeeName}</span><span className="truncate text-slate-500">{formatDate(leave.fromDate)}</span><Status value={leave.status} /></div>)}{dashboard.leaves.recent.length === 0 && <Empty>Client 160 has no leave requests in EDXSv2.</Empty>}</div>
      </Card>

      <Card className="xl:col-span-4">
        <SectionTitle>Alerts &amp; Exceptions</SectionTitle>
        <div className="mt-3 space-y-2"><AlertRow tone="rose" title="Missing Punches" subtitle="Incomplete punches today" value={dashboard.alerts.missingPunches} /><AlertRow tone="amber" title="Unapproved Leave" subtitle="Requests awaiting approval" value={dashboard.alerts.unapprovedLeave} /><AlertRow tone="teal" title="Overtime Risk" subtitle="2+ overtime hours this week" value={dashboard.alerts.overtimeRisk} /></div>
      </Card>
    </div>

    <div className="grid grid-cols-1 gap-6 xl:grid-cols-12">
      <Card className="xl:col-span-4">
        <SectionTitle>Payroll Readiness</SectionTitle>
        <div className="mt-4 flex items-center gap-5"><div className="grid h-28 w-28 shrink-0 place-items-center rounded-full" style={{ background: `conic-gradient(#159C94 ${dashboard.payroll.completion}%, #eef2f7 0)` }}><div className="grid h-20 w-20 place-items-center rounded-full bg-white text-center"><span><b className="block text-xl">{dashboard.payroll.completion}%</b><small className="text-[10px] text-slate-500">Complete</small></span></div></div><div className="flex-1 space-y-3 text-xs"><DataRow label="Total Employees" value={dashboard.totalEmployees} /><DataRow label="Configured" value={dashboard.payroll.processed} tone="text-emerald-600" /><DataRow label="Pending" value={dashboard.payroll.pending} tone="text-rose-500" /></div></div>
      </Card>

      <Card className="xl:col-span-4">
        <SectionTitle>Upcoming Holidays</SectionTitle>
        <div className="mt-4 space-y-2">{dashboard.upcomingHolidays.map((holiday) => <div key={holiday.id} className="flex items-center gap-3 rounded-lg bg-slate-50 p-3"><div className="grid h-10 w-10 place-items-center rounded-lg bg-teal-50 text-teal-700"><Icon name="calendar" /></div><div className="min-w-0"><p className="truncate text-xs font-semibold">{holiday.name}</p><p className="mt-0.5 text-[10px] text-slate-500">{formatDate(holiday.startDate)}{holiday.endDate && holiday.endDate !== holiday.startDate ? ` – ${formatDate(holiday.endDate)}` : ""}</p></div></div>)}{dashboard.upcomingHolidays.length === 0 && <Empty>No upcoming holidays are configured in EDXSv2.</Empty>}</div>
      </Card>

      <Card className="xl:col-span-4">
        <SectionTitle>Top Absence Departments</SectionTitle>
        <div className="mt-4 space-y-3">{dashboard.absenceDepartments.map((department, index) => <div className="grid grid-cols-[24px_100px_1fr_38px] items-center gap-2 text-[11px]" key={department.name}><span className="grid h-6 w-6 place-items-center rounded-md bg-rose-50 font-bold text-rose-500">{index + 1}</span><span className="truncate" title={department.name}>{department.name}</span><div className="h-2 rounded-full bg-slate-100"><div className="h-2 rounded-full bg-rose-500" style={{ width: `${department.value}%` }} /></div><b className="text-right">{department.value}%</b></div>)}{dashboard.absenceDepartments.length === 0 && <Empty>No department absences recorded today.</Empty>}</div>
      </Card>
    </div>
    {isInitialLoad && <LiveDataLoader />}
    </div>
    <Modal open={isAttendanceModalOpen} onClose={() => setIsAttendanceModalOpen(false)} title={`Attendance · ${rangeLabel(startDate)}`} widthClassName="max-w-6xl">
      <div className="mb-4 flex items-center justify-between gap-3"><p className="text-sm text-slate-500">{dashboard.attendanceRecords.length.toLocaleString()} attendance records since {formatDate(startDate)}.</p></div>
      <div className="max-h-[62vh] overflow-auto rounded-xl border border-slate-100"><table className="w-full min-w-[800px] text-left text-sm"><thead className="sticky top-0 z-10 bg-slate-50 text-xs font-semibold text-slate-500"><tr><th className="px-4 py-3">Date</th><th className="px-4 py-3">Employee</th><th className="px-4 py-3">Department</th><th className="px-4 py-3">Check-in</th><th className="px-4 py-3">Check-out</th><th className="px-4 py-3">Status</th></tr></thead><tbody>{dashboard.attendanceRecords.map((row) => <tr key={`${row.id}-${row.employeeId}-${row.attendanceDate}`} className="border-t border-slate-100 transition-colors hover:bg-slate-50"><td className="px-4 py-3 text-slate-500">{formatDate(row.attendanceDate)}</td><td className="px-4 py-3"><div className="font-semibold text-slate-800">{row.employeeName}</div><div className="mt-0.5 text-xs text-slate-400">{row.employeeCode || "—"}</div></td><td className="px-4 py-3 text-slate-600">{row.department}</td><td className="px-4 py-3 text-slate-600">{formatTime(row.attendanceTime)}</td><td className="px-4 py-3 text-slate-600">{formatTime(row.attendanceOutTime)}</td><td className="px-4 py-3"><Status value={row.status} /></td></tr>)}{dashboard.attendanceRecords.length === 0 && <tr><td colSpan={6} className="px-4 py-14 text-center text-sm text-slate-500">No attendance records found since {formatDate(startDate)}.</td></tr>}</tbody></table></div>
    </Modal>
    <Modal open={isEmployeesModalOpen} onClose={() => setIsEmployeesModalOpen(false)} title={`Employees · ${dashboard.totalEmployees.toLocaleString()}`} widthClassName="max-w-5xl">
      <div className="mb-4 flex flex-col gap-3 rounded-2xl border border-teal-100 bg-gradient-to-r from-teal-50/80 via-white to-blue-50/80 p-4 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-sm font-bold text-slate-800">Employee directory</p><p className="mt-1 text-xs text-slate-500">Employees in the selected branch scope.</p></div><span className="inline-flex w-fit items-center gap-2 rounded-xl border border-teal-200 bg-white px-3 py-2 text-xs font-bold text-teal-700 shadow-sm"><i className="h-2 w-2 rounded-full bg-teal-500" />{dashboard.totalEmployees.toLocaleString()} live employees</span></div>
      <div className="mb-4 flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 shadow-[0_2px_6px_rgba(15,23,42,.04)] transition-colors focus-within:border-teal-400 focus-within:ring-4 focus-within:ring-teal-500/10"><svg viewBox="0 0 24 24" className="h-5 w-5 text-slate-400" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden><circle cx="11" cy="11" r="6"/><path d="m16 16 4 4"/></svg><input value={employeeSearch} onChange={(event) => setEmployeeSearch(event.target.value)} placeholder="Search employee, code or department…" className="min-w-0 flex-1 bg-transparent text-sm text-slate-700 outline-none placeholder:text-slate-400" /><span className="rounded-lg bg-slate-100 px-2 py-1 text-[10px] font-bold text-slate-500">{visibleEmployees.length} shown</span></div>
      <div className="max-h-[56vh] overflow-auto rounded-2xl border border-slate-200 bg-white shadow-[0_8px_24px_rgba(15,23,42,.05)]"><table className="w-full min-w-[620px] text-left text-sm"><thead className="sticky top-0 z-10 border-b border-teal-100 bg-gradient-to-r from-teal-50 to-slate-50 text-[11px] font-bold uppercase tracking-wide text-slate-500"><tr><th className="px-5 py-3.5">Employee</th><th className="px-5 py-3.5">Code</th><th className="px-5 py-3.5">Department</th></tr></thead><tbody>{visibleEmployees.map((employee) => <tr key={employee.id} className="border-t border-slate-100 transition-colors hover:bg-teal-50/60"><td className="px-5 py-3"><span className="flex items-center gap-3"><b className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-blue-50 text-[10px] font-bold text-blue-700">{initials(employee.employeeName)}</b><span className="font-semibold text-slate-800">{employee.employeeName}</span></span></td><td className="px-5 py-3 font-medium text-slate-500">{employee.employeeCode || "—"}</td><td className="px-5 py-3"><span className="rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">{employee.department}</span></td></tr>)}{visibleEmployees.length === 0 && <tr><td colSpan={3} className="px-4 py-14 text-center text-sm text-slate-500">No employees match your search.</td></tr>}</tbody></table></div>
    </Modal>
    <Modal open={attendanceView !== null} onClose={() => setAttendanceView(null)} title={`${attendanceView ?? "Attendance"} Today · ${viewedAttendance.length.toLocaleString()}`} widthClassName="max-w-5xl">
      <div className="mb-4 flex flex-col gap-3 rounded-2xl border border-teal-100 bg-gradient-to-r from-teal-50/80 via-white to-blue-50/80 p-4 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-sm font-bold text-slate-800">{attendanceView} attendance</p><p className="mt-1 text-xs text-slate-500">Employees recorded for today in the selected branch scope.</p></div><span className="inline-flex w-fit items-center gap-2 rounded-xl border border-teal-200 bg-white px-3 py-2 text-xs font-bold text-teal-700 shadow-sm"><i className="h-2 w-2 rounded-full bg-teal-500" />{viewedAttendance.length.toLocaleString()} employees</span></div>
      <div className="max-h-[56vh] overflow-auto rounded-2xl border border-slate-200 bg-white shadow-[0_8px_24px_rgba(15,23,42,.05)]"><table className="w-full min-w-[720px] text-left text-sm"><thead className="sticky top-0 z-10 border-b border-teal-100 bg-gradient-to-r from-teal-50 to-slate-50 text-[11px] font-bold uppercase tracking-wide text-slate-500"><tr><th className="px-5 py-3.5">Employee</th><th className="px-5 py-3.5">Department</th><th className="px-5 py-3.5">Check-in</th><th className="px-5 py-3.5">Status</th></tr></thead><tbody>{viewedAttendance.map((row) => <tr key={`${row.id}-${row.employeeId}`} className="border-t border-slate-100 transition-colors hover:bg-teal-50/60"><td className="px-5 py-3"><span className="flex items-center gap-3"><b className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-blue-50 text-[10px] font-bold text-blue-700">{initials(row.employeeName)}</b><span><span className="block font-semibold text-slate-800">{row.employeeName}</span><span className="mt-0.5 block text-xs text-slate-400">{row.employeeCode || "—"}</span></span></span></td><td className="px-5 py-3"><span className="rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">{row.department}</span></td><td className="px-5 py-3 font-medium text-slate-600">{formatTime(row.attendanceTime)}</td><td className="px-5 py-3"><Status value={row.status} /></td></tr>)}{viewedAttendance.length === 0 && <tr><td colSpan={4} className="px-4 py-14 text-center text-sm text-slate-500">No {attendanceView?.toLowerCase()} employees recorded today.</td></tr>}</tbody></table></div>
    </Modal>
  </div>;
}

function MiniStat({ label, value, className }: { label: string; value: number; className: string }) {
  return <div className={`rounded-lg p-2.5 ${className}`}><p className="text-[10px]">{label}</p><p className="mt-1 text-lg font-bold">{value.toLocaleString()}</p></div>;
}

function AlertRow({ tone, title, subtitle, value }: { tone: "rose" | "amber" | "teal"; title: string; subtitle: string; value: number }) {
  const styles = { rose: "bg-rose-50 text-rose-600", amber: "bg-amber-50 text-amber-600", teal: "bg-teal-50 text-teal-700" };
  return <div className="flex items-center gap-3 border-b border-slate-100 py-2 last:border-0"><span className={`grid h-9 w-9 place-items-center rounded-lg ${styles[tone]}`}><Icon name="clock" /></span><span className="min-w-0 flex-1"><b className="block text-xs">{title}</b><small className="text-[10px] text-slate-500">{subtitle}</small></span><strong className={`text-xl ${styles[tone].split(" ")[1]}`}>{value}</strong></div>;
}

function DataRow({ label, value, tone = "text-slate-800" }: { label: string; value: number; tone?: string }) {
  return <div className="flex items-center justify-between border-b border-slate-100 pb-2 last:border-0"><span className="text-slate-500">{label}</span><b className={tone}>{value.toLocaleString()}</b></div>;
}
