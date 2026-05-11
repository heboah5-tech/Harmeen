import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  ChevronDown,
  ChevronUp,
  Bus,
  Clock,
  Check,
  Calendar,
} from "lucide-react";
import { useLocation } from "wouter";
import { handleCurrentPage } from "@/lib/firebase";
import { GlobalStyles, HeroSection } from "@/components/schedule/sections";
import SiteHeader from "@/components/site-header";
import SiteFooter from "@/components/site-footer";

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
  const todayStr = new Date().toISOString().split("T")[0];
  const [fromCity, setFromCity] = useState("الدمام");
  const [toCity, setToCity] = useState("الرياض");
  const [date, setDate] = useState(todayStr);

  useEffect(() => {
    void handleCurrentPage("search_results");
  }, []);

  const swap = () => {
    setFromCity(toCity);
    setToCity(fromCity);
  };

  return (
    <div
      className="min-h-screen bg-background flex flex-col"
      dir="rtl"
      data-testid="page-search-results"
    >
      <SiteHeader />
      <GlobalStyles />

      <HeroSection
        cities={cities}
        fromCity={fromCity}
        toCity={toCity}
        date={date}
        setFromCity={setFromCity}
        setToCity={setToCity}
        setDate={setDate}
        onSearch={() => {
          requestAnimationFrame(() => {
            document
              .getElementById("trip-results")
              ?.scrollIntoView({ behavior: "smooth", block: "start" });
          });
        }}
        swap={swap}
      />

      <div id="trip-results" className="bg-muted/30 flex-1">
        <div className="max-w-3xl mx-auto px-4 py-6">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-xs text-muted-foreground">
              {fromCity} ← {toCity}
            </span>
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-foreground">رحلة الذهاب</span>
              <Bus className="w-4 h-4 text-primary" />
            </div>
          </div>

          {trips.slice(0, 1).map((trip) => (
            <TripCard key={trip.id} trip={trip} />
          ))}

          <div className="mb-2 mt-6 flex items-center justify-between">
            <span className="text-xs text-muted-foreground">
              {toCity} ← {fromCity}
            </span>
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

      <SiteFooter />
    </div>
  );
}
