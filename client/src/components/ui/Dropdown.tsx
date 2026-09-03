import { type ReactNode, useEffect, useRef, useState } from "react";

export type DropdownOption = {
  value: string;
  label: string;
  description?: string;
};

type DropdownProps = {
  value: string;
  options: DropdownOption[];
  onChange: (value: string) => void;
  menuLabel: string;
  icon?: ReactNode;
  ariaLabel: string;
  align?: "left" | "right";
  className?: string;
};

export default function Dropdown({
  value,
  options,
  onChange,
  menuLabel,
  icon,
  ariaLabel,
  align = "left",
  className = "",
}: DropdownProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const selected = options.find((option) => option.value === value);

  useEffect(() => {
    const closeOnOutsideClick = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };

    document.addEventListener("mousedown", closeOnOutsideClick);
    window.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("mousedown", closeOnOutsideClick);
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, []);

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <button
        type="button"
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
        className={`group inline-flex h-12 w-full items-center gap-2 rounded-xl border bg-white px-3.5 text-sm font-semibold text-slate-700 shadow-[0_2px_6px_rgba(15,23,42,.04)] outline-none transition-all duration-200 hover:-translate-y-px hover:border-teal-400 hover:bg-teal-50/60 hover:text-teal-700 hover:shadow-[0_8px_18px_rgba(15,118,110,.12)] hover:ring-4 hover:ring-teal-500/10 focus:outline-none focus-visible:ring-4 focus-visible:ring-teal-500/20 active:translate-y-0 active:scale-[.985] ${open ? "border-teal-500 bg-teal-50/60 text-teal-700 shadow-[0_8px_18px_rgba(15,118,110,.12)] ring-4 ring-teal-500/10" : "border-slate-200"}`}
      >
        {icon && (
          <span
            className={`grid h-6 w-6 shrink-0 place-items-center rounded-lg text-[11px] transition-colors ${open ? "bg-teal-100 text-teal-700" : "bg-slate-100 text-slate-500 group-hover:bg-teal-100 group-hover:text-teal-700"}`}
          >
            {icon}
          </span>
        )}
        <span className="min-w-0 flex-1 truncate text-left">
          {selected?.label ?? value}
        </span>
        <svg
          className={`h-4 w-4 shrink-0 text-slate-400 transition-transform duration-200 ${open ? "rotate-180 text-teal-600" : ""}`}
          viewBox="0 0 16 16"
          fill="none"
          aria-hidden="true"
        >
          <path
            d="m4 6 4 4 4-4"
            stroke="currentColor"
            strokeWidth="1.75"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>

      {open && (
        <div
          className={`absolute top-full z-50 mt-2 w-full overflow-hidden rounded-xl border border-slate-200 bg-white p-1.5 shadow-[0_18px_40px_rgba(15,23,42,.16)] ${align === "right" ? "right-0" : "left-0"}`}
        >
          <p className="px-2.5 pb-1.5 pt-1 text-[10px] font-bold uppercase tracking-[.08em] text-slate-400">
            {menuLabel}
          </p>
          <div role="listbox" aria-label={menuLabel} className="space-y-0.5">
            {options.map((option) => {
              const isSelected = option.value === value;
              return (
                <button
                  type="button"
                  role="option"
                  aria-selected={isSelected}
                  key={option.value}
                  onClick={() => {
                    onChange(option.value);
                    setOpen(false);
                  }}
                  className={`flex w-full items-center gap-3 rounded-lg px-2.5 py-2.5 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500/30 ${isSelected ? "bg-teal-50 text-teal-700" : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"}`}
                >
                  <span className="min-w-0 flex-1">
                    <span
                      className={`block text-sm ${isSelected ? "font-semibold" : "font-medium"}`}
                    >
                      {option.label}
                    </span>
                    {option.description && (
                      <span className="mt-0.5 block text-xs text-slate-400">
                        {option.description}
                      </span>
                    )}
                  </span>
                  {isSelected && (
                    <svg
                      className="h-4 w-4 shrink-0 text-teal-600"
                      viewBox="0 0 16 16"
                      fill="none"
                      aria-hidden="true"
                    >
                      <path
                        d="m3.5 8.5 2.7 2.7 6.3-6.4"
                        stroke="currentColor"
                        strokeWidth="1.9"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
