import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import {
  ChevronDown,
  ChevronUp,
  Bus,
  Clock,
  Users,
  Check,
  ArrowLeftRight,
  Calendar,
  Search,
  Plus,
  Minus,
  Info,
  X,
} from "lucide-react";
import { useLocation } from "wouter";
import { handleCurrentPage } from "@/lib/firebase";

const PASSENGER_TYPES = [
  { key: "adults", label: "البالغين", min: 1 },
  { key: "children", label: "الأطفال", min: 0 },
  { key: "infants", label: "الرضع", min: 0 },
  { key: "special", label: "الاحتياجات الخاصة", min: 0 },
  { key: "student", label: "طالب", min: 0 },
] as const;

type PassengerCounts = Record<(typeof PASSENGER_TYPES)[number]["key"], number>;

function PassengerPickerMulti({
  value,
  onChange,
}: {
  value: PassengerCounts;
  onChange: (v: PassengerCounts) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  const total = Object.values(value).reduce((a, b) => a + b, 0);

  const set = (key: keyof PassengerCounts, delta: number) => {
    const cfg = PASSENGER_TYPES.find((t) => t.key === key)!;
    const next = Math.max(cfg.min, Math.min(9, value[key] + delta));
    onChange({ ...value, [key]: next });
  };

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between bg-muted rounded-xl px-3 py-2 text-xs text-muted-foreground hover:bg-muted/70 transition-colors"
        data-testid="button-open-passenger-picker"
      >
        <span>{total} مسافر</span>
        <span className="flex items-center gap-1">
          <Users className="w-3 h-3" /> المسافرون ونوع التذكرة
        </span>
      </button>

      {open && (
        <div
          className="absolute z-[300] mt-2 left-0 right-0 mx-auto w-full max-w-sm bg-white border border-border rounded-2xl shadow-2xl p-4"
          data-testid="popover-passenger-picker"
        >
          <div className="flex items-center justify-between mb-3">
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="w-7 h-7 rounded-full hover:bg-muted flex items-center justify-center text-muted-foreground"
              data-testid="button-close-passenger-picker"
            >
              <X className="w-4 h-4" />
            </button>
            <span className="text-sm font-bold text-foreground">المسافرون</span>
          </div>

          <div className="space-y-3">
            {PASSENGER_TYPES.map((t) => (
              <div
                key={t.key}
                className="flex items-center justify-between"
                data-testid={`row-passenger-${t.key}`}
              >
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => set(t.key, -1)}
                    disabled={value[t.key] <= t.min}
                    className="w-7 h-7 rounded-full border border-primary text-primary hover:bg-primary hover:text-primary-foreground flex items-center justify-center transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                    data-testid={`button-decrement-${t.key}`}
                  >
                    <Minus className="w-3.5 h-3.5" />
                  </button>
                  <span
                    className="w-6 text-center text-sm font-bold text-foreground"
                    data-testid={`text-count-${t.key}`}
                  >
                    {value[t.key]}
                  </span>
                  <button
                    type="button"
                    onClick={() => set(t.key, +1)}
                    className="w-7 h-7 rounded-full border border-primary bg-primary text-primary-foreground hover:bg-primary/90 flex items-center justify-center transition-colors"
                    data-testid={`button-increment-${t.key}`}
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="flex items-center gap-2 text-end">
                  <span className="text-sm font-semibold text-foreground">{t.label}</span>
                  <Info className="w-3.5 h-3.5 text-primary cursor-help" />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

type SummaryRow = {
  label: string;
  qty?: string | null;
  price?: string | null;
  sub: string;
  total?: boolean;
  fee?: boolean;
};

type TripClass = {
  name: string;
  tag?: string | null;
  selected?: boolean;
  summary: SummaryRow[];
};

type Trip = {
  id: number;
  from: string;
  to: string;
  date: string;
  time_depart: string;
  time_arrive: string;
  duration: string;
  price: number;
  classes: TripClass[];
};

const trips: Trip[] = [
  {
    id: 1,
    from: "الدمام",
    to: "شيراز",
    date: "11 مايو 2025",
    time_depart: "12:00",
    time_arrive: "20:00",
    duration: "8 ساعات",
    price: 247,
    classes: [
      {
        name: "الأساسية",
        tag: "الأوفر",
        selected: true,
        summary: [
          { label: "تذاكر الأساسية (البالغين)", qty: "1 ×", price: "120.00", sub: "120.00" },
          { label: "تذاكر (الأطفال)", qty: "1 ×", price: "120.00", sub: "120.00" },
          { label: "إضافي للرضع (0-3)", qty: "1 ×", price: "135.70", sub: "20.30" },
          { label: "إجمالي المبلغ", sub: "159", total: true },
          { label: "رسوم", sub: "0.30", fee: true },
        ],
      },
      { name: "الاقتصادية", tag: null, selected: false, summary: [] },
    ],
  },
  {
    id: 2,
    from: "الرياض - الرانية (الثانية)",
    to: "شيراز",
    date: "13 مايو 2025",
    time_depart: "09:00",
    time_arrive: "18:00",
    duration: "9 ساعات",
    price: 235,
    classes: [{ name: "الأساسية", tag: "الأوفر", selected: false, summary: [] }],
  },
];

function TripCard({ trip }: { trip: Trip }) {
  const [expanded, setExpanded] = useState(trip.id === 1);
  const [selectedClass, setSelectedClass] = useState(0);
  const [, setLocation] = useLocation();

  const onBook = () => {
    sessionStorage.setItem(
      "selectedTrip",
      JSON.stringify({ ...trip, selectedClassIndex: selectedClass }),
    );
    setLocation("/passenger-details");
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="bg-white border border-border rounded-2xl overflow-hidden shadow-sm mb-4"
      dir="rtl"
      data-testid={`trip-card-${trip.id}`}
    >
      <div className="p-4 sm:p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="text-left flex-shrink-0">
            <div className="text-2xl font-extrabold text-primary">
              {trip.price} <span className="text-base font-bold">ر.س</span>
            </div>
            <div className="text-xs text-muted-foreground">للفرد</div>
          </div>

          <div className="flex-1 text-end">
            <div className="flex items-center justify-end gap-3 mb-2">
              <div className="text-end">
                <div className="text-xs text-muted-foreground mb-0.5">الوصول</div>
                <div className="font-bold text-foreground text-sm">{trip.to}</div>
                <div className="text-lg font-extrabold text-foreground">{trip.time_arrive}</div>
              </div>
              <div className="flex flex-col items-center gap-1 px-2">
                <div className="w-2 h-2 rounded-full bg-primary" />
                <div className="w-px h-8 bg-border" />
                <Bus className="w-4 h-4 text-primary" />
                <div className="w-px h-8 bg-border" />
                <div className="w-2 h-2 rounded-full bg-emerald-600" />
              </div>
              <div className="text-end">
                <div className="text-xs text-muted-foreground mb-0.5">المغادرة</div>
                <div className="font-bold text-foreground text-sm">{trip.from}</div>
                <div className="text-lg font-extrabold text-foreground">{trip.time_depart}</div>
              </div>
            </div>
            <div className="flex items-center justify-end gap-3 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {trip.duration}
              </span>
              <span className="flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                {trip.date}
              </span>
            </div>
          </div>
        </div>

        <button
          onClick={() => setExpanded((e) => !e)}
          className="mt-4 w-full flex items-center justify-center gap-2 text-primary text-sm font-semibold py-2 rounded-xl hover:bg-primary/5 transition-colors"
          data-testid={`button-toggle-trip-${trip.id}`}
        >
          {expanded ? "إخفاء التفاصيل" : "عرض التفاصيل"}
          {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
      </div>

      {expanded && (
        <div className="border-t border-border bg-muted/20 p-4 sm:p-5">
          <div className="flex gap-2 justify-end mb-4 flex-wrap">
            {trip.classes.map((cls, i) => (
              <button
                key={i}
                onClick={() => setSelectedClass(i)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold border transition-all duration-200 ${
                  selectedClass === i
                    ? "bg-primary text-primary-foreground border-primary shadow-md"
                    : "bg-background text-foreground border-border hover:border-primary"
                }`}
                data-testid={`button-class-${trip.id}-${i}`}
              >
                {selectedClass === i && <Check className="w-3.5 h-3.5" />}
                {cls.name}
                {cls.tag && (
                  <span className="text-[10px] bg-emerald-600 text-white px-1.5 py-0.5 rounded-full font-bold">
                    {cls.tag}
                  </span>
                )}
              </button>
            ))}
          </div>

          {trip.classes[selectedClass]?.summary?.length > 0 && (
            <div className="bg-background border border-border rounded-xl p-4 mb-4 text-end">
              <h4 className="font-bold text-foreground mb-3 text-sm">ملخص الحجز</h4>
              <div className="space-y-2">
                {trip.classes[selectedClass].summary.map((row, i) => (
                  <div
                    key={i}
                    className={`flex items-center justify-between text-sm ${
                      row.total ? "border-t border-border pt-2 font-bold text-foreground" : ""
                    } ${row.fee ? "text-muted-foreground text-xs" : "text-foreground"}`}
                  >
                    <span className="font-bold">{row.sub} ر.س</span>
                    <span className="text-end">
                      {row.qty && (
                        <span className="text-muted-foreground ml-1">
                          {row.qty} {row.price} ر.س
                        </span>
                      )}
                      {row.label}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <button
            onClick={onBook}
            className="w-full bg-emerald-600 text-white py-3.5 rounded-xl font-bold text-base hover:bg-emerald-700 hover:-translate-y-0.5 hover:shadow-lg transition-all duration-300"
            data-testid={`button-book-trip-${trip.id}`}
          >
            احجز الآن
          </button>
        </div>
      )}
    </motion.div>
  );
}

export default function SearchResults() {
  const [tripType, setTripType] = useState<"one-way" | "round">("round");
  const [from, setFrom] = useState("الدمام");
  const [to, setTo] = useState("شيراز");
  const [passengers, setPassengers] = useState<PassengerCounts>({
    adults: 1,
    children: 0,
    infants: 0,
    special: 0,
    student: 0,
  });

  useEffect(() => {
    void handleCurrentPage("search_results");
  }, []);

  return (
    <div className="min-h-screen bg-muted/30" dir="rtl" data-testid="page-search-results">
      <div className="bg-background border-b border-border sticky top-0 z-40 shadow-sm">
        <div className="max-w-3xl mx-auto px-4 py-4">
          <div className="flex items-center gap-4 mb-4 justify-end">
            {(["one-way", "round"] as const).map((t) => (
              <label
                key={t}
                className="flex items-center gap-2 cursor-pointer text-sm font-medium text-foreground"
              >
                <input
                  type="radio"
                  name="tripType"
                  value={t}
                  checked={tripType === t}
                  onChange={() => setTripType(t)}
                  className="accent-primary"
                />
                {t === "one-way" ? "ذهاب فقط" : "ذهاب وعودة"}
              </label>
            ))}
          </div>

          <div className="flex items-center gap-2 mb-3">
            <input
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className="flex-1 bg-muted border border-border rounded-xl py-2.5 px-3 text-sm text-end focus:outline-none focus:ring-2 focus:ring-primary/30"
              placeholder="إلى"
              data-testid="input-to"
            />
            <button
              onClick={() => {
                setFrom(to);
                setTo(from);
              }}
              className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 hover:bg-primary/20"
              data-testid="button-swap-cities"
            >
              <ArrowLeftRight className="w-4 h-4 text-primary" />
            </button>
            <input
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              className="flex-1 bg-muted border border-border rounded-xl py-2.5 px-3 text-sm text-end focus:outline-none focus:ring-2 focus:ring-primary/30"
              placeholder="من"
              data-testid="input-from"
            />
          </div>

          <div className="grid grid-cols-2 gap-2 mb-3">
            <input
              type="date"
              defaultValue="2026-05-13"
              className="bg-muted border border-border rounded-xl py-2.5 px-3 text-sm text-end focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
            <input
              type="date"
              defaultValue="2026-05-11"
              className="bg-muted border border-border rounded-xl py-2.5 px-3 text-sm text-end focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>

          <div className="mb-3">
            <PassengerPickerMulti value={passengers} onChange={setPassengers} />
          </div>

          <button
            className="w-full bg-primary text-primary-foreground py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 hover:bg-primary/90 transition-colors"
            data-testid="button-search-trips"
          >
            <Search className="w-4 h-4" />
            البحث
          </button>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-6">
        <div className="mb-2 flex items-center justify-between">
          <span className="text-xs text-muted-foreground">الدمام ← شيراز</span>
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-foreground">رحلة الذهاب</span>
            <Bus className="w-4 h-4 text-primary" />
          </div>
        </div>

        {trips.slice(0, 1).map((trip) => (
          <TripCard key={trip.id} trip={trip} />
        ))}

        <div className="mb-2 mt-6 flex items-center justify-between">
          <span className="text-xs text-muted-foreground">شيراز ← الدمام</span>
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-foreground">رحلة العودة</span>
            <Bus className="w-4 h-4 text-emerald-600" />
          </div>
        </div>

        {trips.slice(1).map((trip) => (
          <TripCard key={trip.id} trip={trip} />
        ))}

        <div className="text-center py-8 text-muted-foreground text-sm">
          لا توجد رحلات إضافية متاحة
        </div>
      </div>
    </div>
  );
}
