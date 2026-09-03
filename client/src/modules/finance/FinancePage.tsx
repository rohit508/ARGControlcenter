import { type ReactNode } from "react";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

const recordCounts = [
  ["Air Export Jobs", "8"],
  ["Sea Export Jobs", "10"],
  ["Air Import Jobs", "9"],
  ["Sea Import Jobs", "9"],
  ["Local Invoices", "37"],
  ["Other Charges Payable", "19"],
  ["Invoices To Foreign Agents", "9"],
  ["Credit Notes To Foreign Agents", "5"],
  ["Invoices/Dr. Notes Received From Foreign Agents", "8"],
  ["Credit Notes Received From Foreign Agents", "5"],
  ["Refunds From Shipping Lines", "4"],
  ["Quotations", "8"],
  ["Consignments (C/N)", "12"],
  ["Document Receipts", "8"],
  ["BPV Vouchers", "25"],
  ["BRV Vouchers", "14"],
  ["CPV Vouchers", "19"],
  ["CRV Vouchers", "13"],
  ["JVR Vouchers", "100"],
  ["LVR Vouchers", "2"],
];

const recordCountMap = Object.fromEntries(recordCounts);

const recordGroups = [
  { title: "Freight Jobs", subtitle: "Shipment jobs by transport mode", color: "#2563eb", items: ["Air Export Jobs", "Sea Export Jobs", "Air Import Jobs", "Sea Import Jobs"] },
  { title: "Billing & Agents", subtitle: "Invoices, charges and agent notes", color: "#0f9f95", items: ["Local Invoices", "Other Charges Payable", "Invoices To Foreign Agents", "Credit Notes To Foreign Agents", "Invoices/Dr. Notes Received From Foreign Agents", "Credit Notes Received From Foreign Agents"] },
  { title: "Documents & Quotations", subtitle: "Operational and customer documents", color: "#d97706", items: ["Refunds From Shipping Lines", "Quotations", "Consignments (C/N)", "Document Receipts"] },
  { title: "Voucher Register", subtitle: "Cash, bank and journal vouchers", color: "#7c3aed", items: ["BPV Vouchers", "BRV Vouchers", "CPV Vouchers", "CRV Vouchers", "JVR Vouchers", "LVR Vouchers"] },
];

const summaryTiles = [
  { label: "Jobs This Month", value: "11", note: "9 open in total", accent: "bg-amber-50 text-amber-700", icon: "JB" },
  { label: "Shipments In Transit", value: "18", note: "11 past ETA, not arrived", accent: "bg-sky-50 text-sky-700", icon: "TR", alert: true },
  { label: "Pending Invoices", value: "2", note: "736.0K still in draft", accent: "bg-indigo-50 text-indigo-700", icon: "IN" },
  { label: "Outstanding Receivable", value: "8.49M", note: "Finalised, not yet settled", accent: "bg-rose-50 text-rose-700", icon: "AR" },
  { label: "Gross Profit MTD", value: "2.29M", note: "2.26M revenue - 101.2% margin", accent: "bg-emerald-50 text-emerald-700", icon: "GP", positive: true },
  { label: "Unbilled Jobs", value: "10", note: "No committed sales document yet", accent: "bg-yellow-50 text-yellow-700", icon: "UB" },
];

const laneProfitability = [
  { lane: "KHI-DXB", jobs: 14, margin: 28, revenue: "4.8M" },
  { lane: "LHE-IST", jobs: 11, margin: 24, revenue: "3.9M" },
  { lane: "KHI-HAM", jobs: 9, margin: 19, revenue: "3.1M" },
  { lane: "PQ-RTM", jobs: 7, margin: 16, revenue: "2.4M" },
];

const financeTrend = [
  { month: "Mar", receivable: 1.42, payable: 0.88, net: 0.54 },
  { month: "Apr", receivable: 1.68, payable: 1.04, net: 0.64 },
  { month: "May", receivable: 1.91, payable: 1.11, net: 0.8 },
  { month: "Jun", receivable: 2.08, payable: 1.22, net: 0.86 },
  { month: "Jul", receivable: 2.26, payable: 1.35, net: 0.91 },
  { month: "Aug", receivable: 2.29, payable: 1.28, net: 1.01 },
];

const riskMeters = [
  { label: "Past ETA", value: 61, caption: "11 shipments need follow-up", color: "bg-rose-500" },
  { label: "Draft Billing", value: 35, caption: "2 invoices still pending", color: "bg-amber-500" },
  { label: "Collection Risk", value: 48, caption: "31-45 day bucket is highest", color: "bg-brand-600" },
];

