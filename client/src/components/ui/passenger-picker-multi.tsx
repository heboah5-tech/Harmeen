import { useEffect, useRef, useState } from "react";
import { Plus, Minus, Users, X } from "lucide-react";

export type PassengerCounts = {
  adults: number;
  children: number;
  infants: number;
  special: number;
  student: number;
};

const CATEGORIES: {
  key: keyof PassengerCounts;
  label: string;
  hint?: string;
  min: number;
}[] = [
  { key: "adults", label: "البالغين", hint: "12+ سنة", min: 1 },
  { key: "children", label: "الأطفال", hint: "2 - 11 سنة", min: 0 },
  { key: "infants", label: "الرضع", hint: "أقل من سنتين", min: 0 },
  { key: "special", label: "الاحتياجات الخاصة", min: 0 },
  { key: "student", label: "طالب", min: 0 },
];

export const DEFAULT_PASSENGERS: PassengerCounts = {
  adults: 1,
  children: 0,
  infants: 0,
  special: 0,
  student: 0,
};

type Props = {
  value: PassengerCounts;
  onChange: (next: PassengerCounts) => void;
};

export default function PassengerPickerMulti({ value, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const MAX_TOTAL = 9;
  const total = Object.values(value).reduce((a, b) => a + b, 0);

  const change = (key: keyof PassengerCounts, delta: number) => {
    const cat = CATEGORIES.find((c) => c.key === key)!;
    if (delta > 0 && total >= MAX_TOTAL) return;
    const next = Math.max(cat.min, value[key] + delta);
    onChange({ ...value, [key]: next });
  };

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  return (
    <div ref={ref} className={`relative ${open ? "z-[2000]" : ""}`} dir="rtl">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center bg-background border border-border rounded-xl hover:border-primary focus-within:border-primary transition-all"
        data-testid="passenger-picker-multi-button"
      >
        <div className="w-10 h-10 flex items-center justify-center border-s border-border bg-muted/30 rounded-e-xl">
          <Users className="w-4 h-4 text-muted-foreground" />
        </div>
        <span className="flex-1 text-right py-2.5 px-3 text-sm text-foreground">
          {total} {total === 1 ? "مسافر" : "مسافرين"}
        </span>
      </button>

      {open && (
        <div className="absolute z-[2000] mt-1 left-0 right-0 sm:left-auto sm:right-0 sm:w-72 bg-white border border-border rounded-2xl shadow-xl p-4 text-start max-h-[60vh] overflow-y-auto">
          <div className="flex items-center justify-between mb-2">
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="w-7 h-7 rounded-full hover:bg-muted flex items-center justify-center text-muted-foreground"
              aria-label="إغلاق"
              data-testid="passenger-picker-multi-close"
            >
              <X className="w-4 h-4" />
            </button>
            <span className="text-sm font-bold text-foreground">عدد المسافرين</span>
          </div>

          {CATEGORIES.map((cat) => (
            <div
              key={cat.key}
              className="flex items-center justify-between py-2.5 border-b border-border/50 last:border-0"
            >
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => change(cat.key, 1)}
                  disabled={total >= MAX_TOTAL}
                  className="w-7 h-7 rounded-full bg-primary/10 text-primary flex items-center justify-center hover:bg-primary hover:text-primary-foreground transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                  data-testid={`passenger-${cat.key}-inc`}
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
                <span
                  className="w-5 text-center font-bold text-foreground text-sm"
                  data-testid={`passenger-${cat.key}-count`}
                >
                  {value[cat.key]}
                </span>
                <button
                  type="button"
                  onClick={() => change(cat.key, -1)}
                  disabled={value[cat.key] <= cat.min}
                  className="w-7 h-7 rounded-full bg-primary/10 text-primary flex items-center justify-center hover:bg-primary hover:text-primary-foreground transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                  data-testid={`passenger-${cat.key}-dec`}
                >
                  <Minus className="w-3.5 h-3.5" />
                </button>
              </div>
              <div className="text-start">
                <div className="text-sm font-medium text-foreground">{cat.label}</div>
                {cat.hint && (
                  <div className="text-[10px] text-muted-foreground">{cat.hint}</div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
