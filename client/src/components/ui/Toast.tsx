import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

interface Props {
  open: boolean;
  onClose: () => void;
  title: string;
  message: string;
  icon?: string;
  durationMs?: number;
}

// Portal-rendered, bottom-right, auto-dismissing toast — separate from NotificationBell's
// dropdown (which is a persistent, on-demand summary). This is the one-shot "you just logged
// in, here's what's waiting for you" nudge.
export default function Toast({ open, onClose, title, message, icon = "🔔", durationMs = 6000 }: Props) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!open) return;
    const showTimer = setTimeout(() => setVisible(true), 10);
    const hideTimer = setTimeout(() => setVisible(false), durationMs);
    const closeTimer = setTimeout(onClose, durationMs + 300);
    return () => {
      clearTimeout(showTimer);
      clearTimeout(hideTimer);
      clearTimeout(closeTimer);
    };
  }, [open, durationMs, onClose]);

  if (!open) return null;

  return createPortal(
    <div className="fixed bottom-5 right-5 z-[60]">
      <div
        className={`flex items-start gap-3 w-80 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl p-4 transition-all duration-300 ${
          visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2"
        }`}
      >
        <span className="w-9 h-9 rounded-lg bg-teal-100 dark:bg-teal-500/15 text-teal-600 dark:text-teal-300 flex items-center justify-center text-lg shrink-0" aria-hidden>
          {icon}
        </span>
        <div className="min-w-0 flex-1">
          <div className="text-sm font-semibold text-slate-800 dark:text-slate-100">{title}</div>
          <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{message}</div>
        </div>
        <button
          onClick={() => {
            setVisible(false);
            setTimeout(onClose, 300);
          }}
          aria-label="Dismiss"
          className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-sm leading-none shrink-0"
        >
          ✕
        </button>
      </div>
    </div>,
    document.body
  );
}
