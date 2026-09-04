import { ReactNode, useEffect } from "react";
import { createPortal } from "react-dom";

interface Props {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  footer?: ReactNode;
  widthClassName?: string;
}

// Portal-rendered so the overlay escapes AppShell's overflow-y-auto <main> region and always
// covers the full viewport regardless of scroll position.
export default function Modal({ open, onClose, title, children, footer, widthClassName = "max-w-lg" }: Props) {
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
      <div className="absolute inset-0 bg-slate-950/45 backdrop-blur-[3px]" onClick={onClose} />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={`relative flex w-full ${widthClassName} max-h-[90vh] flex-col overflow-hidden rounded-2xl border border-white/80 bg-white shadow-[0_28px_80px_rgba(15,23,42,.28)]`}
      >
        <div className="h-1 shrink-0 bg-gradient-to-r from-[#082650] via-blue-600 to-teal-400" />
        <div className="flex items-center justify-between border-b border-slate-200/80 bg-gradient-to-r from-white via-slate-50/70 to-teal-50/50 px-6 py-4">
          <h2 className="text-base font-bold tracking-tight text-slate-900">{title}</h2>
          <button
            onClick={onClose}
            aria-label="Close"
            className="grid h-9 w-9 place-items-center rounded-xl text-xl leading-none text-slate-400 transition-all hover:bg-rose-50 hover:text-rose-600 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-rose-500/15"
          >
            ✕
          </button>
        </div>
        <div className="min-h-0 overflow-y-auto bg-slate-50/35 px-6 py-5">{children}</div>
        {footer && <div className="flex justify-end gap-2 border-t border-slate-200/80 bg-white px-6 py-3">{footer}</div>}
      </div>
    </div>,
    document.body
  );
}
