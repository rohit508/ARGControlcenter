import { Cell, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { ReactNode } from "react";

const money = new Intl.NumberFormat("en-PK", { maximumFractionDigits: 0 });

const kpis = [
  { label: "Total Cash & Bank Balance", value: "Rs 24,567,891", note: "+8.6% vs last month", tone: "bg-emerald-50 text-emerald-700", icon: "CB" },
  { label: "Receivables", value: "Rs 12,435,678", note: "Rs 1,935,678 overdue", tone: "bg-blue-50 text-blue-700", icon: "AR" },
  { label: "Payables", value: "Rs 8,765,432", note: "Rs 1,245,432 due", tone: "bg-orange-50 text-orange-700", icon: "AP" },
  { label: "Current Month Expense", value: "Rs 7,654,322", note: "-4.2% vs last month", tone: "bg-cyan-50 text-cyan-700", icon: "EX" },
  { label: "Trial Balance Status", value: "Balanced", note: "As on May 31, 2025", tone: "bg-violet-50 text-violet-700", icon: "TB" },
];

const cashFlow = [
  { month: "Dec", inflow: 120, outflow: 82, net: 38 },
  { month: "Jan", inflow: 158, outflow: 112, net: 46 },
  { month: "Feb", inflow: 188, outflow: 126, net: 62 },
  { month: "Mar", inflow: 228, outflow: 121, net: 107 },
  { month: "Apr", inflow: 249, outflow: 141, net: 108 },
  { month: "May", inflow: 214, outflow: 101, net: 113 },
];

const accountSummary = [
  { name: "Assets", value: 34567891, color: "#22C55E" },
  { name: "Liabilities", value: 14523450, color: "#2F80ED" },
  { name: "Equity", value: 8765432, color: "#8B5CF6" },
  { name: "Income", value: 6543210, color: "#14A6A6" },
  { name: "Expenses", value: 3445228, color: "#F59E0B" },
];

const vouchers = [
  ["Journal Voucher", "128", "Rs 21,543,210", "JV"],
  ["Payment Voucher", "243", "Rs 17,532,891", "PV"],
  ["Receipt Voucher", "186", "Rs 20,564,321", "RV"],
  ["Vendor Bill Payment", "152", "Rs 11,245,678", "VB"],
];

const approvals = [
  ["Petty Cash Request", "12", "Rs 135,680", "3 days"],
  ["Petty Cash Spent", "18", "Rs 78,450", "4 days"],
  ["Vendor Bill Payment", "27", "Rs 435,210", "6 days"],
];

const masters = [
  "Fiscal Year",
  "Bank Setup",
  "Bank Account Setup",
  "Currency Setup",
  "Account Type Setup",
  "Account Nature Setup",
  "Book Type Setup",
  "Party Type Setup",
  "Chart of Accounts",
  "Bank Group",
  "Bank Account",
];

const ledgerRows = [
  ["1001-000", "Cash in Hand", "Asset", "Rs 1,240,000", "Open"],
  ["1010-001", "HBL Main Account", "Bank", "Rs 8,860,500", "Open"],
  ["2100-001", "Vendor Payables", "Liability", "Rs 4,950,200", "Review"],
  ["4000-010", "Fee Income", "Income", "Rs 16,780,000", "Posted"],
];

function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <section className={`rounded-lg border border-slate-200/90 bg-white p-4 shadow-[0_3px_12px_rgba(15,23,42,.045)] ${className}`}>{children}</section>;
}

function Header({ title, action, right }: { title: string; action?: string; right?: string }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <h2 className="text-sm font-bold text-slate-800">{title}</h2>
      {right && <button className="rounded-md border border-slate-200 px-2.5 py-1 text-[11px] font-medium text-slate-600">{right}</button>}
      {action && <button className="text-xs font-semibold text-blue-600">{action}</button>}
    </div>
  );
}

function StatCard({ label, value, note, tone, icon }: (typeof kpis)[number]) {
  return (
    <Card className="flex min-h-[118px] items-center gap-3">
      <span className={`grid h-12 w-12 shrink-0 place-items-center rounded-full text-xs font-black ${tone}`}>{icon}</span>
      <div className="min-w-0">
        <p className="truncate text-xs font-semibold text-slate-600">{label}</p>
        <p className="mt-1 text-2xl font-bold tracking-tight text-slate-900">{value}</p>
        <p className="mt-1 text-xs text-slate-500">{note}</p>
      </div>
    </Card>
  );
}

