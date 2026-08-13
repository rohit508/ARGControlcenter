import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { api, ApiClientError } from "../../services/apiClient";
import DataTable from "../../components/data-table/DataTable";

interface Ticket {
  id: number;
  ticketCode: string;
  subject: string;
  priority: string;
  status: string;
  slaStatus: "Within SLA" | "Breached" | "Met";
}

const SLA_COLOR: Record<string, string> = {
  "Within SLA": "bg-success-100 text-success-500",
  Met: "bg-success-100 text-success-500",
  Breached: "bg-danger-100 text-danger-500",
};

export default function HelpDeskPage() {
  const queryClient = useQueryClient();
  const [busyId, setBusyId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["tickets", "with-sla"],
    queryFn: () => api.get<{ data: Ticket[]; meta: { breached: number } }>("/tickets/with-sla"),
  });

  async function resolve(id: number) {
    setBusyId(id);
    setError(null);
    try {
      await api.post(`/tickets/${id}/resolve`);
      await queryClient.invalidateQueries({ queryKey: ["tickets", "with-sla"] });
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Something went wrong");
    } finally {
      setBusyId(null);
    }
  }

  if (isLoading) return <div className="text-slate-400">Loading tickets…</div>;

  return (
    <div>
      <h1 className="text-xl font-semibold mb-1">Help Desk</h1>
      <p className="text-sm text-slate-400 mb-4">{data!.meta.breached} ticket(s) currently breaching SLA — computed live from creation time + SLA hours, not a manually-set flag.</p>
      {error && <div className="mb-4 text-sm text-danger-500 bg-danger-100 rounded-md px-3 py-2">{error}</div>}
      <DataTable
        keyField="id"
        rows={data!.data}
        columns={[
          { key: "ticketCode", header: "Code" },
          { key: "subject", header: "Subject" },
          { key: "priority", header: "Priority" },
          { key: "status", header: "Status" },
          { key: "slaStatus", header: "SLA", render: (r) => <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${SLA_COLOR[r.slaStatus]}`}>{r.slaStatus}</span> },
          {
            key: "actions",
            header: "",
            render: (r) =>
              r.status !== "Resolved" && r.status !== "Closed" ? (
                <button disabled={busyId === r.id} onClick={() => resolve(r.id)} className="text-xs px-2 py-1 rounded-md bg-brand-600 text-white disabled:opacity-50">
                  Resolve
                </button>
              ) : null,
          },
        ]}
      />
    </div>
  );
}
