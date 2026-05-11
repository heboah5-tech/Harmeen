import { useState } from "react";
import {
  ArrowLeftRight,
  Calendar,
  Users,
  Search,
  ChevronLeft,
  Globe,
} from "lucide-react";
import CityCombobox from "@/components/ui/city-combobox";
import PassengerPickerMulti, {
  DEFAULT_PASSENGERS,
  type PassengerCounts,
} from "@/components/ui/passenger-picker-multi";
import { SAUDI_CITIES } from "@/lib/saudi-cities";

type Props = {
  cities: string[];
  fromCity: string;
  toCity: string;
  date: string;
  setFromCity: (v: string) => void;
  setToCity: (v: string) => void;
  setDate: (v: string) => void;
  onSearch: () => void;
  swap: () => void;
  isTransit?: boolean;
  setIsTransit?: (v: boolean) => void;
  passengers?: PassengerCounts;
  setPassengers?: (v: PassengerCounts) => void;
};

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <label className="block text-xs font-bold text-foreground/70 mb-1.5 text-right">
      {children}
    </label>
  );
}

export default function SaptcoSearchPanel({
  cities,
  fromCity,
  toCity,
  date,
  setFromCity,
  setToCity,
  setDate,
  onSearch,
  swap,
  isTransit,
  setIsTransit,
  passengers: passengersProp,
  setPassengers: setPassengersProp,
}: Props) {
  const [tripType, setTripType] = useState<"one" | "round">("one");
  const [internalTransit, setInternalTransit] = useState(false);
  const [internalPassengers, setInternalPassengers] =
    useState<PassengerCounts>(DEFAULT_PASSENGERS);
  const transit = isTransit ?? internalTransit;
  const setTransit = setIsTransit ?? setInternalTransit;
  const passengers = passengersProp ?? internalPassengers;
  const setPassengers = setPassengersProp ?? setInternalPassengers;

  const fullCityList = Array.from(
    new Set([
      ...SAUDI_CITIES,
      ...cities.filter((c) => c && c !== "الكل"),
    ]),
  );

  return (
    <section className="bg-muted/40 border-b border-border" dir="rtl">
      <div className="max-w-6xl mx-auto px-4 py-6">
        <div className="bg-card rounded-2xl shadow-sm border border-border/60 p-5 sm:p-6">
          {/* Top row — transit checkbox + trip type radios */}
          <div className="flex items-center justify-between flex-wrap gap-3 mb-5 pb-5 border-b border-border/60">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={transit}
                onChange={(e) => {
                  setTransit(e.target.checked);
                  try {
                    sessionStorage.setItem(
                      "tripMode",
                      e.target.checked ? "transit" : "direct",
                    );
                    sessionStorage.setItem(
                      "directOnly",
                      e.target.checked ? "0" : "1",
                    );
                  } catch {}
                }}
                className="w-4 h-4 accent-primary cursor-pointer"
                data-testid="checkbox-transit"
              />
              <span className="text-sm font-medium text-foreground">
                البحث في رحلات الترانزيت
              </span>
            </label>

            <div className="flex items-center gap-5">
              {[
                { val: "one" as const, label: "ذهاب فقط" },
                { val: "round" as const, label: "ذهاب وعودة" },
              ].map((opt) => (
                <label
                  key={opt.val}
                  className="flex items-center gap-2 cursor-pointer"
                  onClick={() => setTripType(opt.val)}
                >
                  <span className="text-sm font-medium text-foreground">
                    {opt.label}
                  </span>
                  <span
                    className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${
                      tripType === opt.val
                        ? "border-primary"
                        : "border-muted-foreground/40"
                    }`}
                    data-testid={`radio-trip-${opt.val}`}
                  >
                    {tripType === opt.val && (
                      <span className="w-2.5 h-2.5 rounded-full bg-primary" />
                    )}
                  </span>
                </label>
              ))}
            </div>
          </div>

          {/* Row 1 — from / swap / to */}
          <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_1fr] gap-4 items-end mb-4">
            <div>
              <FieldLabel>من</FieldLabel>
              <CityCombobox
                value={fromCity === "الكل" ? "" : fromCity}
                onChange={(v) => setFromCity(v || "الكل")}
                options={fullCityList}
                placeholder="حدد محطة الذهاب ..."
                testId="search-panel-from"
              />
            </div>

            <div className="flex justify-center md:pb-1">
              <button
                onClick={swap}
                className="w-11 h-11 rounded-full bg-[#3CB4D8] text-white flex items-center justify-center shadow-md hover:scale-110 hover:shadow-lg transition-all"
                data-testid="button-swap"
                aria-label="تبديل"
              >
                <ArrowLeftRight className="w-5 h-5" />
              </button>
            </div>

            <div>
              <FieldLabel>إلى</FieldLabel>
              <CityCombobox
                value={toCity === "الكل" ? "" : toCity}
                onChange={(v) => setToCity(v || "الكل")}
                options={fullCityList}
                placeholder="حدد الذهاب أولاً ..."
                testId="search-panel-to"
              />
            </div>
          </div>

          {/* Row 2 — date / passengers */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-5">
            <div>
              <FieldLabel>موعد المغادرة</FieldLabel>
              <div className="relative">
                <Calendar className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none z-10" />
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full bg-white border border-border rounded-xl px-4 py-3 pr-10 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/10 transition-all text-right"
                  data-testid="input-date"
                />
              </div>
            </div>

            <div>
              <FieldLabel>المسافرين ونوع التذكرة</FieldLabel>
              <div className="relative">
                <Users className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none z-10" />
                <div className="[&_button]:!pr-10">
                  <PassengerPickerMulti
                    value={passengers}
                    onChange={setPassengers}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Bottom row — search + international link */}
          <div className="flex items-center justify-between flex-wrap gap-3">
            <button
              onClick={() => {
                try {
                  sessionStorage.setItem(
                    "searchPassengers",
                    JSON.stringify(passengers),
                  );
                } catch {}
                onSearch();
              }}
              className="flex items-center gap-2 bg-primary text-primary-foreground px-8 py-3 rounded-xl font-bold text-sm hover:bg-primary/90 transition-all shadow-md hover:shadow-lg hover:-translate-y-0.5"
              data-testid="button-search-trips"
            >
              <Search className="w-4 h-4" />
              البحث
            </button>

            <a
              href="#"
              className="text-primary text-sm font-medium hover:underline flex items-center gap-1.5"
            >
              <Globe className="w-4 h-4" />
              مسافر للخارج؟ احجز رحلتك الدولية الآن
              <ChevronLeft className="w-4 h-4" />
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
