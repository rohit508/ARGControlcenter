import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import DataTable from "../../components/data-table/DataTable";
import { PriorityBadge } from "../../components/ui/Badge";
import { useDeletedEmployeeTasks } from "./useEmployeeTasks";
import { formatDateTime } from "../../utils/formatDateTime";
import { DeletedEmployeeTask } from "../../types";

const POPOVER_WIDTH = 256;

// Click-to-toggle popover anchored to the notes icon — keeps the grid narrow (no wide Reason
// column forcing horizontal scroll) while the full reason text stays one click away. Portal'd to
// <body> with fixed positioning (same escape-the-container trick as Modal.tsx) so it isn't
// clipped by the table's own overflow-x-auto wrapper, and closes on scroll rather than drifting
// out of place relative to its anchor button.
function ReasonNote({ reason }: { reason: string }) {
  const [open, setOpen] = useState(false);
  const [coords, setCoords] = useState({ top: 0, left: 0 });
  const buttonRef = useRef<HTMLButtonElement>(null);

  function toggle() {
    if (!open && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setCoords({ top: rect.bottom + 4, left: Math.min(rect.right - POPOVER_WIDTH, window.innerWidth - POPOVER_WIDTH - 8) });
    }
    setOpen((v) => !v);
  }

  useEffect(() => {
    if (!open) return;
    const close = () => setOpen(false);
    window.addEventListener("scroll", close, true);
    window.addEventListener("resize", close);
    return () => {
      window.removeEventListener("scroll", close, true);
      window.removeEventListener("resize", close);
    };
  }, [open]);

  return (
    <>
      <button
        ref={buttonRef}
        onClick={toggle}
        title="View reason"
        className="w-7 h-7 inline-flex items-center justify-center rounded-md text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
      >
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M14 3v4a1 1 0 0 0 1 1h4" />
          <path d="M17 21H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h7l5 5v11a2 2 0 0 1-2 2Z" />
          <path d="M9 13h6" />
          <path d="M9 17h6" />
        </svg>
      </button>
      {open &&
        createPortal(
          <>
            <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
            <div
              style={{ top: coords.top, left: coords.left, width: POPOVER_WIDTH }}
              className="fixed z-50 rounded-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-lg p-3 text-xs text-slate-600 dark:text-slate-300 whitespace-normal"
            >
              {reason}
            </div>
          </>,
          document.body
        )}
    </>
  );
}

export default function DeletedTasksPage() {
  const navigate = useNavigate();
  const { data, isLoading } = useDeletedEmployeeTasks();

  if (isLoading) return <div className="text-slate-400">Loading…</div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-xl font-semibold">Deleted Tasks</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">History of deleted tasks — who deleted them, when, and why.</p>
        </div>
        <button
          onClick={() => navigate("/employee-tasks")}
          className="text-sm px-3 py-1.5 rounded-md border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800"
        >
          Back to Task Board
        </button>
      </div>

      <DataTable
        keyField="id"
        rows={data?.data ?? []}
        emptyMessage="No deleted tasks."
        columns={[
          { key: "taskCode", header: "Code" },
          { key: "title", header: "Title" },
          { key: "departmentName", header: "Department" },
          { key: "priority", header: "Priority", render: (r) => <PriorityBadge priority={r.priority} /> },
          { key: "assignedTo", header: "Assigned To" },
          { key: "deletedByName", header: "Deleted By" },
          { key: "deletedAt", header: "Deleted At", render: (r) => formatDateTime(r.deletedAt) },
          { key: "reason", header: "Reason", render: (r: DeletedEmployeeTask) => <ReasonNote reason={r.reason} /> },
        ]}
      />
    </div>
  );
}
