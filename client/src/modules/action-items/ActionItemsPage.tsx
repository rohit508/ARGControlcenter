import { useQuery } from "@tanstack/react-query";
import { api } from "../../services/apiClient";
import DataTable from "../../components/data-table/DataTable";

interface ActionItemWithMeeting {
  id: number;
  actionCode: string;
  description: string;
  status: string;
  dueDate: string | null;
  meetingCode: string | null;
  meetingDate: string | null;
}

const STATUS_COLOR: Record<string, string> = {
  Open: "bg-warning-100 text-warning-500",
  "In Progress": "bg-brand-100 text-brand-600",
  Completed: "bg-success-100 text-success-500",
  Overdue: "bg-danger-100 text-danger-500",
};

export default function ActionItemsPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["action-items", "with-meeting-context"],
    queryFn: () => api.get<{ data: ActionItemWithMeeting[] }>("/action-items/with-meeting-context"),
  });

  if (isLoading) return <div className="text-slate-400">Loading action items…</div>;

  return (
    <div>
      <h1 className="text-xl font-semibold mb-1">Action Tracker</h1>
      <p className="text-sm text-slate-400 mb-4">Meeting date is resolved live from the Meeting Log by Meeting ID — never duplicated onto the action row.</p>
      <DataTable
        keyField="id"
        rows={data!.data}
        columns={[
          { key: "actionCode", header: "Code" },
          { key: "description", header: "Action" },
          { key: "meetingCode", header: "Meeting", render: (r) => r.meetingCode || "—" },
          { key: "meetingDate", header: "Meeting Date", render: (r) => r.meetingDate || "—" },
          { key: "dueDate", header: "Due Date" },
          {
            key: "status",
            header: "Status",
            render: (r) => <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${STATUS_COLOR[r.status] || ""}`}>{r.status}</span>,
          },
        ]}
      />
    </div>
  );
}
