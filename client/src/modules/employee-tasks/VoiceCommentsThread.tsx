import { KeyboardEvent, RefObject, useEffect, useRef, useState } from "react";
import { useAssignmentComments, useAddComment, useAssignmentAttachments } from "./useEmployeeTasks";
import { uploadFile, fetchAttachmentBlobUrl } from "../../services/uploadClient";
import { useQueryClient } from "@tanstack/react-query";
import { ApiClientError } from "../../services/apiClient";
import { useAuthStore } from "../../store/authStore";
import { Attachment } from "../../types";

function AudioPlayer({ attachmentId }: { attachmentId: number }) {
  const [src, setSrc] = useState<string | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let objectUrl: string | null = null;
    let cancelled = false;
    fetchAttachmentBlobUrl(attachmentId)
      .then((url) => {
        if (cancelled) {
          URL.revokeObjectURL(url);
          return;
        }
        objectUrl = url;
        setSrc(url);
      })
      .catch(() => !cancelled && setError(true));
    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [attachmentId]);

  if (error) return <div className="text-xs text-danger-500">Could not load voice note.</div>;
  if (!src) return <div className="text-xs text-slate-400">Loading voice note…</div>;
  return <audio controls src={src} className="h-9 max-w-full" preload="metadata" />;
}

// Records a short voice note in-browser (MediaRecorder), uploads it as an attachment scoped to
// this ticket's comment thread (entityType "employee-task-assignment"), and links it to the
// comment it was posted alongside via commentId — see server/attachments.routes.ts.
function VoiceRecorderButton({ assignmentId, onPosted }: { assignmentId: number; onPosted: () => void }) {
  const [recording, setRecording] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const addComment = useAddComment();

  async function startRecording() {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = MediaRecorder.isTypeSupported("audio/webm") ? "audio/webm" : "";
      const recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
      chunksRef.current = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      recorder.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
      };
      mediaRecorderRef.current = recorder;
      recorder.start();
      setRecording(true);
    } catch {
      setError("Microphone access denied or unavailable.");
    }
  }

  async function stopAndSend() {
    const recorder = mediaRecorderRef.current;
    if (!recorder) return;
    setRecording(false);
    setBusy(true);
    setError(null);

    const blob: Blob = await new Promise((resolve) => {
      recorder.addEventListener(
        "stop",
        () => resolve(new Blob(chunksRef.current, { type: recorder.mimeType || "audio/webm" })),
        { once: true }
      );
      recorder.stop();
    });

    try {
      // A comment row anchors the voice note in the thread (so it renders inline, ordered by
      // createdAt like any other message) — body is empty since the audio carries the content.
      const commentRes = await addComment.mutateAsync({ assignmentId, body: "" });
      const commentId = commentRes.data.id;
      const ext = blob.type.includes("webm") ? "webm" : "audio";
      const file = new File([blob], `voice-note-${Date.now()}.${ext}`, { type: blob.type });
      await uploadFile(`/attachments?entityType=employee-task-assignment&entityId=${assignmentId}&commentId=${commentId}`, file);
      onPosted();
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Could not send voice note");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex items-center gap-2">
      {!recording ? (
        <button
          type="button"
          onClick={startRecording}
          disabled={busy}
          title="Record a voice note"
          className="shrink-0 w-8 h-8 flex items-center justify-center rounded-full border border-slate-300 dark:border-slate-700 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-50"
        >
          {busy ? "…" : "🎤"}
        </button>
      ) : (
        <button
          type="button"
          onClick={stopAndSend}
          title="Stop and send"
          className="shrink-0 w-8 h-8 flex items-center justify-center rounded-full bg-danger-500 text-white animate-pulse"
        >
          ■
        </button>
      )}
      {error && <span className="text-xs text-danger-500">{error}</span>}
    </div>
  );
}

function initials(email: string): string {
  const name = email.split("@")[0];
  return name.slice(0, 2).toUpperCase();
}

// Jira-style activity feed: a vertical list of comments (each with an avatar, author, timestamp),
// not chat bubbles — matches the "Add comment" convention this page's header button opens into.
export default function VoiceCommentsThread({ assignmentId, composerRef }: { assignmentId: number; composerRef?: RefObject<HTMLTextAreaElement> }) {
  const { data, isLoading } = useAssignmentComments(assignmentId);
  const { data: attachmentsData } = useAssignmentAttachments(assignmentId);
  const addComment = useAddComment();
  const queryClient = useQueryClient();
  const currentUserEmail = useAuthStore((s) => s.user?.email);
  const [body, setBody] = useState("");
  const [error, setError] = useState<string | null>(null);

  const attachmentsByComment = new Map<number, Attachment[]>();
  if (attachmentsData) {
    for (const att of attachmentsData.data) {
      if (att.commentId == null) continue;
      const list = attachmentsByComment.get(att.commentId) ?? [];
      list.push(att);
      attachmentsByComment.set(att.commentId, list);
    }
  }

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

  function refreshAttachments() {
    queryClient.invalidateQueries({ queryKey: ["employee-tasks", "attachments", assignmentId] });
  }

  return (
    <div>
      <div className="flex items-start gap-3 mb-6">
        <span className="shrink-0 w-8 h-8 rounded-full bg-brand-600 text-white text-xs font-semibold flex items-center justify-center">
          {initials(currentUserEmail ?? "?")}
        </span>
        <div className="flex-1">
          <textarea
            ref={composerRef}
            className="w-full resize-none rounded-md border border-slate-300 dark:border-slate-700 bg-transparent px-3 py-2 text-sm"
            placeholder="Add a comment…"
            rows={2}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            onKeyDown={(e: KeyboardEvent<HTMLTextAreaElement>) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                submit();
              }
            }}
          />
          {error && <div className="mt-1.5 text-xs text-danger-500 bg-danger-100 rounded-md px-2 py-1">{error}</div>}
          <div className="mt-2 flex items-center gap-2">
            <button
              type="button"
              onClick={submit}
              disabled={addComment.isPending || !body.trim()}
              className="text-sm px-3 py-1.5 rounded-md bg-brand-600 hover:bg-brand-700 text-white disabled:opacity-50"
            >
              Comment
            </button>
            <VoiceRecorderButton assignmentId={assignmentId} onPosted={refreshAttachments} />
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="text-sm text-slate-400">Loading activity…</div>
      ) : data?.data.length ? (
        <div className="space-y-5">
          {[...data.data].reverse().map((c) => {
            const voiceNotes = attachmentsByComment.get(c.id) ?? [];
            return (
              <div key={c.id} className="flex items-start gap-3">
                <span className="shrink-0 w-8 h-8 rounded-full bg-slate-300 dark:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold flex items-center justify-center">
                  {initials(c.userEmail)}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="text-xs mb-1">
                    <span className="font-medium text-slate-700 dark:text-slate-200">{c.userEmail}</span>{" "}
                    <span className="text-slate-400">{new Date(c.createdAt).toLocaleString()}</span>
                  </div>
                  <div className="bg-slate-50 dark:bg-slate-800 rounded-lg rounded-tl-sm px-3 py-2 text-sm text-slate-700 dark:text-slate-200">
                    {c.body && <div className="whitespace-pre-wrap break-words">{c.body}</div>}
                    {voiceNotes.map((att) => (
                      <div key={att.id} className={c.body ? "mt-1.5" : ""}>
                        <AudioPlayer attachmentId={att.id} />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="text-sm text-slate-400 py-4">No activity yet.</div>
      )}
    </div>
  );
}
