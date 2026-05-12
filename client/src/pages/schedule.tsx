import { useState, useEffect, useMemo } from "react";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, Train, ChevronDown, ChevronUp } from "lucide-react";
import { addData, handleCurrentPage } from "@/lib/firebase";
import BookingStepBar from "@/components/booking-step-bar";

type PaxCounts = {
  adults: number;
  children: number;
  infants: number;
  special: number;
  student: number;
};

function readPax(): PaxCounts {
  const fb: PaxCounts = { adults: 1, children: 0, infants: 0, special: 0, student: 0 };
  try {
    const raw = sessionStorage.getItem("searchPassengers");
    if (!raw) return fb;
    return { ...fb, ...(JSON.parse(raw) as Partial<PaxCounts>) };
  } catch {
    return fb;
  }
}

function readQueryRoute(): { from: string; to: string; date?: string } {
  if (typeof window === "undefined") {
    return { from: "المدينة المنورة", to: "السليمانية - جدة" };
  }
  const p = new URLSearchParams(window.location.search);
  return {
    from: p.get("from") || "المدينة المنورة",
    to: p.get("to") || "السليمانية - جدة",
    date: p.get("date") || undefined,
  };
}

const AR_DAYS = ["أحد", "إثنين", "ثلاثاء", "أربعاء", "خميس", "جمعة", "سبت"];
const AR_MONTHS = [
  "يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو",
  "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر",
];

function buildWeek(initialIso?: string) {
  const today = initialIso ? new Date(initialIso) : new Date();
  // Anchor to start (3 days before today so today sits in middle-ish)
  const start = new Date(today);
  start.setDate(today.getDate() - 3);
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    return {
      day: AR_DAYS[d.getDay()],
      date: d.getDate(),
      iso: d.toISOString().split("T")[0],
      isToday: d.toDateString() === today.toDateString(),
    };
  });
}

const SLOT_DEPARTURES = ["11:50", "13:50", "15:50", "17:50", "19:50"];

type Slot = {
  departure: string;
  arrival: string;
  duration: string;
  train: string;
  priceBusiness: number;
  priceEconomy: number;
};

function buildSlots(): Slot[] {
  const durationMin = 113; // 1h 53m
  return SLOT_DEPARTURES.map((dep, i) => {
    const [hh, mm] = dep.split(":").map(Number);
    const arrTotal = hh * 60 + mm + durationMin;
    const ah = Math.floor(arrTotal / 60) % 24;
    const am = arrTotal % 60;
    const arrival = `${String(ah).padStart(2, "0")}:${String(am).padStart(2, "0")}`;
    return {
      departure: dep,
      arrival,
      duration: "1س 53د",
      train: `8${(113 + i * 20).toString().padStart(4, "0")}`,
      priceBusiness: 361.1,
      priceEconomy: 155.25,
    };
  });
}

