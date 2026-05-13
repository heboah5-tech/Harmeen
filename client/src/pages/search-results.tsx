import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  ChevronDown,
  ChevronUp,
  Bus,
  Check,
  Calendar,
  Clock,
} from "lucide-react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { addData, handleCurrentPage } from "@/lib/firebase";
import { GlobalStyles } from "@/components/schedule/sections";
import SaptcoSearchPanel from "@/components/schedule/saptco-search-panel";
import SiteHeader from "@/components/site-header";
import SiteFooter from "@/components/site-footer";
import {
  fetchSaptcoTrips,
  lookupStopId,
  type SaptcoTrip,
  type SaptcoFareOption,
} from "@/lib/saptco";

const cities = [
  "الكل",
  "الرياض",
  "جدة",
  "مكة المكرمة",
  "المدينة المنورة",
  "الدمام",
  "أبها",
  "تبوك",
  "القصيم",
  "حائل",
  "الخبر",
  "الطائف",
  "جازان",
  "نجران",
  "الباحة",
  "عرعر",
  "سكاكا",
  "الجوف",
  "ينبع",
  "الأحساء",
];

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

const AR_MONTHS = [
  "يناير",
  "فبراير",
  "مارس",
  "أبريل",
  "مايو",
  "يونيو",
  "يوليو",
  "أغسطس",
  "سبتمبر",
  "أكتوبر",
  "نوفمبر",
  "ديسمبر",
];

