import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { api, ApiClientError } from "../../services/apiClient";
import DataTable from "../../components/data-table/DataTable";

interface ProductionOrder {
  id: number;
  orderCode: string;
  bomId: number;
  quantityPlanned: number;
  quantityCompleted: number;
  status: string;
}

export default function ManufacturingPage() {
  const queryClient = useQueryClient();
  const [busyId, setBusyId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["manufacturing", "production-orders"],
    queryFn: () => api.get<{ data: ProductionOrder[] }>("/manufacturing/production-orders"),
  });

  async function complete(id: number, quantityPlanned: number) {
    setBusyId(id);
    setError(null);
    try {
      await api.post(`/manufacturing/production-orders/${id}/complete`, { quantity: quantityPlanned });
      await queryClient.invalidateQueries({ queryKey: ["manufacturing", "production-orders"] });
      await queryClient.invalidateQueries({ queryKey: ["inventory", "items"] });
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Something went wrong");
    } finally {
      setBusyId(null);
    }
  }

  if (isLoading) return <div className="text-slate-400">Loading production orders…</div>;

  return (
    <div>
      <h1 className="text-xl font-semibold mb-1">Production Orders</h1>
      <p className="text-sm text-slate-400 mb-4">Completing an order explodes its BOM — consumes components and receives finished goods against the real inventory ledger.</p>
      {error && <div className="mb-4 text-sm text-danger-500 bg-danger-100 rounded-md px-3 py-2">{error}</div>}
      <DataTable
        keyField="id"
        rows={data!.data}
        columns={[
          { key: "orderCode", header: "Order" },
          { key: "quantityPlanned", header: "Planned" },
          { key: "quantityCompleted", header: "Completed" },
          { key: "status", header: "Status" },
          {
            key: "actions",
            header: "",
            render: (r) =>
              r.status !== "Completed" ? (
                <button disabled={busyId === r.id} onClick={() => complete(r.id, r.quantityPlanned)} className="text-xs px-2 py-1 rounded-md bg-brand-600 text-white disabled:opacity-50">
                  Complete
                </button>
              ) : (
                <span className="text-xs text-slate-400">Done</span>
              ),
          },
        ]}
      />
    </div>
  );
}
