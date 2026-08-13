import { useQuery } from "@tanstack/react-query";
import { api } from "../../services/apiClient";
import DataTable from "../../components/data-table/DataTable";

interface AssetRow {
  id: number;
  assetCode: string;
  name: string;
  category: string | null;
  purchaseCost: number;
  accumulatedDepreciation: number;
  netBookValue: number;
  status: string;
}

export default function AssetsPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["assets", "register"],
    queryFn: () => api.get<{ data: AssetRow[]; meta: { totalCost: number; totalNetBookValue: number } }>("/assets/register"),
  });

  if (isLoading) return <div className="text-slate-400">Loading assets…</div>;

  return (
    <div>
      <h1 className="text-xl font-semibold mb-1">Asset Register</h1>
      <p className="text-sm text-slate-400 mb-4">Straight-line depreciation, computed live from purchase date — not a static field someone has to remember to update.</p>
      <DataTable
        keyField="id"
        rows={data!.data}
        columns={[
          { key: "assetCode", header: "Code" },
          { key: "name", header: "Asset" },
          { key: "category", header: "Category" },
          { key: "purchaseCost", header: "Cost", render: (r) => r.purchaseCost.toLocaleString() },
          { key: "accumulatedDepreciation", header: "Accum. Depreciation", render: (r) => r.accumulatedDepreciation.toLocaleString() },
          { key: "netBookValue", header: "Net Book Value", render: (r) => r.netBookValue.toLocaleString() },
          { key: "status", header: "Status" },
        ]}
      />
      <div className="mt-3 text-sm text-slate-500">
        Portfolio: <strong>{data!.meta.totalCost.toLocaleString()}</strong> total cost · <strong>{data!.meta.totalNetBookValue.toLocaleString()}</strong> net book value
      </div>
    </div>
  );
}