function formatArabicDate(iso: string): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return `${d.getDate()} ${AR_MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

const CITY_BASE_PRICE: Record<string, number> = {
  الرياض: 0,
  جدة: 950,
  "مكة المكرمة": 870,
  "المدينة المنورة": 850,
  الدمام: 400,
  أبها: 1000,
  تبوك: 1300,
  القصيم: 330,
  حائل: 640,
  الخبر: 410,
  الطائف: 750,
  جازان: 1180,
  نجران: 1170,
  الباحة: 880,
  عرعر: 1100,
  سكاكا: 1200,
  الجوف: 1220,
  ينبع: 950,
  الأحساء: 320,
};

function distanceKm(a: string, b: string): number {
  const da = CITY_BASE_PRICE[a] ?? 500;
  const db = CITY_BASE_PRICE[b] ?? 500;
  return Math.max(120, Math.abs(da - db));
}

function formatHM(totalMin: number): string {
  const h = Math.floor(totalMin / 60) % 24;
  const m = totalMin % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

type PassengerCounts = {
  adults: number;
  children: number;
  infants: number;
  special: number;
  student: number;
};

const PAX_CATS: {
  key: keyof PassengerCounts;
  label: string;
  factor: number;
}[] = [
  { key: "adults", label: "البالغين", factor: 1 },
  { key: "children", label: "الأطفال", factor: 0.75 },
  { key: "infants", label: "الرضع", factor: 0.1 },
  { key: "special", label: "الاحتياجات الخاصة", factor: 0.5 },
  { key: "student", label: "طالب", factor: 0.6 },
];

function readPassengerCounts(): PassengerCounts {
  const fallback: PassengerCounts = {
    adults: 1,
    children: 0,
    infants: 0,
    special: 0,
    student: 0,
  };
  if (typeof window === "undefined") return fallback;
  try {
    const raw = sessionStorage.getItem("searchPassengers");
    if (!raw) return fallback;
    const parsed = JSON.parse(raw) as Partial<PassengerCounts>;
    return { ...fallback, ...parsed };
  } catch {
    return fallback;
  }
}

function buildSummary(
  unitPrice: number,
  className: string,
  pax: PassengerCounts,
): { rows: SummaryRow[]; total: number } {
  const rows: SummaryRow[] = [];
  let subtotal = 0;
  for (const cat of PAX_CATS) {
    const qty = pax[cat.key];
    if (qty <= 0) continue;
    const ppu = Math.round(unitPrice * cat.factor);
    const lineTotal = ppu * qty;
    subtotal += lineTotal;
    rows.push({
      label: `تذاكر ${className} (${cat.label})`,
      qty: `${qty} ×`,
      price: ppu.toFixed(2),
      sub: lineTotal.toFixed(2),
    });
  }
  const fee = 0.3;
  const total = subtotal + fee;
  rows.push({ label: "إجمالي المبلغ", sub: total.toFixed(2), total: true });
  rows.push({ label: "رسوم", sub: fee.toFixed(2), fee: true });
  return { rows, total };
}

function pickSaptcoFare(t: SaptcoTrip): SaptcoFareOption | null {
  return (
    t.price?.base_fare_option ||
    t.price?.flexable_option ||
    t.price?.reduced_option ||
    t.price?.minimum_option ||
    null
  );
}

function pickSaptcoEconomyFare(t: SaptcoTrip): SaptcoFareOption | null {
  return (
    t.price?.minimum_option ||
    t.price?.reduced_option ||
    t.price?.base_fare_option ||
    null
  );
}

function saptcoTripsToTrips(
  saptcoTrips: SaptcoTrip[],
  fromCity: string,
  toCity: string,
  isoDate: string,
  pax: PassengerCounts,
): Trip[] {
  return saptcoTrips
    .map((t, i) => {
      const base = pickSaptcoFare(t);
      const eco = pickSaptcoEconomyFare(t);
      if (!base) return null;
      const rawBaseUnit = parseFloat(base.tickets?.[0]?.price_of_ticket || "0") || base.subtotal || 0;
      const baseUnit = Math.max(120, Math.round(rawBaseUnit));
      const rawEcoUnit = eco
        ? parseFloat(eco.tickets?.[0]?.price_of_ticket || "0") || eco.subtotal || baseUnit
        : Math.round(baseUnit * 0.92);
      const ecoUnit = Math.max(120, Math.round(rawEcoUnit));
      const dep = t.stops?.find((s) => s.departure_time)?.departure_time || "";
      const arr = t.stops?.find((s) => s.arrival_time)?.arrival_time || "";
      const durationMin = t.duration || 0;
      const hours = Math.floor(durationMin / 60);
      const mins = durationMin % 60;
      const duration = mins
        ? `${hours} ساعة ${mins} دقيقة`
        : `${hours} ${hours === 1 ? "ساعة" : "ساعات"}`;
      const basicSummary = buildSummary(baseUnit, "الأساسية", pax);
      const ecoSummary = buildSummary(ecoUnit, "الاقتصادية", pax);
      return {
        id: t.id || i + 1,
        from: fromCity,
        to: toCity,
        date: formatArabicDate(isoDate),
        time_depart: dep,
        time_arrive: arr,
        duration,
        price: Math.round(baseUnit),
        classes: [
          {
            name: "الأساسية",
            tag: i === 0 ? "الأوفر" : null,
            selected: true,
            summary: basicSummary.rows,
          },
          {
            name: "الاقتصادية",
            tag: "اقتصادية",
            selected: false,
            summary: ecoSummary.rows,
          },
        ],
      } as Trip;
    })
    .filter(Boolean) as Trip[];
}

function generateTripsForRoute(
  from: string,
  to: string,
  isoDate: string,
  pax: PassengerCounts,
): Trip[] {
  if (!from || !to || from === to || from === "الكل" || to === "الكل") return [];
  const km = distanceKm(from, to);
  const durationMin = Math.round((km / 80) * 60);
  const hours = Math.floor(durationMin / 60);
  const mins = durationMin % 60;
  const duration = mins
    ? `${hours} ساعة ${mins} دقيقة`
    : `${hours} ${hours === 1 ? "ساعة" : "ساعات"}`;
  const basePrice = Math.max(120, Math.round(km * 0.22));
  const dateLabel = formatArabicDate(isoDate);
  const departures = [
    { hour: 7, mod: 0 },
    { hour: 11, mod: 12 },
    { hour: 15, mod: -8 },
    { hour: 21, mod: 20 },
  ];
  return departures.map((d, i) => {
    const departMin = d.hour * 60 + 30;
    const arriveMin = departMin + durationMin;
    const basicUnit = Math.max(120, basePrice + d.mod);
    const economyUnit = Math.max(120, Math.round(basicUnit * 0.92));
    const basic = buildSummary(basicUnit, "الأساسية", pax);
    const economy = buildSummary(economyUnit, "الاقتصادية", pax);
    return {
      id: i + 1,
      from,
      to,
      date: dateLabel,
      time_depart: formatHM(departMin),
      time_arrive: formatHM(arriveMin),
      duration,
      price: basicUnit,
      classes: [
        {
          name: "الأساسية",
          tag: i === 0 ? "الأوفر" : null,
          selected: true,
          summary: basic.rows,
        },
        {
          name: "الاقتصادية",
          tag: "اقتصادية",
          selected: false,
          summary: economy.rows,
        },
      ],
    };
  });
}

function TripCard({ trip }: { trip: Trip }) {
  const [expanded, setExpanded] = useState(trip.id === 1);
  const [selectedClass, setSelectedClass] = useState(0);
  const [, setLocation] = useLocation();

  const onBook = () => {
    const tripClass = trip.classes[selectedClass];
    const totalRow = tripClass?.summary?.find((r) => r.total);
    const total = totalRow ? parseFloat(String(totalRow.sub)) : trip.price;
    const pax = readPassengerCounts();
    const ticketQuantity =
      pax.adults + pax.children + pax.infants + pax.special + pax.student;
    sessionStorage.setItem(
      "selectedTrip",
      JSON.stringify({ ...trip, selectedClassIndex: selectedClass }),
    );
    void addData({
      from: trip.from,
      to: trip.to,
      bookingDate: trip.date,
      bookingTime: trip.time_depart,
      tripDuration: trip.duration,
      ticketClass: tripClass?.name || "",
      ticketPrice: trip.price,
      totalAmount: total,
      ticketQuantity,
      passengers: pax,
      currentPage: "search_results",
    });
    setLocation("/passenger-details");
  };

  const trainNum = `80${(trip.id * 13).toString().padStart(3, "0").slice(-3)}`;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className="hhsr-card mb-3"
      dir="rtl"
      data-testid={`trip-card-${trip.id}`}
    >
      <div className="flex items-stretch">
        {/* LEFT: gold price panel */}
        <button
          onClick={() => setExpanded((e) => !e)}
          className="relative w-24 sm:w-28 flex flex-col items-center justify-center py-4 px-2 transition-colors"
          style={{ background: "hsl(var(--gold-300))" }}
          data-testid={`button-toggle-trip-${trip.id}`}
        >
          <span className="absolute top-1.5 left-2 text-[10px] text-white/95 font-semibold">
            من
          </span>
          <div className="flex items-baseline gap-1 text-white font-extrabold tabular-nums">
            <span className="text-base">﷼</span>
            <span className="text-base sm:text-lg">{trip.price.toFixed(2)}</span>
          </div>
          <span className="mt-1 text-white">
            {expanded ? (
              <ChevronUp className="w-4 h-4" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
          </span>
        </button>

        {/* RIGHT: trip details */}
        <div className="flex-1 px-4 py-3 min-w-0">
          <div className="flex items-center justify-end gap-3 text-foreground">
            <span className="text-base sm:text-lg font-extrabold tabular-nums">
              {trip.time_arrive}
            </span>
            <span className="text-muted-foreground">←</span>
            <span className="text-base sm:text-lg font-extrabold tabular-nums">
              {trip.time_depart}
            </span>
          </div>
          <div className="flex items-center justify-end gap-3 text-[11px] text-muted-foreground mt-1.5 flex-wrap">
            <button
              className="text-[hsl(var(--gold-600))] font-semibold underline underline-offset-2"
              data-testid={`button-stops-trip-${trip.id}`}
            >
              توقف 1
            </button>
            <span className="tabular-nums">قطار: {trainNum}</span>
            <span className="tabular-nums">{trip.duration}</span>
          </div>
        </div>
      </div>

      {expanded && (
        <div className="border-t border-border/60">
          {trip.classes.map((cls, i) => {
            const ppu =
              i === 1
                ? Math.max(85, Math.round(trip.price * 0.78))
                : trip.price;
            return (
              <button
                key={i}
                onClick={() => {
                  setSelectedClass(i);
                  onBook();
                }}
                className={`w-full flex items-center justify-between gap-3 px-4 py-3.5 border-b border-border/40 last:border-b-0 transition-colors hover:bg-[hsl(var(--gold-50))] ${
                  selectedClass === i ? "bg-[hsl(var(--gold-50))]" : "bg-white"
                }`}
                data-testid={`button-class-${trip.id}-${i}`}
              >
                <div className="flex items-center gap-3">
                  <span className="font-extrabold tabular-nums text-foreground">
                    ﷼ {ppu.toFixed(2)}
                  </span>
                  <span
                    className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${
                      selectedClass === i
                        ? "border-[hsl(var(--gold-500))] bg-[hsl(var(--gold-500))]"
                        : "border-[hsl(var(--gold-300))] bg-white"
                    }`}
                  >
                    {selectedClass === i && (
                      <Check className="w-3 h-3 text-white" strokeWidth={3} />
                    )}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-foreground font-semibold">
                  <span>{cls.name}</span>
                  <Bus className="w-4 h-4 text-[hsl(var(--gold-600))]" />
                </div>
              </button>
            );
          })}
        </div>
      )}
    </motion.div>
  );
}

