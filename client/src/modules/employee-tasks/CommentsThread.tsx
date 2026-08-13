import { KeyboardEvent, useState } from "react";
import { useAssignmentComments, useAddComment } from "./useEmployeeTasks";
import { ApiClientError } from "../../services/apiClient";

// This component is used inside StatusUpdateModal's <form id="status-form">, so its own posting
// control is deliberately NOT a <form> (nested forms are invalid HTML and made the outer form's
// Enter-to-submit behavior ambiguous) — a button click / Enter keypress calls submit() directly.
export default function CommentsThread({ assignmentId }: { assignmentId: number }) {
  const { data, isLoading } = useAssignmentComments(assignmentId);
  const addComment = useAddComment();
  const [body, setBody] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    if (!body.trim()) return;
    setError(null);
    try {
      await addComment.mutateAsync({ assignmentId, body: body.trim() });
      setBody("");
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Could not add comment");
    }
  }

  return (
    <div>
      <div className="text-sm font-medium mb-2">Comments</div>
      {isLoading ? (
        <div className="text-xs text-slate-400">Loading…</div>
      ) : (
        <div className="space-y-2 max-h-40 overflow-y-auto mb-3">
          {data?.data.length ? (
            data.data.map((c) => (
              <div key={c.id} className="text-xs bg-slate-50 dark:bg-slate-800 rounded-md px-2 py-1.5">
                <div className="flex justify-between text-slate-400 mb-0.5">
                  <span>{c.userEmail}</span>
                  <span>{new Date(c.createdAt).toLocaleString()}</span>
                </div>
                <div className="text-slate-700 dark:text-slate-200">{c.body}</div>
              </div>
            ))
          ) : (
            <div className="text-xs text-slate-400">No comments yet.</div>
          )}
        </div>
      )}
      {error && <div className="mb-2 text-xs text-danger-500 bg-danger-100 rounded-md px-2 py-1">{error}</div>}
      <div className="flex gap-2">
        <input
          className="flex-1 rounded-md border border-slate-300 dark:border-slate-700 bg-transparent px-2 py-1.5 text-xs"
          placeholder="Add a comment…"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          onKeyDown={(e: KeyboardEvent<HTMLInputElement>) => {
            if (e.key === "Enter") {
              e.preventDefault();
              submit();
            }
          }}
        />
        <button
          type="button"
          onClick={submit}
          disabled={addComment.isPending || !body.trim()}
          className="text-xs px-3 py-1.5 rounded-md bg-brand-600 text-white disabled:opacity-50"
        >
          Post
        </button>
      </div>
    </div>
  );
}
