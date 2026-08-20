import { RefObject, useEffect, useRef, useState } from "react";
import { useAssignmentComments, useAddComment } from "./useEmployeeTasks";
import { ApiClientError } from "../../services/apiClient";
import { useAuthStore } from "../../store/authStore";

type SpeechRecognitionLike = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start: () => void;
  stop: () => void;
  onresult: ((e: any) => void) | null;
  onerror: ((e: any) => void) | null;
  onend: (() => void) | null;
};

function getSpeechRecognitionCtor(): (new () => SpeechRecognitionLike) | null {
  const w = window as any;
  return w.SpeechRecognition || w.webkitSpeechRecognition || null;
}

// Dictates speech directly into the comment textarea via the browser's Web Speech API — no
// audio is recorded/uploaded, only the live transcript text is appended to `body`.
function VoiceDictationButton({ onTranscript }: { onTranscript: (text: string) => void }) {
  const [listening, setListening] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const supported = !!getSpeechRecognitionCtor();

  function startListening() {
    setError(null);
    const Ctor = getSpeechRecognitionCtor();
    if (!Ctor) {
      setError("Voice dictation isn't supported in this browser.");
      return;
    }
    const recognition = new Ctor();
    recognition.continuous = true;
    recognition.interimResults = false;
    recognition.lang = "en-US";
    recognition.onresult = (e) => {
      let finalText = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        if (e.results[i].isFinal) finalText += e.results[i][0].transcript;
      }
      if (finalText.trim()) onTranscript(finalText.trim());
    };
    recognition.onerror = (e) => {
      setError(e.error === "not-allowed" ? "Microphone access denied." : "Voice dictation error.");
      setListening(false);
    };
    recognition.onend = () => setListening(false);
    recognitionRef.current = recognition;
    recognition.start();
    setListening(true);
  }

  function stopListening() {
    recognitionRef.current?.stop();
    setListening(false);
  }

  return (
    <div className="flex items-center gap-2">
      {!listening ? (
        <button
          type="button"
          onClick={startListening}
          disabled={!supported}
          title={supported ? "Dictate a comment" : "Voice dictation isn't supported in this browser"}
          className="shrink-0 w-8 h-8 flex items-center justify-center rounded-full border border-slate-300 dark:border-slate-700 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-50"
        >
          🎤
        </button>
      ) : (
        <button
          type="button"
          onClick={stopListening}
          title="Stop listening"
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
  const addComment = useAddComment();
  const currentUserEmail = useAuthStore((s) => s.user?.email);
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

  function appendTranscript(text: string) {
    setBody((prev) => (prev.trim() ? `${prev.trim()} ${text}` : text));
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
            <VoiceDictationButton onTranscript={appendTranscript} />
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="text-sm text-slate-400">Loading activity…</div>
      ) : data?.data.length ? (
        <div className="space-y-5">
          {[...data.data].reverse().map((c) => (
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
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-sm text-slate-400 py-4">No activity yet.</div>
      )}
    </div>
  );
}
