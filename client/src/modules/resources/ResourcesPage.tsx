import { useQuery } from "@tanstack/react-query";
import { api } from "../../services/apiClient";
import DataTable from "../../components/data-table/DataTable";

interface Resource {
  id: number;
  fullName: string;
  roleTitle: string | null;
  departmentName: string | null;
  costRate: number | null;
  capacityHoursPerMonth: number;
  allocatedHours: number;
  utilizationPct: number;
  activeTaskCount: number;
  overallocated: boolean;
}

export default function ResourcesPage() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["resources"],
    queryFn: () => api.get<{ data: Resource[]; meta: { month: string } }>("/resources"),
  });

  if (isLoading) return <div className="text-slate-400">Loading resources…</div>;
  if (error) return <div className="text-danger-500">{(error as Error).message}</div>;

  return (
    <div>
      <h1 className="text-xl font-semibold mb-1">Resource Management</h1>
      <p className="text-sm text-slate-400 mb-4">Utilization for {data!.meta.month} — hours are computed only for the portion of each task that falls in this month.</p>
      <DataTable
        keyField="id"
        rows={data!.data}
        columns={[
          { key: "fullName", header: "Name" },
          { key: "roleTitle", header: "Role" },
          { key: "departmentName", header: "Department" },
          { key: "activeTaskCount", header: "Active Tasks" },
          { key: "allocatedHours", header: "Allocated Hrs", render: (r) => r.allocatedHours.toFixed(0) },
          { key: "capacityHoursPerMonth", header: "Capacity Hrs" },
          {
            key: "utilizationPct",
            header: "Utilization",
            render: (r) => (
              <span className={r.overallocated ? "text-danger-500 font-semibold" : ""}>
                {(r.utilizationPct * 100).toFixed(0)}%{r.overallocated ? " ⚠" : ""}
              </span>
            ),
          },
        ]}
      />
    </div>
  );
}
