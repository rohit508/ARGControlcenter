import { useState } from "react";
import Modal from "../../components/ui/Modal";

interface Props {
  open: boolean;
  taskTitle: string | undefined;
  busy?: boolean;
  onConfirm: (reason: string) => void;
  onCancel: () => void;
}

// ConfirmDialog has no text-input slot, so task deletion (which requires a reason) uses this
// dedicated dialog built directly on Modal instead.
export default function DeleteTaskDialog({ open, taskTitle, busy, onConfirm, onCancel }: Props) {
  const [reason, setReason] = useState("");

  function handleCancel() {
    setReason("");
    onCancel();
  }

  function handleConfirm() {
    if (!reason.trim()) return;
    onConfirm(reason.trim());
    setReason("");
  }

  return (
    <Modal
      open={open}
      onClose={handleCancel}
      title="Delete Task"
      widthClassName="max-w-sm"
      footer={
        <>
          <button
            onClick={handleCancel}
            className="text-sm px-3 py-1.5 rounded-md border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={busy || !reason.trim()}
            className="text-sm px-3 py-1.5 rounded-md text-white disabled:opacity-50 bg-danger-500 hover:bg-danger-500/90"
          >
            {busy ? "Working…" : "Delete"}
          </button>
        </>
      }
    >
      <p className="text-sm text-slate-600 dark:text-slate-300 mb-3">
        Delete "{taskTitle}"? This cannot be undone. A reason is required and will be recorded in the deleted tasks history.
      </p>
      <textarea
        autoFocus
        rows={3}
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        placeholder="Reason for deleting this task…"
        className="w-full rounded-md border border-slate-300 dark:border-slate-700 bg-transparent px-3 py-2 text-sm"
      />
    </Modal>
  );
}