function Shortcut({ label, index }: { label: string; index: number }) {
  const tones = ["text-emerald-700 bg-emerald-50", "text-blue-700 bg-blue-50", "text-cyan-700 bg-cyan-50", "text-violet-700 bg-violet-50", "text-orange-700 bg-orange-50"];
  return (
    <button className="min-h-[98px] rounded-lg border border-slate-200 bg-white p-3 text-center transition hover:-translate-y-0.5 hover:border-emerald-300 hover:shadow-md">
      <span className={`mx-auto grid h-10 w-10 place-items-center rounded-lg text-xs font-black ${tones[index % tones.length]}`}>{label.split(" ").map((w) => w[0]).join("").slice(0, 3)}</span>
      <span className="mt-3 block text-xs font-semibold text-slate-700">{label}</span>
    </button>
  );
}

export default function FinancePage() {
  const totalSummary = accountSummary.reduce((sum, row) => sum + row.value, 0);

  return (
    <div className="mx-auto max-w-[1540px] space-y-3.5 pb-6 text-slate-800">
      <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
        <div>
          <p className="text-xs font-bold uppercase tracking-[.16em] text-emerald-600">Financial Management</p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-900">Finance Dashboard</h1>
          <p className="mt-1 text-sm text-slate-500">Cash, vouchers, approvals, masters and ledger readiness in one view.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button className="rounded-lg bg-emerald-600 px-3.5 py-2 text-sm font-semibold text-white shadow-sm">+ Create Voucher</button>
          <button className="rounded-lg border border-emerald-200 bg-white px-3.5 py-2 text-sm font-semibold text-emerald-700">Bank Reconciliation</button>
          <button className="rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-sm font-medium text-slate-700">Chart of Accounts</button>
          <button className="rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-sm font-medium text-slate-700">Export</button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5">
        {kpis.map((kpi) => <StatCard key={kpi.label} {...kpi} />)}
      </div>

      <div className="grid grid-cols-1 gap-3 xl:grid-cols-12">
        <Card className="xl:col-span-5">
          <Header title="Cash Flow Trend" right="Last 6 Months" />
          <div className="mt-3 flex flex-wrap gap-4 text-xs text-slate-500">
            <span><i className="mr-2 inline-block h-2 w-5 rounded-full bg-emerald-500" />Cash Inflow</span>
            <span><i className="mr-2 inline-block h-2 w-5 rounded-full bg-red-500" />Cash Outflow</span>
            <span><i className="mr-2 inline-block h-2 w-5 rounded-full bg-blue-500" />Net Cash Flow</span>
          </div>
          <div className="h-[265px] pt-3">
            <ResponsiveContainer>
              <LineChart data={cashFlow} margin={{ top: 10, right: 12, left: -18, bottom: 0 }}>
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#64748B" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: "#64748B" }} axisLine={false} tickLine={false} />
                <Tooltip formatter={(value) => [`Rs ${value} lakh`, ""]} />
                <Line type="monotone" dataKey="inflow" stroke="#22C55E" strokeWidth={2.5} dot={{ r: 3 }} />
                <Line type="monotone" dataKey="outflow" stroke="#EF4444" strokeWidth={2.5} dot={{ r: 3 }} />
                <Line type="monotone" dataKey="net" stroke="#2F80ED" strokeWidth={2.5} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="xl:col-span-4">
          <Header title="Account Balance Summary" right="By Account Type" />
          <div className="mt-4 grid gap-3 sm:grid-cols-[190px_1fr]">
            <div className="relative h-[210px]">
              <ResponsiveContainer>
                <PieChart>
                  <Pie data={accountSummary} dataKey="value" innerRadius={58} outerRadius={86} paddingAngle={1} stroke="none">
                    {accountSummary.map((entry) => <Cell key={entry.name} fill={entry.color} />)}
                  </Pie>
                  <Tooltip formatter={(value) => [`Rs ${money.format(Number(value))}`, ""]} />
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                <span className="text-xs text-slate-500">Total</span>
                <strong className="text-lg">Rs {money.format(totalSummary)}</strong>
              </div>
            </div>
            <div className="space-y-2 self-center">
              {accountSummary.map((row) => (
                <div className="grid grid-cols-[1fr_auto] gap-2 text-xs" key={row.name}>
                  <span className="flex items-center gap-2 text-slate-600"><i className="h-2.5 w-2.5 rounded-full" style={{ background: row.color }} />{row.name}</span>
                  <b className="text-right">Rs {money.format(row.value)}</b>
                </div>
              ))}
            </div>
          </div>
        </Card>

        <Card className="xl:col-span-3">
          <Header title="Voucher Activity" action="View all" />
          <div className="mt-3 overflow-x-auto">
            <table className="w-full min-w-[360px] text-left text-xs">
              <thead className="border-b border-slate-100 text-slate-500">
                <tr><th className="pb-2 font-medium">Voucher Type</th><th className="pb-2 text-right font-medium">Count</th><th className="pb-2 text-right font-medium">Amount</th></tr>
              </thead>
              <tbody>
                {vouchers.map(([type, count, amount, code]) => (
                  <tr key={type} className="border-b border-slate-50 last:border-0">
                    <td className="py-3"><span className="flex items-center gap-2"><b className="grid h-7 w-7 place-items-center rounded-md bg-slate-100 text-[10px] text-slate-600">{code}</b>{type}</span></td>
                    <td className="py-3 text-right font-semibold">{count}</td>
                    <td className="py-3 text-right text-slate-700">{amount}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-3 rounded-md bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-900">Total activity: 709 vouchers</div>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-3 xl:grid-cols-12">
        <Card className="xl:col-span-4">
          <Header title="Pending Approvals" action="View all" />
          <div className="mt-3 overflow-x-auto">
            <table className="w-full min-w-[430px] text-left text-xs">
              <thead className="border-b border-slate-100 text-slate-500">
                <tr><th className="pb-2 font-medium">Request Type</th><th className="pb-2 text-right font-medium">Count</th><th className="pb-2 text-right font-medium">Pending Amount</th><th className="pb-2 text-right font-medium">Oldest</th></tr>
              </thead>
              <tbody>
                {approvals.map(([type, count, amount, oldest]) => (
                  <tr key={type} className="border-b border-slate-50 last:border-0">
                    <td className="py-3 font-medium">{type}</td>
                    <td className="py-3 text-right font-bold text-orange-600">{count}</td>
                    <td className="py-3 text-right">{amount}</td>
                    <td className="py-3 text-right text-slate-500">{oldest}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        <Card className="xl:col-span-5">
          <Header title="Setup & Masters" />
          <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
            {masters.map((label, index) => <Shortcut key={label} label={label} index={index} />)}
          </div>
        </Card>

        <Card className="xl:col-span-3">
          <Header title="Ledger Health" right="Current Fiscal Year" />
          <div className="mt-3 grid grid-cols-3 gap-2">
            <Mini label="Posted" value="94%" className="bg-emerald-50 text-emerald-800" />
            <Mini label="Draft" value="31" className="bg-blue-50 text-blue-800" />
            <Mini label="Exceptions" value="7" className="bg-rose-50 text-rose-800" />
          </div>
          <div className="mt-4 space-y-3">
            {ledgerRows.map(([code, name, type, balance, status]) => (
              <div className="grid grid-cols-[1fr_auto] gap-2 border-b border-slate-100 pb-2 text-xs last:border-0" key={code}>
                <span><b className="block text-slate-800">{name}</b><small className="text-slate-500">{code} - {type}</small></span>
                <span className="text-right"><b className="block">{balance}</b><small className={status === "Review" ? "text-orange-600" : "text-emerald-600"}>{status}</small></span>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}

function Mini({ label, value, className }: { label: string; value: string; className: string }) {
  return (
    <div className={`rounded-md p-2.5 ${className}`}>
      <p className="text-[10px] font-medium">{label}</p>
      <p className="mt-1 text-lg font-bold">{value}</p>
    </div>
  );
}