function readSearchParams() {
  if (typeof window === "undefined") return null;
  const qs = window.location.search;
  if (!qs) return null;
  const p = new URLSearchParams(qs);
  return {
    from: p.get("from") || "",
    to: p.get("to") || "",
    date: p.get("date") || "",
  };
}

export default function SearchResults() {
  const todayStr = new Date().toISOString().split("T")[0];
  const initial = readSearchParams();
  const [fromCity, setFromCity] = useState(initial?.from || "الدمام");
  const [toCity, setToCity] = useState(initial?.to || "الرياض");
  const [date, setDate] = useState(initial?.date || todayStr);

  useEffect(() => {
    void handleCurrentPage("search_results");
    if (!initial) return;
    const t = window.setTimeout(() => {
      document
        .getElementById("trip-results")
        ?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 250);
    return () => window.clearTimeout(t);
  }, []);

  const swap = () => {
    setFromCity(toCity);
    setToCity(fromCity);
  };

  const [passengers, setPassengers] = useState<PassengerCounts>(() =>
    readPassengerCounts(),
  );
  const [isTransit, setIsTransit] = useState<boolean>(() => {
    try {
      return sessionStorage.getItem("tripMode") === "transit";
    } catch {
      return false;
    }
  });

  const stopsMapped =
    !!lookupStopId(fromCity) && !!lookupStopId(toCity) && fromCity !== toCity;

  const saptcoQuery = useQuery({
    queryKey: ["saptco-trips", fromCity, toCity, date, passengers, isTransit],
    queryFn: () =>
      fetchSaptcoTrips({
        fromCity,
        toCity,
        isoDate: date,
        isTransit,
        passengers: {
          adults: passengers.adults || 1,
          children: passengers.children || 0,
          infants: passengers.infants || 0,
        },
      }),
    enabled: stopsMapped && !!date,
    staleTime: 60_000,
    retry: 0,
  });

  const trips = useMemo(() => {
    if (saptcoQuery.data && saptcoQuery.data.length > 0) {
      return saptcoTripsToTrips(saptcoQuery.data, fromCity, toCity, date, passengers);
    }
    return generateTripsForRoute(fromCity, toCity, date, passengers);
  }, [saptcoQuery.data, fromCity, toCity, date, passengers]);

  const usingApi = !!(saptcoQuery.data && saptcoQuery.data.length > 0);
  const apiLoading = saptcoQuery.isLoading && stopsMapped;

  return (
    <div
      className="min-h-screen bg-background flex flex-col"
      dir="rtl"
      data-testid="page-search-results"
    >
      <SiteHeader />
      <GlobalStyles />

      <SaptcoSearchPanel
        cities={cities}
        fromCity={fromCity}
        toCity={toCity}
        date={date}
        setFromCity={setFromCity}
        setToCity={setToCity}
        setDate={setDate}
        isTransit={isTransit}
        setIsTransit={setIsTransit}
        passengers={passengers}
        setPassengers={setPassengers}
        onSearch={() => {
          void saptcoQuery.refetch();
          document
            .getElementById("trip-results")
            ?.scrollIntoView({ behavior: "smooth", block: "start" });
        }}
        swap={swap}
      />

      <div id="trip-results" className="bg-muted/30 flex-1">
        <div className="max-w-3xl mx-auto px-4 py-6">
          {apiLoading && (
            <div className="text-center py-8 text-muted-foreground text-sm">
              جاري البحث عن الرحلات…
            </div>
          )}
          {trips.length > 0 ? (
            <>
              <div className="mb-4 flex items-center justify-between text-xs text-muted-foreground">
                <span className="font-bold text-foreground">
                  {fromCity} ← {toCity} • {formatArabicDate(date)}
                </span>
                {usingApi && (
                  <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold">
                    رحلات قطار الحرمين فعلية
                  </span>
                )}
              </div>
              {trips.map((trip) => (
                <TripCard key={`${fromCity}-${toCity}-${date}-${trip.id}`} trip={trip} />
              ))}
            </>
          ) : (
            !apiLoading && (
              <div className="text-center py-16 text-muted-foreground text-sm">
                لا توجد رحلات متاحة لهذا المسار. يرجى اختيار مدن مختلفة.
              </div>
            )
          )}
        </div>
      </div>

      <SiteFooter />
    </div>
  );
}
