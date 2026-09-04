import { useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

// Placeholder data shaped like a real shipment/logistics dataset (freight-forwarding domain:
// bookings, containers, carriers, transport legs) — there is no backend for this yet, this page
// exists to validate the layout/UX before the real Shipment/Container/Booking tables are designed.
// Swapping this for live data later means replacing these consts with query results; the JSX below
// doesn't need to change shape.

const kpis = {
  totalShipments: 36,
  inTransit: 14,
  delayed: 16,
  revenue: 8287,
  profit: 3429,
  totalContainers: 18,
  containersInTransit: 5,
  totalPackages: 32,
  totalCbm: 295.18,
  totalWeight: 74630.0,
};

const shipmentsByMonth = [
  { month: "Jan", count: 18 },
  { month: "Feb", count: 22 },
  { month: "Mar", count: 27 },
  { month: "Apr", count: 36 },
];

const pipeline = [
  { stage: "Planning", count: 15 },
  { stage: "Pre-Carriage", count: 3 },
  { stage: "Customs Clearance", count: 3 },
  { stage: "Main Carriage", count: 11 },
  { stage: "On-Carriage", count: 1 },
  { stage: "Completed", count: 5 },
];

const shipmentFunnel = [
  { stage: "1. Inquiry received", count: 10 },
  { stage: "2. Quotation sent", count: 2 },
  { stage: "3. Rate approved", count: 2 },
  { stage: "4. Booking confirmed", count: 2 },
  { stage: "5. Cargo received", count: 10 },
  { stage: "6. HAWB raised", count: 0 },
  { stage: "7. Customs released", count: 2 },
  { stage: "8. MAWB / airline booked", count: 10 },
  { stage: "9. Departed", count: 2 },
  { stage: "10. Arrived", count: 1 },
  { stage: "11. Delivered", count: 1 },
  { stage: "12. Invoiced", count: 1 },
  { stage: "13. Job closed", count: 1 },
];

// Categorical palette: dataviz skill's validated default (first 3 slots pass all-pairs CVD/contrast
// checks together) — not the app's brand tokens, which are UI chrome colors, not built for this job.
const TRANSPORT_COLORS = { Air: "#2a78d6", Road: "#eb6834", "Sea / Waterway": "#1baf7a" };
const transportMode = [
  { name: "Air", value: 3 },
  { name: "Road", value: 4 },
  { name: "Sea / Waterway", value: 29 },
];

const arrivalTimeline = [
  { month: "Apr 2026", count: 12 },
  { month: "May 2026", count: 9 },
  { month: "Jun 2026", count: 9 },
];

const topCustomers = [
  { name: "Phuoc An Wood Co., Ltd", shipments: 3, revenue: 5332 },
  { name: "Viet Tech Electronics Co., Ltd", shipments: 1, revenue: 2955 },
  { name: "Acme Corporation", shipments: 1, revenue: 0 },
  { name: "Bat Trang Ceramics Co., Ltd", shipments: 1, revenue: 0 },
  { name: "CFS Agent Singapore", shipments: 1, revenue: 0 },
];

const topCarriers = [
  { name: "Hapag-Lloyd", shipments: 8 },
  { name: "COSCO Shipping", shipments: 5 },
  { name: "SITC Container Lines", shipments: 4 },
  { name: "Evergreen", shipments: 2 },
  { name: "Manh Long Trucking Co., Ltd", shipments: 2 },
];

const topResponsible = [
  { name: "Marc Demo", shipments: 20, revenue: 8287 },
  { name: "Mitchell Admin", shipments: 13, revenue: 0 },
  { name: "ViindooBot", shipments: 2, revenue: 0 },
  { name: "Booking Officer Demo", shipments: 1, revenue: 0 },
];

const shipmentTypes = [
  { type: "FCL", shipments: 19, revenue: 5332 },
  { type: "Loose", shipments: 2, revenue: 2955 },
  { type: "FTL", shipments: 2, revenue: 0 },
  { type: "LCL", shipments: 12, revenue: 0 },
  { type: "LTL", shipments: 1, revenue: 0 },
];

const topRevenue = [
  { code: "SHP/2604/00005", customer: "Phuoc An Wood Co., Ltd", revenue: 3869, profit: 545 },
  { code: "SHP/2604/00021", customer: "Viet Tech Electronics Co., Ltd", revenue: 2955, profit: 2955 },
  { code: "SHP/2604/00006", customer: "Phuoc An Wood Co., Ltd", revenue: 1463, profit: 1463 },
  { code: "SHP/2604/00002", customer: "YourCompany, Joel Willis", revenue: null, profit: null },
  { code: "SHP/2604/00014", customer: "Viet Handicraft Co., Ltd", revenue: null, profit: null },
];

const delayedShipments = [
  { code: "SHP/2604/00009", eta: "3/20/2026", customer: "Hanoi Textile Co., Ltd", responsible: "Marc Demo" },
  { code: "SHP/2604/00014", eta: "3/21/2026", customer: "Viet Handicraft Co., Ltd", responsible: "Marc Demo" },
  { code: "SHP/2604/00016", eta: "3/21/2026", customer: "Bat Trang Ceramics Co.", responsible: "Marc Demo" },
  { code: "SHP/2604/00015", eta: "3/22/2026", customer: "Traditional Crafts Co.", responsible: "Marc Demo" },
  { code: "SHP/2604/00011", eta: "3/22/2026", customer: "Viet Steel Co., Ltd", responsible: "Marc Demo" },
  { code: "SHP/2604/00017", eta: "3/23/2026", customer: "Viet Hung Garment Co.", responsible: "Marc Demo" },
  { code: "SHP/2604/00019", eta: "3/26/2026", customer: "Saigon Plastics Manufa", responsible: "Marc Demo" },
  { code: "SHP/2604/00021", eta: "3/26/2026", customer: "Viet Tech Electronics Co.", responsible: "Marc Demo" },
  { code: "SHP/2604/00012", eta: "3/28/2026", customer: "HamburgAgent GmbH", responsible: "Marc Demo" },
];

const pendingBookings = [
  { booking: "BK-260421-016", booked: "4/21/2026", shipment: "SHP/2604/00039", carrier: "ONE (Ocean Network Express)", responsible: "Mitchell Admin" },
  { booking: "BK-260420-014", booked: "4/20/2026", shipment: "SHP/2604/00023", carrier: "COSCO Shipping", responsible: "Mitchell Admin" },
  { booking: "BK-260420-001", booked: "4/5/2026", shipment: "SHP/2604/00008", carrier: "Saigon Consolidators Co.", responsible: "ViindooBot" },
  { booking: "BK-260420-003", booked: "3/25/2026", shipment: "SHP/2604/00006", carrier: "Hapag-Lloyd", responsible: "ViindooBot" },
  { booking: "BK-260420-007", booked: "3/20/2026", shipment: "SHP/2604/00010", carrier: "Maersk Line Vietnam", responsible: "ViindooBot" },
];

// Master status column — every stage a shipment can sit in end to end, from first inquiry through
// delivery/close and the exception/terminal states. Placeholder counts, same mock-data status as
// the rest of this page (see note above); becomes `GROUP BY status` once the Shipment table exists.
const shipmentsByStatus: { status: string; shipments: number; chgWeight: number; revenue: number | null }[] = [
  { status: "New Inquiry", shipments: 0, chgWeight: 0, revenue: null },
  { status: "Awaiting Quotation", shipments: 0, chgWeight: 0, revenue: null },
  { status: "Quotation Sent", shipments: 0, chgWeight: 0, revenue: null },
  { status: "Negotiation", shipments: 0, chgWeight: 0, revenue: null },
  { status: "Confirmed", shipments: 0, chgWeight: 0, revenue: null },
  { status: "Pickup Pending", shipments: 0, chgWeight: 0, revenue: null },
  { status: "Cargo Received", shipments: 0, chgWeight: 0, revenue: null },
  { status: "Documentation Pending", shipments: 0, chgWeight: 0, revenue: null },
  { status: "Ready for Customs", shipments: 0, chgWeight: 0, revenue: null },
  { status: "Customs Cleared", shipments: 0, chgWeight: 0, revenue: null },
  { status: "Ready for Airline", shipments: 7, chgWeight: 6590, revenue: null },
  { status: "Booked", shipments: 0, chgWeight: 0, revenue: null },
  { status: "Accepted", shipments: 0, chgWeight: 0, revenue: null },
  { status: "Departed", shipments: 0, chgWeight: 0, revenue: null },
  { status: "In Transit", shipments: 1, chgWeight: 950, revenue: 400000 },
  { status: "Arrived", shipments: 0, chgWeight: 0, revenue: null },
  { status: "Out for Delivery", shipments: 0, chgWeight: 0, revenue: null },
  { status: "Delivered", shipments: 0, chgWeight: 0, revenue: null },
  { status: "Closed", shipments: 1, chgWeight: 2450, revenue: 810000 },
  { status: "Delayed", shipments: 1, chgWeight: 6040, revenue: null },
  { status: "Hold", shipments: 0, chgWeight: 0, revenue: null },
  { status: "Exception", shipments: 0, chgWeight: 0, revenue: null },
  { status: "Returned", shipments: 0, chgWeight: 0, revenue: null },
  { status: "Cancelled", shipments: 0, chgWeight: 0, revenue: null },
];

// Employee performance — headcount roster with sales-exec involvement, revenue credited, and open
// job load. Placeholder counts, same mock-data status as the rest of this page (see note above);
// becomes a per-employee aggregate query once Shipment/Booking records carry a responsible-employee
// reference. Unfilled roster seats (no employee assigned yet) keep the "-" revenue convention used
// by shipmentsByStatus above rather than 0, since 0 would misread as "assigned but earned nothing."
const employeePerformance: { employee: string; asSalesExec: number; salesRevenue: number | null; openJobs: number }[] = [
  { employee: "Sales Manager", asSalesExec: 0, salesRevenue: null, openJobs: 0 },
  { employee: "Sales Executive 1", asSalesExec: 1, salesRevenue: 810000, openJobs: 0 },
  { employee: "Sales Executive 2", asSalesExec: 1, salesRevenue: 400000, openJobs: 0 },
  { employee: "CSR Officer", asSalesExec: 0, salesRevenue: null, openJobs: 1 },
  { employee: "Warehouse Supervisor", asSalesExec: 0, salesRevenue: null, openJobs: 0 },
  { employee: "Documentation Officer", asSalesExec: 0, salesRevenue: null, openJobs: 0 },
  { employee: "Customs Agent", asSalesExec: 0, salesRevenue: null, openJobs: 0 },
  { employee: "Accounts Officer", asSalesExec: 0, salesRevenue: null, openJobs: 0 },
  { employee: "Operations Manager", asSalesExec: 0, salesRevenue: null, openJobs: 0 },
];

// "Today" activity snapshot — placeholder counts (same mock-data status as the rest of this page,
// see note above) shaped to become `COUNT(*) WHERE date = today` queries per metric once the
// Shipment/Booking/Invoice/Event tables exist.
const todayStats: { label: string; value: number; emphasis?: boolean }[] = [
  { label: "Inquiries received today", value: 0, emphasis: true },
  { label: "Quotations sent today", value: 0 },
  { label: "Bookings confirmed today", value: 0, emphasis: true },
  { label: "Cargo received today", value: 0 },
  { label: "Flights departed today", value: 0, emphasis: true },
  { label: "Shipments arrived today", value: 0 },
  { label: "Deliveries completed today", value: 0, emphasis: true },
  { label: "Invoices raised today", value: 0 },
  { label: "Events logged today", value: 0 },
];

const money = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
const pkr = new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 });
const number = new Intl.NumberFormat("en-US");