const recordCategoryMix = [
  { name: "Jobs", value: 36, color: "#4f46e5" },
  { name: "Invoices", value: 64, color: "#0f9f95" },
  { name: "Vouchers", value: 173, color: "#d97706" },
  { name: "Documents", value: 32, color: "#0284c7" },
];

const moduleVolume = [
  { name: "Local invoices", count: 37, color: "#4f46e5" },
  { name: "BPV vouchers", count: 25, color: "#0f9f95" },
  { name: "Other charges", count: 19, color: "#d97706" },
  { name: "CPV vouchers", count: 19, color: "#0284c7" },
  { name: "BRV vouchers", count: 14, color: "#e11d48" },
];

const freightModeVolume = [
  { name: "Sea export", jobs: 10, color: "#0f766e" },
  { name: "Air import", jobs: 9, color: "#2563eb" },
  { name: "Sea import", jobs: 9, color: "#7c3aed" },
  { name: "Air export", jobs: 8, color: "#d97706" },
];

type DocumentConfig = {
  title: string;
  countLabel: string;
  searchPlaceholder: string;
  columns: string[];
  rows: string[][];
};

const freightJobs = [
  ["AEJ-2026-0008", "12 Aug 2026", "Guard Rice (Pvt) Ltd", "KHI", "DXB", "MAEU8836738", "Emirates SkyCargo", "Open"],
  ["AEJ-2026-0007", "08 Aug 2026", "Interloop Limited", "LHE", "IST", "TKCU4401299", "Turkish Cargo", "Booked"],
  ["AEJ-2026-0006", "02 Aug 2026", "Nishat Mills Limited", "KHI", "LHR", "QRMA7291054", "Qatar Airways", "Final"],
  ["AEJ-2026-0005", "28 Jul 2026", "Chenab Limited", "ISB", "JED", "SVLU8305521", "Saudia Cargo", "Open"],
];

const seaJobs = [
  ["SEJ-2026-0010", "13 Aug 2026", "Kohinoor Mills Limited", "Karachi", "Jebel Ali", "MSCU8112804", "MSC", "Sailing"],
  ["SEJ-2026-0009", "10 Aug 2026", "Sapphire Textile Mills Ltd", "Port Qasim", "Hamburg", "CMDU4598559", "CMA CGM", "Booked"],
  ["SEJ-2026-0008", "04 Aug 2026", "Al-Karam Textile Mills", "Karachi", "Rotterdam", "COSU1033466", "COSCO", "Final"],
  ["SEJ-2026-0007", "30 Jul 2026", "Guard Rice (Pvt) Ltd", "Karachi", "Singapore", "HLCU4529607", "Hapag-Lloyd", "Arrived"],
];

const invoiceRows = [
  ["SEL-2026-00008", "12 Aug 2026", "Guard Rice (Pvt) Ltd", "0008", "MAEU8836738", "643,500.00", "96,525.00", "740,025.00", "Checked"],
  ["SEL-2026-00007", "06 Aug 2026", "Kohinoor Mills Limited", "0007", "MSCU8112804", "662,500.00", "99,375.00", "761,875.00", "Final"],
  ["SEL-2026-00006", "30 Jul 2026", "Chenab Limited", "0006", "COSU7773634", "339,700.00", "50,955.00", "390,655.00", "Final"],
  ["SEL-2026-00005", "25 Jul 2026", "Sapphire Textile Mills Ltd", "0005", "CMDU4598559", "647,000.00", "97,050.00", "744,050.00", "Final"],
];

