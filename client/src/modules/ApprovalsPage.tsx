import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { api, ApiClientError } from "../services/apiClient";

interface PendingWorkflow {
  id: number;
  entityType: string;
  entityId: number;
  currentStep: number;
  stepName: string;
  approverRole: string;
}

export default function ApprovalsPage() {
  const queryClient = useQueryClient();
  const [busyId, setBusyId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["workflows", "pending"],
    queryFn: () => api.get<{ data: PendingWorkflow[] }>("/workflows/pending"),
  });

  async function act(instanceId: number, action: "approve" | "reject") {
    setBusyId(instanceId);
    setError(null);
    try {
      await api.post(`/workflows/${instanceId}/act`, { action });
      await queryClient.invalidateQueries({ queryKey: ["workflows", "pending"] });
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Something went wrong");
    } finally {
      setBusyId(null);
    }
  }

  if (isLoading) return <div className="text-slate-400">Loading approvals…</div>;
  const items = data!.data;

  return (
    <div>
      <h1 className="text-xl font-semibold mb-1">My Approvals</h1>
      <p className="text-sm text-slate-400 mb-4">Items waiting on a role you hold. This inbox is driven entirely by the workflow engine's step configuration.</p>
      {error && <div className="mb-4 text-sm text-danger-500 bg-danger-100 rounded-md px-3 py-2">{error}</div>}
      {items.length === 0 ? (
        <div className="text-sm text-slate-400 py-8 text-center border border-dashed border-slate-300 dark:border-slate-700 rounded-lg">Nothing pending your approval.</div>
      ) : (
        <div className="space-y-2">
          {items.map((item) => (
            <div key={item.id} className="flex items-center justify-between bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-4">
              <div>
                <div className="text-sm font-medium">
                  {item.entityType} #{item.entityId} — {item.stepName}
                </div>
                <div className="text-xs text-slate-400">Step {item.currentStep} · requires {item.approverRole}</div>
              </div>
              <div className="flex gap-2">
                <button
                  disabled={busyId === item.id}
                  onClick={() => act(item.id, "approve")}
                  className="text-sm px-3 py-1.5 rounded-md bg-success-500 text-white disabled:opacity-50"
                >
                  Approve
                </button>
                <button
                  disabled={busyId === item.id}
                  onClick={() => act(item.id, "reject")}
                  className="text-sm px-3 py-1.5 rounded-md bg-danger-500 text-white disabled:opacity-50"
                >
                  Reject
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
