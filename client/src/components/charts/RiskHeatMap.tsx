import { useQuery } from "@tanstack/react-query";
import { api } from "../../services/apiClient";

function cellColor(count: number): string {
  if (count === 0) return "bg-slate-50 dark:bg-slate-800 text-slate-300";
  if (count === 1) return "bg-warning-100 text-warning-500";
  return "bg-danger-100 text-danger-500";
}

export default function RiskHeatMap({ projectId }: { projectId?: number }) {
  const { data, isLoading } = useQuery({
    queryKey: ["risks", "heatmap", projectId],
    queryFn: () => api.get<{ data: number[][] }>(`/risks/heatmap${projectId ? `?projectId=${projectId}` : ""}`),
  });

  if (isLoading) return <div className="text-slate-400 text-sm">Loading heat map…</div>;
  const matrix = data!.data; // matrix[probability-1][impact-1]

  return (
    <div className="inline-block">
      <div className="text-xs text-slate-400 mb-2">Rows = Probability (1-5, bottom to top) · Columns = Impact (1-5)</div>
      <table className="border-collapse">
        <tbody>
          {[4, 3, 2, 1, 0].map((probIdx) => (
            <tr key={probIdx}>
              <td className="text-xs text-slate-400 pr-2 text-right">{probIdx + 1}</td>
              {[0, 1, 2, 3, 4].map((impIdx) => (
                <td key={impIdx} className={`w-12 h-12 text-center border border-white dark:border-slate-950 font-semibold ${cellColor(matrix[probIdx][impIdx])}`}>
                  {matrix[probIdx][impIdx] || ""}
                </td>
              ))}
            </tr>
          ))}
          <tr>
            <td />
            {[1, 2, 3, 4, 5].map((n) => (
              <td key={n} className="text-xs text-slate-400 text-center pt-1">
                {n}
              </td>
            ))}
          </tr>
        </tbody>
      </table>
    </div>
  );
}