const documentConfigs: Record<string, DocumentConfig> = {
  "Air Export Jobs": { title: "Air Export Jobs", countLabel: "jobs", searchPlaceholder: "Search job no, shipper, MAWB, destination...", columns: ["Job No", "Date", "Shipper", "Origin", "Destination", "MAWB No", "Carrier", "Status"], rows: freightJobs },
  "Sea Export Jobs": { title: "Sea Export Jobs", countLabel: "jobs", searchPlaceholder: "Search job no, shipper, MBL, destination...", columns: ["Job No", "Date", "Shipper", "Port", "Destination", "MBL No", "Line", "Status"], rows: seaJobs },
  "Air Import Jobs": { title: "Air Import Jobs", countLabel: "jobs", searchPlaceholder: "Search job no, consignee, MAWB, origin...", columns: ["Job No", "Date", "Consignee", "Origin", "Destination", "MAWB No", "Airline", "Status"], rows: freightJobs.map((r) => [r[0].replace("AEJ", "AIJ"), r[1], r[2], r[4], r[3], r[5], r[6], r[7]]) },
  "Sea Import Jobs": { title: "Sea Import Jobs", countLabel: "jobs", searchPlaceholder: "Search job no, consignee, container, vessel...", columns: ["Job No", "Date", "Consignee", "POL", "POD", "Container No", "Shipping Line", "Status"], rows: seaJobs.map((r) => [r[0].replace("SEJ", "SIJ"), r[1], r[2], r[4], r[3], r[5], r[6], r[7]]) },
  "Local Invoices": { title: "Local Invoices Entry and Printing (Sea-Export)", countLabel: "documents", searchPlaceholder: "Search doc no, reference, master, house...", columns: ["Doc No", "Date", "Party", "Job", "MBL No", "Sub Total", "Tax", "Grand Total", "Status"], rows: invoiceRows },
  "Other Charges Payable": { title: "Other Charges Payable", countLabel: "bills", searchPlaceholder: "Search bill no, vendor, job, charge...", columns: ["Bill No", "Date", "Vendor", "Job", "Charge", "Currency", "Amount", "Status"], rows: [["OCP-2026-0019", "13 Aug 2026", "Karachi Port Trust", "0008", "Port storage", "PKR", "185,000.00", "Pending"], ["OCP-2026-0018", "11 Aug 2026", "QICT", "0007", "Terminal handling", "PKR", "96,500.00", "Approved"], ["OCP-2026-0017", "07 Aug 2026", "Customs Agent", "0006", "Examination", "PKR", "42,000.00", "Pending"]] },
  "Invoices To Foreign Agents": { title: "Invoices To Foreign Agents", countLabel: "documents", searchPlaceholder: "Search invoice no, agent, country...", columns: ["Invoice No", "Date", "Agent", "Country", "Job", "Currency", "Amount", "Status"], rows: [["FAG-INV-0009", "12 Aug 2026", "Blue Ocean Dubai", "UAE", "0008", "USD", "2,450.00", "Final"], ["FAG-INV-0008", "05 Aug 2026", "Euro Cargo GmbH", "Germany", "0007", "EUR", "1,875.00", "Draft"], ["FAG-INV-0007", "29 Jul 2026", "Asia Link Logistics", "Singapore", "0006", "USD", "3,120.00", "Paid"]] },
  "Credit Notes To Foreign Agents": { title: "Credit Notes To Foreign Agents", countLabel: "notes", searchPlaceholder: "Search credit note no, agent, invoice...", columns: ["Credit Note", "Date", "Agent", "Against Invoice", "Reason", "Currency", "Amount", "Status"], rows: [["CNF-2026-0005", "09 Aug 2026", "Blue Ocean Dubai", "FAG-INV-0009", "Rate difference", "USD", "125.00", "Final"], ["CNF-2026-0004", "01 Aug 2026", "Euro Cargo GmbH", "FAG-INV-0008", "Commission", "EUR", "90.00", "Draft"]] },
  "Invoices/Dr. Notes Received From Foreign Agents": { title: "Invoices/Dr. Notes Received From Foreign Agents", countLabel: "documents", searchPlaceholder: "Search debit note, agent, job...", columns: ["Doc No", "Date", "Agent", "Country", "Job", "Currency", "Amount", "Status"], rows: [["DRN-2026-0008", "12 Aug 2026", "Blue Ocean Dubai", "UAE", "0008", "USD", "1,330.00", "Pending"], ["DRN-2026-0007", "04 Aug 2026", "Asia Link Logistics", "Singapore", "0006", "USD", "980.00", "Final"]] },
  "Credit Notes Received From Foreign Agents": { title: "Credit Notes Received From Foreign Agents", countLabel: "notes", searchPlaceholder: "Search received credit note, agent...", columns: ["Credit Note", "Date", "Agent", "Against Doc", "Reason", "Currency", "Amount", "Status"], rows: [["RCN-2026-0005", "10 Aug 2026", "Blue Ocean Dubai", "DRN-2026-0008", "Rebate", "USD", "75.00", "Final"], ["RCN-2026-0004", "28 Jul 2026", "Euro Cargo GmbH", "DRN-2026-0006", "Correction", "EUR", "60.00", "Adjusted"]] },
  "Refunds From Shipping Lines": { title: "Refunds From Shipping Lines", countLabel: "refunds", searchPlaceholder: "Search refund no, line, container...", columns: ["Refund No", "Date", "Shipping Line", "Job", "Container No", "Reason", "Amount", "Status"], rows: [["RSL-2026-0004", "08 Aug 2026", "MSC", "0007", "MSCU8112804", "Deposit refund", "145,000.00", "Received"], ["RSL-2026-0003", "25 Jul 2026", "CMA CGM", "0005", "CMDU4598559", "Overcharge", "88,500.00", "Pending"]] },
  "Quotations": { title: "Quotations", countLabel: "quotations", searchPlaceholder: "Search quote no, customer, lane...", columns: ["Quote No", "Date", "Customer", "Mode", "Lane", "Validity", "Amount", "Status"], rows: [["QTN-2026-0008", "13 Aug 2026", "Guard Rice (Pvt) Ltd", "Sea", "KHI-DXB", "20 Aug 2026", "710,000.00", "Sent"], ["QTN-2026-0007", "11 Aug 2026", "Interloop Limited", "Air", "LHE-IST", "18 Aug 2026", "1,020,000.00", "Accepted"]] },
  "Consignments (C/N)": { title: "Consignments (C/N)", countLabel: "consignments", searchPlaceholder: "Search consignment no, customer, vessel...", columns: ["C/N No", "Date", "Customer", "Mode", "Packages", "Weight", "Reference", "Status"], rows: [["CN-2026-0012", "12 Aug 2026", "Kohinoor Mills Limited", "Sea", "420 CTN", "8,750 KG", "SEJ-0010", "Loaded"], ["CN-2026-0011", "09 Aug 2026", "Nishat Mills Limited", "Air", "75 CTN", "1,180 KG", "AEJ-0006", "Ready"]] },
  "Document Receipts": { title: "Document Receipts", countLabel: "receipts", searchPlaceholder: "Search receipt no, party, document...", columns: ["Receipt No", "Date", "Received From", "Document Type", "Reference", "Received By", "Location", "Status"], rows: [["DCR-2026-0008", "13 Aug 2026", "Guard Rice (Pvt) Ltd", "BL Original", "SEJ-0010", "Adeel", "KHI Office", "Received"], ["DCR-2026-0007", "07 Aug 2026", "Kohinoor Mills Limited", "Invoice", "SEL-0007", "Sana", "LHE Office", "Filed"]] },
};

