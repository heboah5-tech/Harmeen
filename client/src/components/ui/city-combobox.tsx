import { useEffect, useMemo, useRef, useState } from "react";
import { Check, ChevronDown, Search } from "lucide-react";

type Props = {
  value: string;
  onChange: (next: string) => void;
  options: string[];
  placeholder?: string;
  testId?: string;
};

export default function CityCombobox({
  value,
  onChange,
  options,
  placeholder = "اختر مدينة",
  testId,
}: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const wrapperRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (!wrapperRef.current?.contains(e.target as Node)) {
        setOpen(false);
        setQuery("");
      }
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  useEffect(() => {
    if (open) {
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [open]);

  const filtered = useMemo(() => {
    const q = query.trim();
    if (!q) return options;
    return options.filter((o) => o.includes(q));
  }, [options, query]);

  const select = (val: string) => {
    onChange(val);
    setOpen(false);
    setQuery("");
  };

  return (
    <div className="relative" ref={wrapperRef} dir="rtl">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full bg-muted rounded-xl px-3 py-2.5 text-sm text-foreground focus:outline-none text-right border border-transparent focus:border-primary/40 transition-colors font-medium flex items-center justify-between gap-2"
        data-testid={testId}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span className={value ? "" : "text-muted-foreground font-normal"}>
          {value || placeholder}
        </span>
        <ChevronDown
          className={`w-4 h-4 text-muted-foreground transition-transform ${
            open ? "rotate-180" : ""
          }`}
        />
      </button>

      {open && (
        <div
          className="absolute z-[500] mt-1 w-full overflow-hidden rounded-xl bg-white shadow-xl ring-1 ring-black/5 border border-border"
          data-testid={testId ? `${testId}-popover` : undefined}
        >
          <div className="p-2 border-b border-border bg-muted/30">
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="ابحث عن مدينة..."
                className="w-full bg-white rounded-lg ps-3 pe-8 py-1.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none border border-border focus:border-primary/40 text-right"
                data-testid={testId ? `${testId}-search` : undefined}
              />
            </div>
          </div>

          <ul
            role="listbox"
            className="max-h-60 overflow-auto py-1 text-sm"
            data-testid={testId ? `${testId}-list` : undefined}
          >
            {filtered.length === 0 && (
              <li className="px-4 py-3 text-center text-muted-foreground text-xs">
                لا توجد نتائج
              </li>
            )}
            {filtered.map((opt) => {
              const isSelected = opt === value;
              return (
                <li
                  key={opt}
                  role="option"
                  aria-selected={isSelected}
                  onClick={() => select(opt)}
                  className={`relative cursor-pointer select-none py-2 ps-9 pe-4 text-right transition-colors ${
                    isSelected
                      ? "bg-primary/10 text-primary font-bold"
                      : "text-foreground hover:bg-muted"
                  }`}
                  data-testid={
                    testId ? `${testId}-option-${opt}` : undefined
                  }
                >
                  <span className="block truncate">{opt}</span>
                  {isSelected && (
                    <Check className="w-4 h-4 text-primary absolute start-2 top-1/2 -translate-y-1/2" />
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
