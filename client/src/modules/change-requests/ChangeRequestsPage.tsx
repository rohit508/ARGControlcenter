import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { api, ApiClientError } from "../../services/apiClient";
import DataTable from "../../components/data-table/DataTable";

interface ChangeRequest {
  id: number;
  changeCode: string;
  description: string;
  impact: string | null;
  approvalStatus: string;
  status: string;
  workflowInstanceId: number | null;
}

const STATUS_COLOR: Record<string, string> = {
  Pending: "bg-warning-100 text-warning-500",
  Approved: "bg-success-100 text-success-500",
  Rejected: "bg-danger-100 text-danger-500",
};

export default function ChangeRequestsPage() {
  const queryClient = useQueryClient();
  const [busyId, setBusyId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["change-requests"],
    queryFn: () => api.get<{ data: ChangeRequest[] }>("/change-requests"),
  });

  async function submit(id: number) {
    setBusyId(id);
    setError(null);
    try {
      await api.post(`/change-requests/${id}/submit`);
      await queryClient.invalidateQueries({ queryKey: ["change-requests"] });
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Something went wrong");
    } finally {
      setBusyId(null);
    }
  }

  if (isLoading) return <div className="text-slate-400">Loading…</div>;

  return (
    <div>
      <h1 className="text-xl font-semibold mb-4">Change Log</h1>
      {error && <div className="mb-4 text-sm text-danger-500 bg-danger-100 rounded-md px-3 py-2">{error}</div>}
      <DataTable
        keyField="id"
        rows={data!.data}
        columns={[
          { key: "changeCode", header: "Code" },
          { key: "description", header: "Description" },
          { key: "impact", header: "Impact" },
          {
            key: "approvalStatus",
            header: "Approval",
            render: (r) => <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${STATUS_COLOR[r.approvalStatus] || ""}`}>{r.approvalStatus}</span>,
          },
          { key: "status", header: "Status" },
          {
            key: "actions",
            header: "",
            render: (r) =>
              !r.workflowInstanceId ? (
                <button
                  disabled={busyId === r.id}
                  onClick={() => submit(r.id)}
                  className="text-xs px-2 py-1 rounded-md bg-brand-600 text-white disabled:opacity-50"
                >
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
