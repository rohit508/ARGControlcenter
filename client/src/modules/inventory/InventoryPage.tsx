import { useQuery } from "@tanstack/react-query";
import { api } from "../../services/apiClient";
import DataTable from "../../components/data-table/DataTable";

interface StockItem {
  id: number;
  sku: string;
  name: string;
  category: string | null;
  reorderPoint: number;
  standardCost: number;
  totalOnHand: number;
  belowReorderPoint: boolean;
}

export default function InventoryPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["inventory", "items"],
    queryFn: () => api.get<{ data: StockItem[] }>("/inventory/items"),
  });

  if (isLoading) return <div className="text-slate-400">Loading inventory…</div>;

  return (
    <div>
      <h1 className="text-xl font-semibold mb-4">Inventory</h1>
      <DataTable
        keyField="id"
        rows={data!.data}
        columns={[
          { key: "sku", header: "SKU" },
          { key: "name", header: "Item" },
          { key: "category", header: "Category" },
          { key: "totalOnHand", header: "On Hand" },
          { key: "reorderPoint", header: "Reorder Point" },
          {
            key: "belowReorderPoint",
            header: "Status",
            render: (r) =>
              r.belowReorderPoint ? (
                <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-danger-100 text-danger-500">Reorder needed</span>
              ) : (
                <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-success-100 text-success-500">OK</span>
              ),
          },
        ]}
      />
    </div>
  );
}
