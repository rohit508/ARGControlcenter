import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { api } from "../../services/apiClient";
import { Project, Task, Risk } from "../../types";
import DataTable from "../../components/data-table/DataTable";
import HealthBadge from "../../components/data-table/HealthBadge";
import RiskHeatMap from "../../components/charts/RiskHeatMap";
import GanttChart from "../../components/charts/GanttChart";

const TABS = ["Overview", "Tasks", "Gantt", "Risks"] as const;

export default function ProjectDetailPage() {
  const { id } = useParams();
  const [tab, setTab] = useState<(typeof TABS)[number]>("Overview");

  const { data: projectRes, isLoading } = useQuery({
    queryKey: ["projects", id],
    queryFn: () => api.get<{ data: Project }>(`/projects/${id}`),
  });
  const { data: tasksRes } = useQuery({
    queryKey: ["tasks", { projectId: id }],
    queryFn: () => api.get<{ data: Task[] }>(`/tasks?projectId=${id}`),
    enabled: tab === "Tasks",
  });
  const { data: risksRes } = useQuery({
    queryKey: ["risks", { projectId: id }],
    queryFn: () => api.get<{ data: Risk[] }>(`/risks?projectId=${id}`),
    enabled: tab === "Risks",
  });

  if (isLoading) return <div className="text-slate-400">Loading…</div>;
  const p = projectRes!.data;

  return (
    <div>
      <Link to="/projects" className="text-sm text-brand-500 hover:underline">
        ← Projects
      </Link>
      <div className="flex items-center gap-3 mt-1 mb-4">
        <h1 className="text-xl font-semibold">{p.name}</h1>
        <HealthBadge value={p.healthCache} />
        <span className="text-xs text-slate-400">{p.projectCode}</span>
      </div>

      <div className="flex gap-2 mb-4">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-3 py-1.5 text-sm rounded-md ${tab === t ? "bg-brand-600 text-white" : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300"}`}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === "Overview" && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Stat label="Budget" value={p.budget.toLocaleString()} />
          <Stat label="Actual Cost" value={p.actualCostCache.toLocaleString()} />
          <Stat label="Progress" value={`${(p.progressPctCache * 100).toFixed(1)}%`} />
          <Stat label="SPI" value={p.spiCache.toFixed(2)} />
          <Stat label="CPI" value={p.cpiCache.toFixed(2)} />
          <Stat label="Risk Score" value={p.riskScoreCache.toFixed(1)} />
          <Stat label="Status" value={p.status} />
          <Stat label="Priority" value={p.priority} />
        </div>
      )}

      {tab === "Tasks" && tasksRes && (
        <DataTable
          keyField="id"
          rows={tasksRes.data}
          columns={[
            { key: "taskCode", header: "Code" },
            { key: "name", header: "Name" },
            { key: "status", header: "Status" },
            { key: "progressPct", header: "Progress", render: (r) => `${(r.progressPct * 100).toFixed(0)}%` },
            { key: "healthCache", header: "Health", render: (r) => <HealthBadge value={r.healthCache} /> },
            { key: "isCriticalCache", header: "Critical", render: (r) => (r.isCriticalCache ? "Yes" : "No") },
          ]}
        />
      )}

      {tab === "Gantt" && <GanttChart projectId={Number(id)} />}

      {tab === "Risks" && risksRes && (
        <>
          <div className="mb-4">
            <RiskHeatMap projectId={Number(id)} />
          </div>
          <DataTable
            keyField="id"
            rows={risksRes.data}
            columns={[
              { key: "riskCode", header: "Code" },
              { key: "category", header: "Category" },
              { key: "description", header: "Description" },
              { key: "riskScoreCache", header: "Score" },
              { key: "status", header: "Status" },
            ]}
          />
        </>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-3">
      <div className="text-xs text-slate-400">{label}</div>
      <div className="text-lg font-semibold">{value}</div>
    </div>
  );
}
