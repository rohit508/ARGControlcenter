import { useQuery } from "@tanstack/react-query";
import { api } from "../services/apiClient";
import DataTable from "../components/data-table/DataTable";

interface Column {
  key: string;
  header: string;
  render?: (row: any) => React.ReactNode;
}

interface Props {
  title: string;
  endpoint: string;
  columns: Column[];
}

export default function SimpleListPage({ title, endpoint, columns }: Props) {
  const { data, isLoading, error } = useQuery({
    queryKey: [endpoint],
    queryFn: () => api.get<{ data: any[] }>(endpoint),
  });

  if (isLoading) return <div className="text-slate-400">Loading {title.toLowerCase()}…</div>;
  if (error) return <div className="text-danger-500">{(error as Error).message}</div>;

  return (
    <div>
      <h1 className="text-xl font-semibold mb-4">{title}</h1>
      <DataTable keyField="id" rows={data!.data} columns={columns} />
    </div>
  );
}
