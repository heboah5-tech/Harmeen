import { useState, useMemo } from "react";
import {
  ArrowLeftRight,
  Calendar,
  Users,
  Search,
  Bus,
  Clock,
  ChevronLeft,
} from "lucide-react";
import { BottomNav } from "./services";

const cities = [
  "الرياض",
  "جدة",
  "مكة المكرمة",
  "المدينة المنورة",
  "الدمام",
  "أبها",
  "تبوك",
  "القصيم",
  "حائل",
  "جازان",
  "نجران",
  "الباحة",
];

type Trip = {
  id: number;
  from: string;
  to: string;
  dep: string;
  arr: string;
  duration: string;
  price: number;
  seats: number;
  type: string;
  company: string;
};

const mockTrips: Trip[] = [
  { id: 1, from: "الرياض", to: "جدة", dep: "06:00", arr: "12:00", duration: "6 ساعات", price: 130, seats: 12, type: "اقتصادية", company: "سابتكو للنقل السعودي" },
  { id: 2, from: "الرياض", to: "جدة", dep: "09:00", arr: "15:00", duration: "6 ساعات", price: 155, seats: 3, type: "متميزة", company: "سابتكو للنقل السعودي" },
  { id: 3, from: "الرياض", to: "جدة", dep: "12:00", arr: "18:00", duration: "6 ساعات", price: 130, seats: 20, type: "اقتصادية", company: "سابتكو للنقل السعودي" },
  { id: 4, from: "الرياض", to: "جدة", dep: "15:00", arr: "21:00", duration: "6 ساعات", price: 180, seats: 8, type: "متميزة", company: "سابتكو للنقل السعودي" },
  { id: 5, from: "الرياض", to: "مكة المكرمة", dep: "07:00", arr: "14:00", duration: "7 ساعات", price: 145, seats: 15, type: "اقتصادية", company: "سابتكو للنقل السعودي" },
  { id: 6, from: "الرياض", to: "الدمام", dep: "08:00", arr: "12:00", duration: "4 ساعات", price: 95, seats: 22, type: "اقتصادية", company: "سابتكو للنقل السعودي" },
];

function TripCard({ trip, passengers }: { trip: Trip; passengers: number }) {
  const total = trip.price * passengers;
  const seatsColor =
    trip.seats <= 5
      ? "text-destructive"
      : trip.seats <= 10
        ? "text-yellow-600"
        : "text-green-600";

  return (
    <div
      className="bg-card border border-border rounded-2xl p-5 flex flex-col sm:flex-row items-start sm:items-center gap-4 hover:border-primary/40 hover:shadow-md transition-all duration-300"
      data-testid={`card-trip-${trip.id}`}
    >
      <div className="flex-1">
        <p className="text-xs text-muted-foreground mb-1">{trip.company}</p>
        <div className="flex items-center gap-3 mb-2">
          <span className="text-xl font-black text-foreground">{trip.dep}</span>
          <div className="flex-1 flex items-center gap-2 min-w-0">
            <div className="flex-1 border-t-2 border-dashed border-border" />
            <Clock className="w-3 h-3 text-muted-foreground shrink-0" />
            <span className="text-xs text-muted-foreground whitespace-nowrap">
              {trip.duration}
            </span>
            <div className="flex-1 border-t-2 border-dashed border-border" />
          </div>
          <span className="text-xl font-black text-foreground">{trip.arr}</span>
        </div>
        <div className="flex items-center gap-6 text-sm">
          <span className="font-medium text-foreground">{trip.from}</span>
          <Bus className="w-4 h-4 text-primary" />
          <span className="font-medium text-foreground">{trip.to}</span>
        </div>
      </div>

      <div className="hidden sm:block w-px h-16 bg-border" />

      <div className="flex flex-row sm:flex-col items-center sm:items-end gap-4 sm:gap-2 w-full sm:w-auto">
        <div className="flex-1 sm:flex-none text-right">
          <span className={`text-xs font-medium ${seatsColor}`}>
            {trip.seats} مقعد متاح
          </span>
          <p className="text-xs text-muted-foreground">{trip.type}</p>
        </div>
        <div className="text-right">
          <span className="text-2xl font-black text-primary">{total}</span>
          <span className="text-sm text-muted-foreground mr-1">ر.س</span>
        </div>
        <button
          className="bg-primary text-primary-foreground px-5 py-2.5 rounded-xl font-bold text-sm hover:opacity-90 transition-opacity shadow whitespace-nowrap"
          data-testid={`button-book-trip-${trip.id}`}
        >
          احجز الآن
        </button>
      </div>
    </div>
  );
}

