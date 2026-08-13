import { useQuery } from "@tanstack/react-query";
import { api } from "../../services/apiClient";
import DataTable from "../../components/data-table/DataTable";

interface TrialBalanceRow {
  accountId: number;
  accountCode: string;
  name: string;
  type: string;
  debit: number;
  credit: number;
  balance: number;
}

export default function FinancePage() {
  const { data, isLoading } = useQuery({
    queryKey: ["finance", "trial-balance"],
    queryFn: () => api.get<{ data: TrialBalanceRow[] }>("/finance/trial-balance"),
  });

  if (isLoading) return <div className="text-slate-400">Loading trial balance…</div>;
  const rows = data!.data;
  const totalDebit = rows.reduce((s, r) => s + r.debit, 0);
  const totalCredit = rows.reduce((s, r) => s + r.credit, 0);

  return (
    <div>
      <h1 className="text-xl font-semibold mb-1">Finance — Trial Balance</h1>
      <p className="text-sm text-slate-400 mb-4">
        Every journal entry behind these balances is double-entry validated server-side — an entry that doesn't balance is rejected before it ever reaches the ledger.
      </p>
      <DataTable
        keyField="accountId"
        rows={rows}
        columns={[
          { key: "accountCode", header: "Code" },
          { key: "name", header: "Account" },
          { key: "type", header: "Type" },
          { key: "debit", header: "Debit", render: (r) => r.debit.toLocaleString() },
          { key: "credit", header: "Credit", render: (r) => r.credit.toLocaleString() },
          { key: "balance", header: "Balance", render: (r) => r.balance.toLocaleString() },
        ]}
      />
      <div className="mt-3 text-sm text-slate-500">
        Total Debits: <strong>{totalDebit.toLocaleString()}</strong> · Total Credits: <strong>{totalCredit.toLocaleString()}</strong>
        {totalDebit === totalCredit ? <span className="text-success-500 ml-2">✓ Balanced</span> : <span className="text-danger-500 ml-2">✗ Out of balance</span>}
      </div>
    </div>
  );
}