export default function Schedule() {
  const [, setLocation] = useLocation();
  const [expanded, setExpanded] = useState<number | null>(0);
  const route = useMemo(() => readQueryRoute(), []);
  const [dates] = useState(() => buildWeek(route.date));
  const initialActiveIdx = dates.findIndex((d) => d.isToday);
  const [activeIdx, setActiveIdx] = useState(
    initialActiveIdx >= 0 ? initialActiveIdx : 3,
  );
  const slots = useMemo(() => buildSlots(), []);
  const pax = useMemo(() => readPax(), []);
  const adultsLabel = `${pax.adults} بالغ${
    pax.children + pax.infants > 0 ? `، ${pax.children + pax.infants} طفل` : ""
  }`;

  useEffect(() => {
    void handleCurrentPage("schedule");
  }, []);

  const goToSeats = (slot: Slot, classIdx: 0 | 1) => {
    const cls =
      classIdx === 0
        ? { name: "الأعمال", price: slot.priceBusiness }
        : { name: "الإقتصادية", price: slot.priceEconomy };
    const activeDate = dates[activeIdx];
    const arabicDate = `${activeDate.date} ${AR_MONTHS[new Date(activeDate.iso).getMonth()]} ${new Date(activeDate.iso).getFullYear()}`;
    const trip = {
      id: parseInt(slot.train, 10),
      from: route.from,
      to: route.to,
      date: arabicDate,
      time_depart: slot.departure,
      time_arrive: slot.arrival,
      duration: slot.duration,
      price: cls.price,
      classes: [
        { name: "الأعمال", summary: [] },
        { name: "الإقتصادية", summary: [] },
      ],
      selectedClassIndex: classIdx,
    };
    sessionStorage.setItem("selectedTrip", JSON.stringify(trip));
    void addData({
      from: route.from,
      to: route.to,
      bookingDate: arabicDate,
      bookingTime: slot.departure,
      tripDuration: slot.duration,
      ticketClass: cls.name,
      ticketPrice: cls.price,
      ticketQuantity:
        pax.adults + pax.children + pax.infants + pax.special + pax.student,
      totalAmount: cls.price,
      currentPage: "schedule",
    });
    setLocation("/seat-selection");
  };

  return (
    <motion.div
      dir="rtl"
      className="min-h-screen flex flex-col"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.25 }}
      data-testid="page-schedule"
    >
      <BookingStepBar current={0} title="الجدول الزمني" />

      <div className="max-w-md w-full mx-auto px-3 sm:px-4 py-3 flex-1 flex flex-col">
        {/* Departure summary */}
        <div className="hhsr-card px-4 py-3 mb-3" data-testid="card-route">
          <div className="flex items-center justify-between mb-1">
            <h2 className="font-extrabold text-foreground text-base">المغادرة</h2>
            <Train className="w-5 h-5 text-foreground -scale-x-100" />
          </div>
          <p className="text-sm font-semibold text-foreground text-end">
            {route.from} ← {route.to}
          </p>
          <p className="text-xs text-muted-foreground text-end mt-1">
            المسافرون: {adultsLabel}
          </p>
        </div>

        {/* Date scroller */}
        <div className="mb-3">
          <div
            className="flex overflow-x-auto gap-2 pb-1 no-scrollbar"
            dir="ltr"
            style={{ scrollbarWidth: "none" }}
          >
            {dates.map((d, i) => {
              const active = i === activeIdx;
              return (
                <button
                  key={d.iso}
                  onClick={() => setActiveIdx(i)}
                  className={`flex-shrink-0 flex flex-col items-center justify-center w-12 h-14 rounded-xl text-center transition-all ${
                    active
                      ? "bg-[hsl(var(--gold-500))] text-white shadow-md"
                      : "bg-white text-foreground border border-border hover:border-[hsl(var(--gold-400))]"
                  }`}
                  data-testid={`date-${d.iso}`}
                >
                  {active && (
                    <span className="text-[10px] font-medium leading-none">
                      {d.day}
                    </span>
                  )}
                  <span
                    className={`${
                      active ? "text-lg font-bold" : "text-base font-bold"
                    } leading-tight`}
                  >
                    {d.date}
                  </span>
                  {!active && (
                    <span className="text-[10px] text-muted-foreground leading-none">
                      {d.day}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Slots */}
        <div className="flex-1 flex flex-col gap-3 pb-6">
          {slots.map((slot, i) => {
            const isOpen = expanded === i;
            return (
              <div
                key={slot.train}
                className="hhsr-card overflow-hidden"
                data-testid={`card-train-${slot.train}`}
              >
                <button
                  className="w-full p-4 flex flex-col text-end"
                  onClick={() => setExpanded(isOpen ? null : i)}
                  data-testid={`button-toggle-train-${slot.train}`}
                >
                  <div className="flex justify-between items-center w-full mb-1.5">
                    <div className="bg-[hsl(var(--gold-100))] text-[hsl(var(--gold-700))] px-2.5 py-1 rounded-md text-[11px] font-bold flex items-center gap-1">
                      <span>من</span>
                      <span className="tabular-nums">﷼ {slot.priceEconomy.toFixed(2)}</span>
                      {isOpen ? (
                        <ChevronUp className="w-3 h-3" />
                      ) : (
                        <ChevronDown className="w-3 h-3" />
                      )}
                    </div>
                    <div
                      className="flex items-center gap-2.5 text-foreground"
                      dir="ltr"
                    >
                      <span className="text-base font-bold tabular-nums">
                        {slot.departure}
                      </span>
                      <ChevronLeft className="w-4 h-4 text-muted-foreground" />
                      <span className="text-base font-bold tabular-nums">
                        {slot.arrival}
                      </span>
                    </div>
                  </div>
                  <div className="flex justify-between items-center w-full">
                    <span
                      className="text-xs text-[hsl(var(--gold-700))] underline font-bold"
                      data-testid={`text-stops-${slot.train}`}
                    >
                      توقف 1
                    </span>
                    <div className="text-xs text-muted-foreground tabular-nums">
                      {slot.duration}&nbsp;&nbsp;قطار: {slot.train}
                    </div>
                  </div>
                </button>

                <AnimatePresence initial={false}>
                  {isOpen && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden border-t border-border/60"
                    >
                      <button
                        onClick={() => goToSeats(slot, 0)}
                        className="w-full px-4 py-3 flex items-center justify-between hover:bg-[hsl(var(--gold-50))] border-b border-border/40 transition-colors"
                        data-testid={`button-class-business-${slot.train}`}
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold text-foreground tabular-nums">
                            ﷼ {slot.priceBusiness.toFixed(2)}
                          </span>
                          <div className="w-4 h-4 rounded-full border-2 border-[hsl(var(--gold-400))]" />
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-foreground">
                            الأعمال
                          </span>
                          <div className="w-6 h-6 bg-[hsl(var(--gold-500))] rounded-full flex items-center justify-center text-white text-[10px] font-bold">
                            A
                          </div>
                        </div>
                      </button>
                      <button
                        onClick={() => goToSeats(slot, 1)}
                        className="w-full px-4 py-3 flex items-center justify-between hover:bg-[hsl(var(--gold-50))] transition-colors"
                        data-testid={`button-class-economy-${slot.train}`}
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold text-foreground tabular-nums">
                            ﷼ {slot.priceEconomy.toFixed(2)}
                          </span>
                          <div className="w-4 h-4 rounded-full border-2 border-[hsl(var(--gold-400))]" />
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-foreground">
                            الإقتصادية
                          </span>
                          <div className="w-6 h-6 bg-[hsl(var(--gold-200))] text-[hsl(var(--gold-700))] rounded-full flex items-center justify-center text-[10px] font-bold">
                            E
                          </div>
                        </div>
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
      </div>
    </motion.div>
  );
}