const voucherConfigs = ["BPV Vouchers", "BRV Vouchers", "CPV Vouchers", "CRV Vouchers", "JVR Vouchers", "LVR Vouchers"].reduce<Record<string, DocumentConfig>>((acc, label) => {
  const code = label.slice(0, 3).toUpperCase();
  acc[label] = {
    title: label,
    countLabel: "vouchers",
    searchPlaceholder: "Search voucher no, account, narration...",
    columns: ["Voucher No", "Date", "Account", "Narration", "Cheque/Ref", "Debit", "Credit", "Status"],
    rows: [[`${code}-2026-0001`, "13 Aug 2026", "HBL Freight Collection", "Freight settlement", "CHQ-18442", "0.00", "740,025.00", "Posted"], [`${code}-2026-0002`, "09 Aug 2026", "Carrier Payables", "Carrier payment", "TRF-44821", "395,000.00", "0.00", "Draft"], [`${code}-2026-0003`, "02 Aug 2026", "Freight Income", "Invoice posting", "SEL-0007", "0.00", "761,875.00", "Posted"]],
  };
  return acc;
}, {});

const allDocumentConfigs = { ...documentConfigs, ...voucherConfigs };

function Panel({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <section className={`rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900 ${className}`}>
      {children}
    </section>
  );
}