type StatAccent = "indigo" | "emerald" | "slate" | "rose" | "amber" | "cyan" | "violet";

// Page-local stat tile — kept distinct from the shared dashboard StatTile (used by the Executive
// Dashboard, not touched here) so this redesign doesn't change that page's look too. Trades the
// flat bordered-box read ("cartons") for a soft gradient surface, a glowing icon badge, and a
// bottom-edge accent bar with a subtle blur — same accent-color system as the leaderboard rows
// so the whole page reads as one design, not a stat grid stacked above a different-looking list.
const STAT_ACCENTS: Record<StatAccent, { from: string; to: string; icon: string; glow: string; bar: string }> = {
  indigo: { from: "from-indigo-50 dark:from-indigo-500/10", to: "to-white dark:to-slate-900", icon: "bg-indigo-500/15 text-indigo-600 dark:text-indigo-300", glow: "bg-indigo-400/30", bar: "bg-indigo-500" },
  emerald: { from: "from-emerald-50 dark:from-emerald-500/10", to: "to-white dark:to-slate-900", icon: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-300", glow: "bg-emerald-400/30", bar: "bg-emerald-500" },
  slate: { from: "from-slate-50 dark:from-slate-500/10", to: "to-white dark:to-slate-900", icon: "bg-slate-500/15 text-slate-600 dark:text-slate-300", glow: "bg-slate-400/30", bar: "bg-slate-500" },
  rose: { from: "from-rose-50 dark:from-rose-500/10", to: "to-white dark:to-slate-900", icon: "bg-rose-500/15 text-rose-600 dark:text-rose-300", glow: "bg-rose-400/30", bar: "bg-rose-500" },
  amber: { from: "from-amber-50 dark:from-amber-500/10", to: "to-white dark:to-slate-900", icon: "bg-amber-500/15 text-amber-600 dark:text-amber-300", glow: "bg-amber-400/30", bar: "bg-amber-500" },
  cyan: { from: "from-cyan-50 dark:from-cyan-500/10", to: "to-white dark:to-slate-900", icon: "bg-cyan-500/15 text-cyan-600 dark:text-cyan-300", glow: "bg-cyan-400/30", bar: "bg-cyan-500" },
  violet: { from: "from-violet-50 dark:from-violet-500/10", to: "to-white dark:to-slate-900", icon: "bg-violet-500/15 text-violet-600 dark:text-violet-300", glow: "bg-violet-400/30", bar: "bg-violet-500" },
};

function ShipmentStat({ label, value, icon, accent }: { label: string; value: string | number; icon: string; accent: StatAccent }) {
  const a = STAT_ACCENTS[accent];
  return (
    <div className={`group relative overflow-hidden rounded-2xl border border-slate-200/70 dark:border-slate-800 bg-gradient-to-br ${a.from} ${a.to} p-4 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200`}>
      <span className={`pointer-events-none absolute -right-4 -top-4 w-16 h-16 rounded-full blur-2xl opacity-60 ${a.glow}`} aria-hidden />
      <div className="relative flex items-center justify-between gap-2">
        <div className="min-w-0">
          <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500 truncate">{label}</div>
          <div className="text-2xl font-bold mt-1 text-slate-800 dark:text-slate-50 tabular-nums">{value}</div>
        </div>
        <div className={`shrink-0 w-11 h-11 rounded-2xl flex items-center justify-center text-lg shadow-sm ${a.icon}`} aria-hidden>
          {icon}
        </div>
      </div>
      <span className={`absolute bottom-0 left-4 right-4 h-0.5 rounded-full ${a.bar} opacity-70 group-hover:opacity-100 transition-opacity`} aria-hidden />
    </div>
  );
}

// "Today" snapshot — soft card matching SectionCard's plain-white header and StatusPanel's
// rounded chip-row treatment (dropped the solid brand-color title bar and flat striped rows,
// which read as a harsh spreadsheet next to the rest of the page's softened widgets).
function TodayPanel({ rows }: { rows: { label: string; value: number; emphasis?: boolean }[] }) {
  return (
    <div className="rounded-2xl border border-slate-200/70 dark:border-slate-800 shadow-sm bg-white dark:bg-slate-900 flex flex-col overflow-hidden">
      <div className="px-5 pt-4 pb-3">
        <h2 className="text-sm font-semibold text-brand-700 dark:text-brand-300">Today</h2>
      </div>
      <div className="px-2 pb-2 space-y-1">
        {rows.map((row) => (
          <div
            key={row.label}
            className="flex items-center justify-between gap-3 rounded-xl px-3 py-2.5 bg-slate-50/70 dark:bg-slate-800/40 hover:bg-slate-100/80 dark:hover:bg-slate-800/70 transition-colors"
          >
            <span className={`text-sm text-slate-700 dark:text-slate-200 truncate ${row.emphasis ? "font-semibold" : "font-medium"}`}>{row.label}</span>
            <span className="inline-flex items-center justify-center min-w-[1.75rem] h-6 px-2 rounded-full bg-brand-50 dark:bg-brand-500/15 text-brand-700 dark:text-brand-200 text-xs font-semibold tabular-nums shrink-0">
              {number.format(row.value)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// Master status breakdown — soft card matching SectionCard's plain-white header instead of a dark
// title bar or a <table>: a bare header row read as spreadsheet-y even after switching off <table>
// markup. Each status is a pill-badge row (rounded chip for the shipment count, muted secondary
// text for weight/revenue) with generous padding so scrolling never clips a row mid-way; the
// scroll container ends exactly on a row boundary and fades the last row instead of hard-cropping.
function StatusPanel({ rows }: { rows: typeof shipmentsByStatus }) {
  return (
    <div className="rounded-2xl border border-slate-200/70 dark:border-slate-800 shadow-sm bg-white dark:bg-slate-900 flex flex-col overflow-hidden">
      <div className="flex items-center justify-between px-5 pt-4 pb-3 shrink-0">
        <h2 className="text-sm font-semibold text-brand-700 dark:text-brand-300">Shipments Status</h2>
        <span className="text-xs text-slate-400">{rows.length} statuses</span>
      </div>
      {/* Fixed to exactly 5 rows (56px each); remaining rows scroll within the card instead of
          pushing the rest of the page down or clipping a row mid-height. */}
      <div className="max-h-[280px] overflow-y-auto px-2 pb-2 space-y-1">
        {rows.map((row) => (
          <div
            key={row.status}
            className="flex items-center justify-between gap-3 rounded-xl px-3 py-2.5 h-14 bg-slate-50/70 dark:bg-slate-800/40 hover:bg-slate-100/80 dark:hover:bg-slate-800/70 transition-colors"
          >
            <span className="text-sm font-medium text-slate-700 dark:text-slate-200 truncate">{row.status}</span>
            <div className="flex items-center gap-3 shrink-0">
              <div className="text-right leading-tight">
                <div className="text-xs text-slate-400 dark:text-slate-500 tabular-nums">
                  {row.revenue == null ? "—" : `₨${pkr.format(row.revenue)}`}
                </div>
                <div className="text-[11px] text-slate-400 dark:text-slate-500 tabular-nums">{number.format(row.chgWeight)} kg</div>
              </div>
              <span className="inline-flex items-center justify-center min-w-[1.75rem] h-6 px-2 rounded-full bg-brand-50 dark:bg-brand-500/15 text-brand-700 dark:text-brand-200 text-xs font-semibold tabular-nums">
                {number.format(row.shipments)}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function SectionCard({ title, action, children }: { title: string; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold text-brand-700 dark:text-brand-300">{title}</h2>
        {action}
      </div>
      {children}
    </div>
  );
}

function ChartTooltip({ active, payload, label, formatter }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 shadow-lg text-xs">
      {label && <div className="font-semibold text-slate-700 dark:text-slate-200 mb-1">{label}</div>}
      {payload.map((p: any, i: number) => (
        <div key={i} className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
          <span className="w-2 h-2 rounded-full shrink-0" style={{ background: p.color || p.fill }} />
          {p.name}: <span className="font-semibold text-slate-800 dark:text-slate-100">{formatter ? formatter(p.value) : p.value}</span>
        </div>
      ))}
    </div>
  );
}

// Compact "Top N" / record-list table shared by the plain-grid widgets (Delayed Shipments,
// Pending Bookings, Top Routes). Softened from the original boxed-spreadsheet look: small-caps
// muted header instead of a bold row, hairline dividers only between rows (no cell borders), a
// touch more vertical breathing room, and zebra-free — a quiet hover wash is enough separation
// without turning the whole thing into a grid of "cartons."
function MiniTable<T extends { [k: string]: any }>({
  columns,
  rows,
  keyField,
}: {
  columns: { key: string; header: string; align?: "right"; render?: (r: T) => React.ReactNode }[];
  rows: T[];
  keyField: string;
}) {
  return (
    <div className="overflow-x-auto -mx-1">
      <table className="w-full text-sm">
        <thead>
          <tr>
            {columns.map((c) => (
              <th
                key={c.key}
                className={`px-1.5 pb-2.5 text-[11px] font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500 ${
                  c.align === "right" ? "text-right" : "text-left"
                }`}
              >
                {c.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100/80 dark:divide-slate-800/80">
          {rows.map((row) => (
            <tr key={row[keyField]} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
              {columns.map((c) => (
                <td key={c.key} className={`px-1.5 py-2.5 text-slate-600 dark:text-slate-300 ${c.align === "right" ? "text-right" : ""}`}>
                  {c.render ? c.render(row) : row[c.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// Ranked "leaderboard" widget — distinct from MiniTable (the plain data grids used for Delayed
// Shipments / Pending Bookings elsewhere on this page) by a share-of-max progress bar under each
// row instead of a bare number in a column. Deliberately restrained: one muted brand-tinted bar
// color for every row (not a different hue per rank — that read as playful/toy-like, "cartons"),
// a plain numbered rank marker instead of a colored ring + emoji trophy, and hairline row
// dividers instead of hover-only chrome, so it reads as a quiet enterprise widget rather than a
// game leaderboard.
function Leaderboard<T extends { [k: string]: any }>({
  rows,
  keyField,
  nameField,
  metricField,
  metricFormat,
  secondaryField,
  secondaryFormat,
}: {
  rows: T[];
  keyField: string;
  nameField: string;
  metricField: string;
  metricFormat?: (v: number) => string;
  secondaryField?: string;
  secondaryFormat?: (v: number) => string;
}) {
  const max = Math.max(1, ...rows.map((r) => Number(r[metricField]) || 0));
  return (
    <div className="divide-y divide-slate-100 dark:divide-slate-800">
      {rows.map((row, i) => {
        const value = Number(row[metricField]) || 0;
        const pct = Math.max(3, Math.round((value / max) * 100));
        return (
          <div key={row[keyField]} className="flex items-center gap-3 py-2.5 first:pt-0 last:pb-0">
            <span
              className={`shrink-0 w-5 text-center text-[11px] font-semibold tabular-nums ${
                i === 0 ? "text-brand-600 dark:text-brand-100" : "text-slate-400 dark:text-slate-500"
              }`}
            >
              {i + 1}
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex items-baseline justify-between gap-2">
                <span className="text-sm font-medium text-slate-700 dark:text-slate-200 truncate">{row[nameField]}</span>
                <span className="text-sm font-semibold text-slate-800 dark:text-slate-50 tabular-nums shrink-0">
                  {metricFormat ? metricFormat(value) : value}
                </span>
              </div>
              <div className="flex items-center gap-2 mt-1.5">
                <div className="flex-1 h-1 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                  <div className="h-full rounded-full bg-brand-400 dark:bg-brand-200" style={{ width: `${pct}%` }} />
                </div>
                {secondaryField && (
                  <span className="text-[11px] text-slate-400 dark:text-slate-500 tabular-nums shrink-0">
                    {secondaryFormat ? secondaryFormat(row[secondaryField]) : row[secondaryField]}
                  </span>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

const DATE_RANGES = ["Last 7 Days", "Last 30 Days", "Last 90 Days", "This Year", "All Time"];

export default function ShipmentDashboardPage() {
  const [dateRange, setDateRange] = useState("Last 90 Days");
  const [search, setSearch] = useState("");

  // Placeholder filter surface — matches the screenshot's field row; wiring these to real query
  // params happens once the Shipment data model exists.
  const filteredDelayed = useMemo(
    () => (search.trim() ? delayedShipments.filter((s) => s.customer.toLowerCase().includes(search.trim().toLowerCase())) : delayedShipments),
    [search]
  );

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div>
          <h1 className="text-xl font-semibold">Shipment Dashboard</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">Shipment life cycle — bookings, transit, delivery, and revenue in one view.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value)}
            className="rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-1.5 text-sm"
          >
            {DATE_RANGES.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search customer…"
            className="rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-1.5 text-sm w-44"
          />
        </div>
      </div>

      {/* KPI row — page-local ShipmentStat tiles (soft gradient + glow), not the flat bordered-box
          StatTile the Executive Dashboard uses, so this page has one consistent, more polished
          visual identity end to end rather than a plain stat grid above a redesigned leaderboard. */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 mb-6">
        <ShipmentStat label="Total Shipments" value={number.format(kpis.totalShipments)} icon="📦" accent="indigo" />
        <ShipmentStat label="In Transit" value={number.format(kpis.inTransit)} icon="🚚" accent="cyan" />
        <ShipmentStat label="Delayed" value={number.format(kpis.delayed)} icon="⏰" accent="rose" />
        <ShipmentStat label="Revenue" value={money.format(kpis.revenue)} icon="💰" accent="emerald" />
        <ShipmentStat label="Profit" value={money.format(kpis.profit)} icon="📈" accent="violet" />
        <ShipmentStat label="Total Containers" value={number.format(kpis.totalContainers)} icon="🧊" accent="indigo" />
        <ShipmentStat label="Containers In Transit" value={number.format(kpis.containersInTransit)} icon="🚢" accent="cyan" />
        <ShipmentStat label="Total Packages" value={number.format(kpis.totalPackages)} icon="📋" accent="slate" />
        <ShipmentStat label="Total CBM" value={kpis.totalCbm.toFixed(2)} icon="📐" accent="amber" />
        <ShipmentStat label="Total Weight (kg)" value={number.format(kpis.totalWeight)} icon="⚖️" accent="amber" />
      </div>

      <SectionCard
        title="Delayed & At Risk Shipments"
        action={
          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 dark:text-slate-400">
            <span className="w-1.5 h-1.5 rounded-full bg-danger-500" aria-hidden />
            {filteredDelayed.length} late
          </span>
        }
      >
        <MiniTable
          keyField="code"
          rows={filteredDelayed}
          columns={[
            { key: "code", header: "Shipment", render: (r) => <span className="text-brand-600 dark:text-brand-100 font-medium">{r.code}</span> },
            { key: "eta", header: "ETA" },
            { key: "customer", header: "Customer" },
            { key: "responsible", header: "Responsible" },
            {
              key: "status",
              header: "Status",
              render: () => (
                <span className="inline-flex items-center gap-1.5 text-xs font-medium text-danger-500">
                  <span className="w-1.5 h-1.5 rounded-full bg-danger-500" aria-hidden />
                  Late
                </span>
              ),
            },
          ]}
        />
      </SectionCard>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-4">
        <SectionCard title="Top Customers" action={<span className="text-xs text-slate-400">by shipments</span>}>
          <Leaderboard rows={topCustomers} keyField="name" nameField="name" metricField="shipments" secondaryField="revenue" secondaryFormat={money.format} />
        </SectionCard>

        <SectionCard title="Top Carriers" action={<span className="text-xs text-slate-400">by shipments</span>}>
          <Leaderboard rows={topCarriers} keyField="name" nameField="name" metricField="shipments" />
        </SectionCard>

        <SectionCard title="Top Revenue" action={<span className="text-xs text-slate-400">by shipment</span>}>
          <Leaderboard
            rows={topRevenue.map((r) => ({ ...r, revenueValue: r.revenue ?? 0 }))}
            keyField="code"
            nameField="code"
            metricField="revenueValue"
            metricFormat={money.format}
            secondaryField="customer"
          />
        </SectionCard>

        <SectionCard title="Top Responsible" action={<span className="text-xs text-slate-400">by shipments</span>}>
          <Leaderboard rows={topResponsible} keyField="name" nameField="name" metricField="shipments" secondaryField="revenue" secondaryFormat={money.format} />
        </SectionCard>

        <SectionCard title="Shipment Types" action={<span className="text-xs text-slate-400">by shipments</span>}>
          <Leaderboard rows={shipmentTypes} keyField="type" nameField="type" metricField="shipments" secondaryField="revenue" secondaryFormat={money.format} />
        </SectionCard>

        <SectionCard title="Pending Bookings">
          <MiniTable
            keyField="booking"
            rows={pendingBookings}
            columns={[
              { key: "booking", header: "Booking", render: (r) => <span className="text-brand-600 dark:text-brand-100 font-medium">{r.booking}</span> },
              { key: "booked", header: "Booked" },
              { key: "shipment", header: "Shipment" },
              { key: "carrier", header: "Carrier" },
              { key: "responsible", header: "Responsible" },
            ]}
          />
        </SectionCard>

        <TodayPanel rows={todayStats} />

        <StatusPanel rows={shipmentsByStatus} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-4">
        <SectionCard title="Employee Performance" action={<span className="text-xs text-slate-400">by sales revenue</span>}>
          <MiniTable
            keyField="employee"
            rows={employeePerformance}
            columns={[
              { key: "employee", header: "Employee", render: (r) => <span className="text-brand-600 dark:text-brand-100 font-medium">{r.employee}</span> },
              { key: "asSalesExec", header: "As Sales Exec", align: "right" },
              { key: "salesRevenue", header: "Sales Revenue (PKR)", align: "right", render: (r) => (r.salesRevenue == null ? "-" : pkr.format(r.salesRevenue)) },
              { key: "openJobs", header: "Open Jobs Assigned", align: "right" },
            ]}
          />
        </SectionCard>

        <SectionCard title="Sales Revenue by Employee" action={<span className="text-xs text-slate-400">PKR</span>}>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={employeePerformance} layout="vertical" margin={{ left: 12, top: 8, right: 16 }}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.2} horizontal={false} />
              <XAxis type="number" fontSize={11} axisLine={false} tickLine={false} allowDecimals={false} />
              <YAxis type="category" dataKey="employee" fontSize={10} axisLine={false} tickLine={false} width={120} />
              <Tooltip content={<ChartTooltip formatter={(v: number) => `₨${pkr.format(v)}`} />} />
              <Bar dataKey={(r: (typeof employeePerformance)[number]) => r.salesRevenue ?? 0} name="Sales Revenue" fill="#2a78d6" radius={[0, 4, 4, 0]} maxBarSize={16} />
            </BarChart>
          </ResponsiveContainer>
        </SectionCard>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-4 mb-4">
        <SectionCard title="Shipments by Month">
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={shipmentsByMonth} margin={{ left: -20, top: 8 }}>
              <defs>
                <linearGradient id="shipmentAreaFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#2a78d6" stopOpacity={0.35} />
                  <stop offset="100%" stopColor="#2a78d6" stopOpacity={0.03} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" opacity={0.2} vertical={false} />
              <XAxis dataKey="month" fontSize={12} axisLine={false} tickLine={false} />
              <YAxis fontSize={12} axisLine={false} tickLine={false} width={30} />
              <Tooltip content={<ChartTooltip />} />
              <Area type="monotone" dataKey="count" name="Shipments" stroke="#2a78d6" strokeWidth={2} fill="url(#shipmentAreaFill)" dot={{ r: 3, fill: "#2a78d6", strokeWidth: 0 }} />
            </AreaChart>
          </ResponsiveContainer>
        </SectionCard>

        <SectionCard title="Expected Arrival Timeline">
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={arrivalTimeline} margin={{ left: -20, top: 8 }}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.2} vertical={false} />
              <XAxis dataKey="month" fontSize={12} axisLine={false} tickLine={false} />
              <YAxis fontSize={12} axisLine={false} tickLine={false} width={30} allowDecimals={false} />
              <Tooltip content={<ChartTooltip />} />
              <Bar dataKey="count" name="Arrivals" fill="#2a78d6" radius={[4, 4, 0, 0]} maxBarSize={64} />
            </BarChart>
          </ResponsiveContainer>
        </SectionCard>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <SectionCard title="Shipment Pipeline" action={<span className="text-xs text-slate-400">By stage</span>}>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={pipeline} margin={{ left: -20, top: 8 }}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.2} vertical={false} />
              <XAxis dataKey="stage" fontSize={11} axisLine={false} tickLine={false} interval={0} angle={-15} textAnchor="end" height={50} />
              <YAxis fontSize={12} axisLine={false} tickLine={false} width={30} allowDecimals={false} />
              <Tooltip content={<ChartTooltip />} />
              <Bar dataKey="count" name="Shipments" fill="#2a78d6" radius={[4, 4, 0, 0]} maxBarSize={48} />
            </BarChart>
          </ResponsiveContainer>
        </SectionCard>

        <SectionCard title="Transport Mode">
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={transportMode} dataKey="value" nameKey="name" innerRadius={50} outerRadius={80} paddingAngle={3}>
                {transportMode.map((d) => (
                  <Cell key={d.name} fill={TRANSPORT_COLORS[d.name as keyof typeof TRANSPORT_COLORS]} stroke="none" />
                ))}
              </Pie>
              <Tooltip content={<ChartTooltip formatter={(v: number) => `${v} shipments`} />} />
              <Legend
                iconType="circle"
                formatter={(value) => <span className="text-slate-600 dark:text-slate-300 text-xs">{value}</span>}
              />
            </PieChart>
          </ResponsiveContainer>
        </SectionCard>

        <SectionCard title="Shipment Funnel" action={<span className="text-xs text-slate-400">by stage</span>}>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={shipmentFunnel} layout="vertical" margin={{ left: 12, top: 8, right: 16 }}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.2} horizontal={false} />
              <XAxis type="number" fontSize={11} axisLine={false} tickLine={false} allowDecimals={false} />
              <YAxis type="category" dataKey="stage" fontSize={10} axisLine={false} tickLine={false} width={110} />
              <Tooltip content={<ChartTooltip />} />
              <Bar dataKey="count" name="Shipments" fill="#2a78d6" radius={[0, 4, 4, 0]} maxBarSize={14} />
            </BarChart>
          </ResponsiveContainer>
        </SectionCard>
      </div>
    </div>
  );
}
