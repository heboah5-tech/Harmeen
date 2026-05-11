import { useEffect, useMemo, useRef, useState } from "react";
import { Check, ChevronDown, MapPin, Search } from "lucide-react";

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
        className={`w-full bg-background rounded-xl pe-3 ps-12 py-3 text-sm text-foreground focus:outline-none text-right border-2 transition-all font-semibold flex items-center justify-between gap-2 relative shadow-sm hover:shadow-md ${
          open
            ? "border-primary shadow-md ring-4 ring-primary/10"
            : "border-border hover:border-primary/40"
        }`}
        data-testid={testId}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span
          className={`absolute start-3 top-1/2 -translate-y-1/2 w-7 h-7 rounded-lg flex items-center justify-center transition-colors ${
            open || value ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
          }`}
        >
          <MapPin className="w-4 h-4" />
        </span>
        <span className={value ? "truncate" : "text-muted-foreground font-normal truncate"}>
          {value || placeholder}
        </span>
        <ChevronDown
          className={`w-4 h-4 text-muted-foreground transition-transform flex-shrink-0 ${
            open ? "rotate-180 text-primary" : ""
          }`}
        />
      </button>

      {open && (
        <div
          className="absolute z-[500] mt-2 w-full overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-black/5 border border-border animate-in fade-in slide-in-from-top-2 duration-200"
          data-testid={testId ? `${testId}-popover` : undefined}
        >
          <div className="p-2 border-b border-border bg-muted/30">
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute start-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="ابحث عن مدينة..."
                className="w-full bg-white rounded-lg pe-3 ps-8 py-1.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none border border-border focus:border-primary/40 text-start"
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
