import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { api } from "../../services/apiClient";
import { Project } from "../../types";
import DataTable from "../../components/data-table/DataTable";
import HealthBadge from "../../components/data-table/HealthBadge";

export default function ProjectsListPage() {
  const navigate = useNavigate();
  const { data, isLoading, error } = useQuery({
    queryKey: ["projects"],
    queryFn: () => api.get<{ data: Project[] }>("/projects"),
  });

  if (isLoading) return <div className="text-slate-400">Loading projects…</div>;
  if (error) return <div className="text-danger-500">{(error as Error).message}</div>;

  return (
    <div>
      <h1 className="text-xl font-semibold mb-4">Projects</h1>
      <DataTable
        keyField="id"
        rows={data!.data}
        onRowClick={(row) => navigate(`/projects/${row.id}`)}
        columns={[
          { key: "projectCode", header: "Code" },
          { key: "name", header: "Name" },
          { key: "status", header: "Status" },
          { key: "priority", header: "Priority" },
          { key: "healthCache", header: "Health", render: (r) => <HealthBadge value={r.healthCache} /> },
          { key: "progressPctCache", header: "Progress", render: (r) => `${(r.progressPctCache * 100).toFixed(0)}%` },
          { key: "budget", header: "Budget", render: (r) => r.budget.toLocaleString() },
          { key: "spiCache", header: "SPI", render: (r) => r.spiCache.toFixed(2) },
          { key: "cpiCache", header: "CPI", render: (r) => r.cpiCache.toFixed(2) },
        ]}
      />
    </div>
  );
}