export default function Trips() {
  const [tripType, setTripType] = useState<"one" | "round">("one");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [date, setDate] = useState("");
  const [passengers, setPassengers] = useState(1);
  const [searched, setSearched] = useState(false);

  const swapCities = () => {
    setFrom(to);
    setTo(from);
  };

  const results = useMemo(() => {
    if (!searched) return [];
    return mockTrips.filter(
      (t) => (!from || t.from === from) && (!to || t.to === to),
    );
  }, [searched, from, to]);

  const handleSearch = () => setSearched(true);

  return (
    <div className="min-h-screen bg-background" dir="rtl" data-testid="page-trips">
      <header className="bg-card border-b border-border sticky top-0 z-50 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <button
            className="bg-primary text-primary-foreground px-4 py-2 rounded-full text-sm font-bold"
            data-testid="button-login"
          >
            تسجيل الدخول
          </button>
          <nav className="hidden md:flex items-center gap-5 text-sm font-medium text-foreground/80">
            <a href="#" className="text-primary font-bold">
              الرئيسية
            </a>
            {[
              "رحلاتنا",
              "خيارات التذاكر",
              "العروض",
              "المركز الإعلامي",
              "الأسئلة الشائعة",
              "تواصل معنا",
            ].map((item) => (
              <a
                key={item}
                href="#"
                className="hover:text-primary transition-colors"
              >
                {item}
              </a>
            ))}
          </nav>
          <span className="font-black text-primary text-2xl tracking-tight">
            SAT
          </span>
        </div>
      </header>

      <div className="bg-card border-b border-border shadow-sm">
        <div className="max-w-5xl mx-auto px-4 py-6">
          <div className="flex items-center gap-4 mb-5 flex-wrap">
            <button className="text-xs text-primary border border-primary px-3 py-1.5 rounded-full font-medium hover:bg-primary/10 transition-colors">
              البحث في رحلات الترانزيت
            </button>
            <div className="flex items-center gap-4 mr-auto">
              {[
                { val: "one" as const, label: "ذهاب فقط" },
                { val: "round" as const, label: "ذهاب وعودة" },
              ].map((opt) => (
                <label
                  key={opt.val}
                  className="flex items-center gap-2 cursor-pointer"
                >
                  <div
                    onClick={() => setTripType(opt.val)}
                    className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${
                      tripType === opt.val
                        ? "border-primary bg-primary"
                        : "border-muted-foreground"
                    }`}
                    data-testid={`radio-trip-${opt.val}`}
                  >
                    {tripType === opt.val && (
                      <div className="w-2 h-2 rounded-full bg-primary-foreground" />
                    )}
                  </div>
                  <span className="text-sm font-medium text-foreground">
                    {opt.label}
                  </span>
                </label>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_1fr_1fr_1fr] gap-3 items-center">
            <div className="bg-muted rounded-xl px-4 py-3 flex items-center gap-2">
              <select
                value={from}
                onChange={(e) => {
                  setFrom(e.target.value);
                  setSearched(false);
                }}
                className="flex-1 bg-transparent text-sm text-foreground text-right focus:outline-none appearance-none cursor-pointer"
                data-testid="select-from"
              >
                <option value="">حدد محطة الذهاب ...</option>
                {cities.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            <button
              onClick={swapCities}
              className="w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow hover:scale-110 transition-transform mx-auto"
              data-testid="button-swap"
            >
              <ArrowLeftRight className="w-4 h-4" />
            </button>

            <div className="bg-muted rounded-xl px-4 py-3 flex items-center gap-2">
              <select
                value={to}
                onChange={(e) => {
                  setTo(e.target.value);
                  setSearched(false);
                }}
                className="flex-1 bg-transparent text-sm text-foreground text-right focus:outline-none appearance-none cursor-pointer"
                disabled={!from}
                data-testid="select-to"
              >
                <option value="">حدد الذهاب أولاً ...</option>
                {cities
                  .filter((c) => c !== from)
                  .map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
              </select>
            </div>

            <div className="bg-muted rounded-xl px-4 py-3 flex items-center gap-2">
              <Calendar className="w-4 h-4 text-muted-foreground shrink-0" />
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="flex-1 bg-transparent text-sm text-foreground focus:outline-none min-w-0"
                placeholder="اختر تاريخ"
                data-testid="input-date"
              />
            </div>

            <div className="bg-muted rounded-xl px-4 py-3 flex items-center gap-2">
              <Users className="w-4 h-4 text-muted-foreground shrink-0" />
              <select
                value={passengers}
                onChange={(e) => setPassengers(Number(e.target.value))}
                className="flex-1 bg-transparent text-sm text-foreground text-right focus:outline-none appearance-none cursor-pointer"
                data-testid="select-passengers"
              >
                {[1, 2, 3, 4, 5].map((n) => (
                  <option key={n} value={n}>
                    {n === 1 ? "راكب واحد" : `${n} ركاب`}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex items-center justify-between mt-4">
            <a
              href="#"
              className="text-primary text-sm font-medium hover:underline flex items-center gap-1"
            >
              <ChevronLeft className="w-4 h-4" />
              مسافر للخارج؟ احجز رحلتك الدولية الآن
            </a>
            <button
              onClick={handleSearch}
              className="flex items-center gap-2 bg-primary text-primary-foreground px-8 py-2.5 rounded-xl font-bold text-sm hover:opacity-90 transition-opacity shadow"
              data-testid="button-search-trips"
            >
              <Search className="w-4 h-4" />
              البحث
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-8">
        {!searched ? (
          <div className="flex flex-col items-center justify-center py-24 gap-4 text-center">
            <div className="w-20 h-20 rounded-2xl bg-primary flex items-center justify-center shadow-xl">
              <Search className="w-10 h-10 text-primary-foreground" />
            </div>
            <h2 className="text-2xl font-bold text-foreground">مستعد للسفر؟</h2>
            <p className="text-muted-foreground">
              ابدأ رحلتك بالبحث عن الرحلات المتاحة
            </p>
          </div>
        ) : results.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 gap-4 text-center">
            <Bus className="w-16 h-16 text-muted-foreground/40" />
            <h2 className="text-xl font-bold text-foreground">
              لا توجد رحلات متاحة
            </h2>
            <p className="text-muted-foreground text-sm">
              حاول تغيير المحطات أو التاريخ
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            <p className="text-sm text-muted-foreground font-medium">
              {results.length} رحلة متاحة من{" "}
              <span className="text-foreground font-bold">{from}</span> إلى{" "}
              <span className="text-foreground font-bold">{to}</span>
            </p>
            {results.map((trip) => (
              <TripCard key={trip.id} trip={trip} passengers={passengers} />
            ))}
          </div>
        )}
      </div>

      <footer className="bg-foreground py-8 px-4 mt-12">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-background/50 text-xs text-center">
            الشركة السعودية للنقل الجماعي (سابتكو) © 2023-2026 جميع الحقوق
            محفوظة
          </p>
          <div className="flex gap-4">
            {["TikTok", "Instagram", "LinkedIn", "X", "Facebook"].map((s) => (
              <a
                key={s}
                href="#"
                className="text-background/40 hover:text-background text-xs transition-colors"
              >
                {s}
              </a>
            ))}
          </div>
        </div>
      </footer>

      <BottomNav active="الرحلات" />
    </div>
  );
}
