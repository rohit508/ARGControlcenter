import { useEffect, useRef, useState } from "react";

export interface SearchableSelectOption {
  value: string;
  label: string;
}

interface Props {
  value: string;
  onChange: (value: string) => void;
  options: SearchableSelectOption[];
  placeholder: string;
  className?: string;
  optionClassName?: string;
}

// Native <select> has no type-to-filter for long lists (only jump-to-letter), which makes
// picking one name out of dozens slow. This swaps in a text input + filtered dropdown list while
// keeping the same value/onChange(id-as-string) contract, so it drops into AddMemberControl and
// HeadPicker without touching their submit logic.
export default function SearchableSelect({ value, onChange, options, placeholder, className, optionClassName }: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const rootRef = useRef<HTMLDivElement>(null);

  const selectedLabel = options.find((o) => o.value === value)?.label ?? "";
  const filtered = query.trim() ? options.filter((o) => o.label.toLowerCase().includes(query.trim().toLowerCase())) : options;

  useEffect(() => {
    if (!open) return;
    function onClickOutside(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
        setQuery("");
      }
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [open]);

  function pick(optionValue: string) {
    onChange(optionValue);
    setQuery("");
    setOpen(false);
  }

  return (
    <div ref={rootRef} className="relative flex-1 min-w-0">
      <input
        type="text"
        value={open ? query : selectedLabel}
        onChange={(e) => {
          setQuery(e.target.value);
          if (!open) setOpen(true);
          if (value) onChange(""); // typing again after a pick starts a fresh search
        }}
        onFocus={() => {
          setOpen(true);
          setQuery("");
        }}
        placeholder={placeholder}
        className={className}
      />
      {open && (
        <div className="absolute z-10 mt-1 w-full max-h-48 overflow-y-auto rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-lg">
          {filtered.length === 0 ? (
            <div className="px-2 py-1.5 text-xs text-slate-400">No matches</div>
          ) : (
            filtered.map((o) => (
              <button
                key={o.value}
                type="button"
                onClick={() => pick(o.value)}
                className={optionClassName ?? "block w-full text-left px-2 py-1.5 text-xs hover:bg-slate-100 dark:hover:bg-slate-800"}
              >
                {o.label}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
