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
import StatTile from "../dashboard/StatTile";

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

const topRoutes = [
  { code: "R00063", name: "Waterway (Boa...)", shipments: 3 },
  { code: "R00009", name: "Waterway (Boa...)", shipments: 2 },
  { code: "R00010", name: "Waterway (Boa...)", shipments: 2 },
  { code: "R00011", name: "Truck (Freigh...)", shipments: 2 },
  { code: "R00032", name: "Truck (Freigh...)", shipments: 2 },
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

const money = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
const number = new Intl.NumberFormat("en-US");

function SectionCard({ title, action, children }: { title: string; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-200">{title}</h2>
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

// Compact "Top N" table shared by the sidebar-style widgets — no header chrome, dense rows,
// clickable-looking codes to match the screenshot's convention (shipment/route codes in brand color).
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
      <table className="w-full text-xs">
        <thead>
          <tr className="text-slate-400 dark:text-slate-500">
            {columns.map((c) => (
              <th key={c.key} className={`px-1 pb-2 font-semibold ${c.align === "right" ? "text-right" : "text-left"}`}>
                {c.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
          {rows.map((row) => (
            <tr key={row[keyField]} className="hover:bg-slate-50 dark:hover:bg-slate-800/60">
              {columns.map((c) => (
                <td key={c.key} className={`px-1 py-1.5 ${c.align === "right" ? "text-right" : ""}`}>
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

      {/* KPI row — reuses the Executive Dashboard's own StatTile so this page shares the same
          visual language rather than inventing a second stat-tile style. */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 mb-6">
        <StatTile label="Total Shipments" value={number.format(kpis.totalShipments)} icon="📦" accent="indigo" />
        <StatTile label="In Transit" value={number.format(kpis.inTransit)} icon="🚚" accent="cyan" />
        <StatTile label="Delayed" value={number.format(kpis.delayed)} icon="⏰" accent="rose" />
        <StatTile label="Revenue" value={money.format(kpis.revenue)} icon="💰" accent="emerald" />
        <StatTile label="Profit" value={money.format(kpis.profit)} icon="📈" accent="violet" />
        <StatTile label="Total Containers" value={number.format(kpis.totalContainers)} icon="🧊" accent="indigo" />
        <StatTile label="Containers In Transit" value={number.format(kpis.containersInTransit)} icon="🚢" accent="cyan" />
        <StatTile label="Total Packages" value={number.format(kpis.totalPackages)} icon="📋" accent="slate" />
        <StatTile label="Total CBM" value={kpis.totalCbm.toFixed(2)} icon="📐" accent="amber" />
        <StatTile label="Total Weight (kg)" value={number.format(kpis.totalWeight)} icon="⚖️" accent="amber" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">
        <SectionCard title="Shipment Pipeline" action={<span className="text-xs text-slate-400">By stage</span>}>
          <div className="lg:col-span-2">
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={pipeline} margin={{ left: -20, top: 8 }}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.2} vertical={false} />
                <XAxis dataKey="stage" fontSize={11} axisLine={false} tickLine={false} interval={0} angle={-15} textAnchor="end" height={50} />
                <YAxis fontSize={12} axisLine={false} tickLine={false} width={30} allowDecimals={false} />
                <Tooltip content={<ChartTooltip />} />
                <Bar dataKey="count" name="Shipments" fill="#2a78d6" radius={[4, 4, 0, 0]} maxBarSize={48} />
              </BarChart>
            </ResponsiveContainer>
          </div>
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
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
        <SectionCard title="Top Customers">
          <MiniTable
            keyField="name"
            rows={topCustomers}
            columns={[
              { key: "name", header: "Customer", render: (r) => <span className="text-brand-600 dark:text-brand-100 font-medium">{r.name}</span> },
              { key: "shipments", header: "Shipments", align: "right" },
              { key: "revenue", header: "Revenue", align: "right", render: (r) => money.format(r.revenue) },
            ]}
          />
        </SectionCard>

        <SectionCard title="Top Carriers">
          <MiniTable
            keyField="name"
            rows={topCarriers}
            columns={[
              { key: "name", header: "Carrier", render: (r) => <span className="text-brand-600 dark:text-brand-100 font-medium">{r.name}</span> },
              { key: "shipments", header: "Shipments", align: "right" },
            ]}
          />
        </SectionCard>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
        <SectionCard title="Top Revenue">
          <MiniTable
            keyField="code"
            rows={topRevenue}
            columns={[
              { key: "code", header: "Shipment", render: (r) => <span className="text-brand-600 dark:text-brand-100 font-medium">{r.code}</span> },
              { key: "customer", header: "Customer" },
              { key: "revenue", header: "Revenue", align: "right", render: (r) => (r.revenue != null ? money.format(r.revenue) : "—") },
              { key: "profit", header: "Profit", align: "right", render: (r) => (r.profit != null ? money.format(r.profit) : "—") },
            ]}
          />
        </SectionCard>

        <div className="grid grid-rows-2 gap-4">
          <SectionCard title="Top Responsible">
            <MiniTable
              keyField="name"
              rows={topResponsible}
              columns={[
                { key: "name", header: "Responsible", render: (r) => <span className="text-brand-600 dark:text-brand-100 font-medium">{r.name}</span> },
                { key: "shipments", header: "Shipments", align: "right" },
                { key: "revenue", header: "Revenue", align: "right", render: (r) => money.format(r.revenue) },
              ]}
            />
          </SectionCard>
          <SectionCard title="Shipment Types">
            <MiniTable
              keyField="type"
              rows={shipmentTypes}
              columns={[
                { key: "type", header: "Type", render: (r) => <span className="text-brand-600 dark:text-brand-100 font-medium">{r.type}</span> },
                { key: "shipments", header: "Shipments", align: "right" },
                { key: "revenue", header: "Revenue", align: "right", render: (r) => money.format(r.revenue) },
              ]}
            />
          </SectionCard>
        </div>
      </div>

      <SectionCard title="Delayed & At Risk Shipments" action={<span className="text-xs text-danger-500 font-semibold">{filteredDelayed.length} late</span>}>
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
              render: () => <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-danger-100 text-danger-500">Late</span>,
            },
          ]}
        />
      </SectionCard>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-4">
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

        <SectionCard title="Top Routes">
          <MiniTable
            keyField="code"
            rows={topRoutes}
            columns={[
              { key: "code", header: "Route", render: (r) => <span className="text-brand-600 dark:text-brand-100 font-medium">[{r.code}] {r.name}</span> },
              { key: "shipments", header: "Shipments", align: "right" },
            ]}
          />
        </SectionCard>
      </div>
    </div>
  );
}
