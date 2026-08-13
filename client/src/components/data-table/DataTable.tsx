interface Column<T> {
  key: string;
  header: string;
  render?: (row: T) => React.ReactNode;
}

interface Props<T> {
  columns: Column<T>[];
  rows: T[];
  keyField: keyof T;
  onRowClick?: (row: T) => void;
  emptyMessage?: string;
}

export default function DataTable<T extends Record<string, any>>({ columns, rows, keyField, onRowClick, emptyMessage }: Props<T>) {
  if (rows.length === 0) {
    return <div className="text-sm text-slate-400 py-8 text-center border border-dashed border-slate-300 dark:border-slate-700 rounded-lg">{emptyMessage || "No records found"}</div>;
  }
  return (
    <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-lg">
      <table className="min-w-full text-sm">
        <thead className="bg-brand-600 text-white">
          <tr>
            {columns.map((c) => (
              <th key={c.key} className="text-left font-semibold px-3 py-2 whitespace-nowrap">
                {c.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
          {rows.map((row) => (
            <tr
              key={String(row[keyField])}
              onClick={() => onRowClick?.(row)}
              className={`bg-white dark:bg-slate-900 ${onRowClick ? "cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800" : ""}`}
            >
              {columns.map((c) => (
                <td key={c.key} className="px-3 py-2 whitespace-nowrap">
                  {c.render ? c.render(row) : row[c.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