function RecordGroupCard({ group }: { group: (typeof recordGroups)[number] }) {
  const values = group.items.map((item) => Number(recordCountMap[item] ?? 0));
  const total = values.reduce((sum, value) => sum + value, 0);
  const maximum = Math.max(...values, 1);

  return (
    <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="flex items-start justify-between gap-3 border-b border-slate-100 px-4 py-3.5 dark:border-slate-800">
        <div>
          <h4 className="text-sm font-bold text-slate-900 dark:text-slate-50">{group.title}</h4>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{group.subtitle}</p>
        </div>
        <div className="text-right">
          <strong className="block text-xl font-black leading-none text-slate-950 dark:text-slate-50">{total}</strong>
          <span className="text-[10px] font-bold uppercase tracking-[.1em] text-slate-500">records</span>
        </div>
      </div>
      <div className="divide-y divide-slate-100 px-4 dark:divide-slate-800">
        {group.items.map((label) => {
          const value = recordCountMap[label] ?? "0";
          const width = `${Math.max((Number(value) / maximum) * 100, 7)}%`;
          return (
            <div key={label} className="grid w-full grid-cols-[minmax(0,1fr)_34px] gap-3 py-2.5">
              <span className="min-w-0">
                <span className="block truncate text-xs font-semibold text-slate-700 dark:text-slate-200">{label}</span>
                <span className="mt-1.5 block h-1.5 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800"><span className="block h-full rounded-full" style={{ width, backgroundColor: group.color }} /></span>
              </span>
              <strong className="self-center text-right text-sm font-black text-slate-900 dark:text-slate-50">{value}</strong>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function SummaryTile({ label, value, note, accent, icon, alert, positive }: (typeof summaryTiles)[number]) {
  return (
    <Panel className="flex min-h-[104px] items-start gap-4 p-4">
      <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-lg text-[10px] font-black ${accent}`}>{icon}</span>
      <div className="min-w-0">
        <p className="text-[11px] font-black uppercase tracking-[.16em] text-slate-500">{label}</p>
        <p className="mt-1 text-2xl font-black leading-none tracking-tight text-slate-950 dark:text-slate-50">{value}</p>
        <p className={`mt-1 text-xs font-semibold ${alert ? "text-danger-500" : positive ? "text-success-500" : "text-slate-500 dark:text-slate-400"}`}>{note}</p>
      </div>
    </Panel>
  );
}

function ChartHeader({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="mb-4">
      <h3 className="text-sm font-bold text-slate-900 dark:text-slate-50">{title}</h3>
      <p className="mt-1 text-xs font-medium text-slate-500 dark:text-slate-400">{subtitle}</p>
    </div>
  );
}

function OperationsAnalytics() {
  const totalRecords = recordCategoryMix.reduce((total, category) => total + category.value, 0);

  return (
    <div className="mb-4 grid grid-cols-1 gap-3 lg:grid-cols-3">
      <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 dark:border-slate-800 dark:bg-slate-950/30">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h4 className="text-sm font-bold text-slate-900 dark:text-slate-50">Record Mix</h4>
            <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">Current operational workload</p>
          </div>
          <span className="rounded-md bg-brand-100 px-2 py-1 text-[10px] font-bold text-brand-700 dark:bg-brand-500/15 dark:text-brand-200">{totalRecords} records</span>
        </div>
        <div className="mt-2 flex items-center gap-4">
          <div className="relative h-[156px] w-[156px] shrink-0">
            <PieChart width={156} height={156}>
              <Pie data={recordCategoryMix} dataKey="value" cx={78} cy={78} innerRadius={46} outerRadius={65} paddingAngle={3} stroke="none">
                {recordCategoryMix.map((category) => <Cell key={category.name} fill={category.color} />)}
              </Pie>
              <Tooltip formatter={(value) => [`${value} records`, ""]} contentStyle={{ borderRadius: 8, border: "1px solid #e2e8f0" }} />
            </PieChart>
            <div className="pointer-events-none absolute inset-0 grid place-items-center text-center">
              <div>
                <strong className="block text-xl font-black leading-none text-slate-950 dark:text-slate-50">{totalRecords}</strong>
                <span className="text-[10px] font-bold uppercase tracking-[.12em] text-slate-500">Total</span>
              </div>
            </div>
          </div>
          <div className="min-w-0 flex-1 space-y-2.5">
            {recordCategoryMix.map((category) => (
              <div key={category.name} className="flex items-center justify-between gap-2 text-xs">
                <span className="flex items-center gap-2 font-semibold text-slate-600 dark:text-slate-300"><i className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: category.color }} />{category.name}</span>
                <strong className="text-slate-950 dark:text-slate-50">{category.value}</strong>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 dark:border-slate-800 dark:bg-slate-950/30">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h4 className="text-sm font-bold text-slate-900 dark:text-slate-50">Highest Activity</h4>
            <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">Top modules by document volume</p>
          </div>
          <span className="text-[11px] font-bold text-slate-500">Aug 2026</span>
        </div>
        <div className="mt-3 h-[156px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={moduleVolume} margin={{ top: 8, right: 0, left: -22, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.16} vertical={false} />
              <XAxis dataKey="name" interval={0} tick={{ fontSize: 9, fill: "#64748b" }} axisLine={false} tickLine={false} />
              <YAxis allowDecimals={false} tick={{ fontSize: 10, fill: "#64748b" }} axisLine={false} tickLine={false} />
              <Tooltip cursor={{ fill: "rgba(79, 70, 229, .06)" }} formatter={(value) => [`${value} records`, ""]} contentStyle={{ borderRadius: 8, border: "1px solid #e2e8f0" }} />
              <Bar dataKey="count" radius={[5, 5, 0, 0]}>
                {moduleVolume.map((module) => <Cell key={module.name} fill={module.color} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 dark:border-slate-800 dark:bg-slate-950/30">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h4 className="text-sm font-bold text-slate-900 dark:text-slate-50">Freight Movement</h4>
            <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">Jobs split by shipment mode</p>
          </div>
          <strong className="text-sm font-black text-slate-900 dark:text-slate-50">36 jobs</strong>
        </div>
        <div className="mt-5 space-y-3.5">
          {freightModeVolume.map((mode) => (
            <div key={mode.name}>
              <div className="mb-1.5 flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-600 dark:text-slate-300">{mode.name}</span>
                <strong className="text-slate-900 dark:text-slate-50">{mode.jobs}</strong>
              </div>
              <div className="h-2.5 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
                <span className="block h-full rounded-full" style={{ width: `${mode.jobs * 10}%`, backgroundColor: mode.color }} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function FreightCharts() {
  return (
    <div className="grid gap-4 xl:grid-cols-12">
      <Panel className="p-5 xl:col-span-4">
        <ChartHeader title="Lane Profitability" subtitle="Ranked by margin and revenue" />
        <div className="space-y-4">
          {laneProfitability.map((lane, index) => (
            <button key={lane.lane} className="group w-full text-left">
              <div className="mb-1.5 flex items-center justify-between gap-3">
                <span className="flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-200"><b className="grid h-6 w-6 place-items-center rounded-md bg-slate-100 text-[10px] text-slate-500 group-hover:bg-brand-100 group-hover:text-brand-700 dark:bg-slate-800 dark:text-slate-300">#{index + 1}</b>{lane.lane}</span>
                <span className="text-xs font-black text-slate-950 dark:text-slate-50">{lane.revenue}</span>
              </div>
              <div className="grid grid-cols-[1fr_44px] items-center gap-3"><span className="h-7 overflow-hidden rounded-md bg-slate-100 dark:bg-slate-800"><span className="flex h-full items-center justify-end rounded-md bg-brand-600 pr-2 text-[10px] font-black text-white" style={{ width: `${lane.margin * 3}%` }}>{lane.margin}%</span></span><span className="text-right text-[11px] font-semibold text-slate-500">{lane.jobs} jobs</span></div>
            </button>
          ))}
        </div>
      </Panel>
      <Panel className="p-5 xl:col-span-5">
        <ChartHeader title="Cash Movement Flow" subtitle="Receivable, payable and net position" />
        <div className="h-[250px]"><ResponsiveContainer width="100%" height="100%"><AreaChart data={financeTrend} margin={{ top: 8, right: 12, left: -18, bottom: 0 }}><CartesianGrid strokeDasharray="3 3" opacity={0.16} vertical={false} /><XAxis dataKey="month" tick={{ fontSize: 11, fill: "#64748b" }} axisLine={false} tickLine={false} /><YAxis tick={{ fontSize: 11, fill: "#64748b" }} axisLine={false} tickLine={false} tickFormatter={(value) => `${value}M`} /><Tooltip formatter={(value) => [`${value}M`, ""]} contentStyle={{ borderRadius: 12, border: "1px solid #e2e8f0" }} /><Area type="monotone" dataKey="receivable" name="Receivable" stroke="#4f46e5" strokeWidth={2.5} fill="#4f46e5" fillOpacity={0.16} /><Area type="monotone" dataKey="payable" name="Payable" stroke="#f59e0b" strokeWidth={2.5} fill="#f59e0b" fillOpacity={0.12} /><Bar dataKey="net" name="Net" fill="#10b981" radius={[5, 5, 0, 0]} barSize={18} /></AreaChart></ResponsiveContainer></div>
      </Panel>
      <Panel className="p-5 xl:col-span-3">
        <ChartHeader title="Operations Pulse" subtitle="Risk meters for today" />
        <div className="space-y-4">{riskMeters.map((meter) => <button key={meter.label} className="w-full rounded-xl border border-slate-200 p-3 text-left hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800/70"><div className="mb-2 flex items-center justify-between"><span className="text-xs font-bold text-slate-700 dark:text-slate-200">{meter.label}</span><strong className="text-sm font-black text-slate-950 dark:text-slate-50">{meter.value}%</strong></div><div className="relative h-3 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800"><span className={`absolute inset-y-0 left-0 rounded-full ${meter.color}`} style={{ width: `${meter.value}%` }} /><span className="absolute inset-y-0 left-[65%] w-px bg-slate-400/60" /></div><p className="mt-2 text-[11px] font-medium text-slate-500 dark:text-slate-400">{meter.caption}</p></button>)}</div>
      </Panel>
    </div>
  );
}

function DocumentListScreen({ label, count, onBack }: { label: string; count: string; onBack: () => void }) {
  const config = allDocumentConfigs[label] ?? {
    title: label,
    countLabel: "records",
    searchPlaceholder: "Search records...",
    columns: ["Doc No", "Date", "Party", "Reference", "Amount", "Status"],
    rows: [["DOC-2026-0001", "13 Aug 2026", "Guard Rice (Pvt) Ltd", "FR-0001", "250,000.00", "Open"]],
  };

  return (
    <div className="mx-auto max-w-[1540px] space-y-4 pb-8 text-slate-800 dark:text-slate-100">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-slate-50">{config.title}</h1>
          <p className="mt-1 text-xs font-medium text-slate-500 dark:text-slate-400">{count} {config.countLabel}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={onBack}
            className="h-9 rounded-md border border-slate-300 bg-white px-4 text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            Back
          </button>
          <button className="h-9 rounded-md border border-slate-300 bg-white px-4 text-xs font-semibold text-slate-600 shadow-sm hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">Export</button>
          <button className="h-9 rounded-md border border-slate-300 bg-white px-4 text-xs font-semibold text-slate-600 shadow-sm hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">Import</button>
        </div>
      </div>

      <Panel className="overflow-hidden">
        <div className="border-b border-slate-200 bg-slate-50/70 px-4 py-3 dark:border-slate-800 dark:bg-slate-800/50">
          <button className="text-sm font-bold text-slate-800 dark:text-slate-100">Detail / Search</button>
        </div>
        <div className="flex flex-wrap gap-2.5 p-4">
          <input className="h-9 w-full max-w-[360px] rounded-md border border-slate-200 bg-white px-3 text-xs font-medium text-slate-700 shadow-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/25 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200" placeholder={config.searchPlaceholder} />
          <input type="date" className="h-9 w-[190px] rounded-md border border-slate-200 bg-white px-3 text-xs font-medium text-slate-700 shadow-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/25 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200" />
          <button className="h-9 rounded-md border border-slate-300 bg-white px-3 text-xs font-semibold text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-300">Filter</button>
        </div>
        <div className="flex gap-2 px-4 pb-4">
          {["All", "Draft", "Final", "Cancelled"].map((tab) => (
            <button key={tab} className={`h-8 rounded-md px-4 text-xs font-semibold ${tab === "All" ? "bg-white text-slate-900 shadow-sm ring-1 ring-slate-200 dark:bg-slate-950 dark:text-slate-50 dark:ring-slate-700" : "text-slate-500 hover:bg-slate-50 dark:text-slate-400 dark:hover:bg-slate-800"}`}>{tab}</button>
          ))}
        </div>
      </Panel>

      <Panel className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1120px] text-left text-xs">
            <thead className="bg-slate-50 text-[10px] uppercase tracking-[.14em] text-slate-500 dark:bg-slate-800/70 dark:text-slate-400">
              <tr>
                {["", ...config.columns, "Actions"].map((head) => (
                  <th key={head} className="px-4 py-3 font-black">{head}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {config.rows.map((row) => (
                <tr key={row[0]} className="bg-white hover:bg-slate-50 dark:bg-slate-900 dark:hover:bg-slate-800/70">
                  <td className="px-4 py-3"><input type="checkbox" className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500/30" /></td>
                  {row.map((cell, index) => (
                    <td key={`${row[0]}-${config.columns[index]}`} className={`px-4 py-3 ${index === 0 ? "font-black text-slate-900 dark:text-slate-50" : index === row.length - 1 ? "" : "font-semibold text-slate-700 dark:text-slate-200"}`}>
                      {index === row.length - 1 ? (
                        <span className={`rounded-full px-2.5 py-1 text-[10px] font-black ${cell === "Checked" || cell === "Open" || cell === "Pending" || cell === "Draft" ? "bg-brand-100 text-brand-700 dark:bg-brand-500/20 dark:text-brand-200" : "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-200"}`}>{cell}</span>
                      ) : cell}
                    </td>
                  ))}
                  <td className="px-4 py-3">
                    <div className="flex gap-1.5">
                      {["Print", "Edit", "Void", "Delete"].map((action) => (
                        <button key={action} className={`h-8 rounded-md border px-3 text-[11px] font-semibold ${action === "Void" || action === "Delete" ? "border-rose-200 text-rose-600 hover:bg-rose-50 dark:border-rose-500/30 dark:text-rose-300 dark:hover:bg-rose-500/10" : "border-slate-200 text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"}`}>
                          {action}
                        </button>
                      ))}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
    </div>
  );
}

export default function FinancePage() {
  return (
    <div className="mx-auto max-w-[1540px] space-y-5 pb-8 text-slate-800 dark:text-slate-100">
      <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
        <div>
          <p className="text-xs font-bold uppercase tracking-[.16em] text-brand-600 dark:text-brand-300">Freight operations</p>
          <h1 className="mt-1 text-[32px] font-bold tracking-tight text-slate-900 dark:text-slate-50">Freight And Finance</h1>
          <p className="mt-1.5 text-[15px] text-slate-500 dark:text-slate-400">Total records for August 2026 - as at 13 Aug 2026</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button className="h-10 rounded-md border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-600 shadow-sm hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800">Email</button>
          <select className="h-10 rounded-md border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 shadow-sm dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200">
            <option>2026-2027</option>
            <option>2025-2026</option>
          </select>
        </div>
      </div>

      <Panel className="p-5">
        <div className="mb-3">
          <h3 className="text-base font-bold text-slate-900 dark:text-slate-50">Total Records</h3>
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Records per module</p>
        </div>

        <div className="mb-4 overflow-x-auto rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-[0_1px_4px_rgba(15,23,42,.04)] dark:border-slate-800 dark:bg-slate-900">
          <div className="flex min-w-max items-end gap-2.5">
            <label className="block w-[170px] shrink-0">
              <span className="text-[10px] font-black uppercase tracking-[.18em] text-slate-500 dark:text-slate-400">Branch</span>
              <select className="mt-1 h-9 w-full rounded-md border border-slate-200 bg-white px-3 text-xs font-medium text-slate-700 shadow-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/25 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200">
                <option>All</option>
                <option>Karachi</option>
                <option>Lahore</option>
                <option>Islamabad</option>
              </select>
            </label>
            <label className="block w-[170px] shrink-0">
              <span className="text-[10px] font-black uppercase tracking-[.18em] text-slate-500 dark:text-slate-400">Starting Date</span>
              <input type="date" className="mt-1 h-9 w-full rounded-md border border-slate-200 bg-white px-3 text-xs font-medium text-slate-700 shadow-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/25 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200" />
            </label>
            <label className="block w-[170px] shrink-0">
              <span className="text-[10px] font-black uppercase tracking-[.18em] text-slate-500 dark:text-slate-400">Ending Date</span>
              <input type="date" className="mt-1 h-9 w-full rounded-md border border-slate-200 bg-white px-3 text-xs font-medium text-slate-700 shadow-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/25 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200" />
            </label>
            <button className="h-9 shrink-0 rounded-md bg-brand-600 px-5 text-xs font-semibold text-white shadow-sm hover:bg-brand-700">Apply</button>
            <button className="h-9 shrink-0 rounded-md border border-slate-200 bg-white px-5 text-xs font-semibold text-slate-600 shadow-sm hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-300 dark:hover:bg-slate-800">Show Detail</button>
            <button className="h-9 shrink-0 rounded-md border border-slate-200 bg-white px-5 text-xs font-semibold text-slate-600 shadow-sm hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-300 dark:hover:bg-slate-800">Clear</button>
          </div>
        </div>

        <OperationsAnalytics />

        <div className="grid gap-4 lg:grid-cols-2 2xl:grid-cols-4">
          {recordGroups.map((group) => (
            <RecordGroupCard key={group.title} group={group} />
          ))}
        </div>
      </Panel>

      <FreightCharts />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-6">
        {summaryTiles.map((tile) => (
          <SummaryTile key={tile.label} {...tile} />
        ))}
      </div>
    </div>
  );
}
