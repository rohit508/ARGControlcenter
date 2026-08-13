import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api, ApiClientError } from "../../services/apiClient";

interface LookupList {
  id: number;
  code: string;
  label: string;
  values: { id: number; value: string; sortOrder: number }[];
}

export default function AdminConfigPage() {
  const queryClient = useQueryClient();
  const [newValues, setNewValues] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["config", "lookups"],
    queryFn: () => api.get<{ data: LookupList[] }>("/config/lookups"),
  });

  async function addValue(code: string) {
    const value = newValues[code]?.trim();
    if (!value) return;
    setError(null);
    try {
      await api.post(`/config/lookups/${code}/values`, { value });
      setNewValues((v) => ({ ...v, [code]: "" }));
      await queryClient.invalidateQueries({ queryKey: ["config", "lookups"] });
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Something went wrong");
    }
  }

  if (isLoading) return <div className="text-slate-400">Loading configuration…</div>;

  return (
    <div>
      <h1 className="text-xl font-semibold mb-1">Configuration</h1>
      <p className="text-sm text-slate-400 mb-4">
        Every dropdown in the system reads from these lists — add a value here and it's instantly available everywhere that list is used, exactly like the workbook's Configuration sheet, but validated server-side instead of by convention.
      </p>
      {error && <div className="mb-4 text-sm text-danger-500 bg-danger-100 rounded-md px-3 py-2">{error}</div>}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {data!.data.map((list) => (
          <div key={list.code} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-4">
            <h2 className="text-sm font-semibold mb-2 capitalize">{list.label}</h2>
            <ul className="text-sm space-y-1 mb-3">
              {list.values.map((v) => (
                <li key={v.id} className="text-slate-600 dark:text-slate-300">
                  {v.value}
                </li>
              ))}
            </ul>
            <div className="flex gap-2">
              <input
                className="flex-1 text-sm rounded-md border border-slate-300 dark:border-slate-700 bg-transparent px-2 py-1"
                placeholder="Add value…"
                value={newValues[list.code] || ""}
                onChange={(e) => setNewValues((v) => ({ ...v, [list.code]: e.target.value }))}
                onKeyDown={(e) => e.key === "Enter" && addValue(list.code)}
              />
              <button onClick={() => addValue(list.code)} className="text-xs px-2 py-1 rounded-md bg-brand-600 text-white">
                Add
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
