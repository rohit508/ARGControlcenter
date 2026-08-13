import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { api, ApiClientError } from "../../services/apiClient";
import DataTable from "../../components/data-table/DataTable";

interface PurchaseOrder {
  id: number;
  poNumber: string;
  vendorId: number;
  status: string;
  totalAmount: number;
  orderDate: string;
  workflowInstanceId: number | null;
}

const STATUS_COLOR: Record<string, string> = {
  Draft: "bg-slate-100 text-slate-500",
  Submitted: "bg-warning-100 text-warning-500",
  Approved: "bg-success-100 text-success-500",
  Rejected: "bg-danger-100 text-danger-500",
};

export default function PurchaseOrdersPage() {
  const queryClient = useQueryClient();
  const [busyId, setBusyId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["purchase-orders"],
    queryFn: () => api.get<{ data: PurchaseOrder[] }>("/purchase-orders"),
  });

  async function submit(id: number) {
    setBusyId(id);
    setError(null);
    try {
      await api.post(`/purchase-orders/${id}/submit`);
      await queryClient.invalidateQueries({ queryKey: ["purchase-orders"] });
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Something went wrong");
    } finally {
      setBusyId(null);
    }
  }

  if (isLoading) return <div className="text-slate-400">Loading purchase orders…</div>;

  return (
    <div>
      <h1 className="text-xl font-semibold mb-4">Purchase Orders</h1>
      {error && <div className="mb-4 text-sm text-danger-500 bg-danger-100 rounded-md px-3 py-2">{error}</div>}
      <DataTable
        keyField="id"
        rows={data!.data}
        columns={[
          { key: "poNumber", header: "PO Number" },
          { key: "orderDate", header: "Order Date" },
          { key: "totalAmount", header: "Total", render: (r) => r.totalAmount.toLocaleString() },
          {
            key: "status",
            header: "Status",
            render: (r) => <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${STATUS_COLOR[r.status] || ""}`}>{r.status}</span>,
          },
          {
            key: "actions",
            header: "",
            render: (r) =>
              !r.workflowInstanceId ? (
                <button disabled={busyId === r.id} onClick={() => submit(r.id)} className="text-xs px-2 py-1 rounded-md bg-brand-600 text-white disabled:opacity-50">
                  Submit for Approval
                </button>
              ) : (
                <span className="text-xs text-slate-400">In workflow</span>
              ),
          },
        ]}
      />
    </div>
  );
}
