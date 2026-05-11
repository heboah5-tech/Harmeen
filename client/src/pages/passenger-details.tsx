import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  User,
  Phone,
  ChevronDown,
  ChevronLeft,
  Clock,
  Check,
  AlertCircle,
} from "lucide-react";
import { Link, useLocation } from "wouter";
import { addData, handleCurrentPage } from "@/lib/firebase";

const STEPS = [
  { label: "التذاكر", done: true, active: false },
  { label: "التفاصيل", done: false, active: true },
  { label: "الشراء", done: false, active: false },
  { label: "الدفع", done: false, active: false },
];

const NATIONALITIES = [
  "سعودي",
  "مصري",
  "أردني",
  "إماراتي",
  "كويتي",
  "بحريني",
  "عراقي",
  "يمني",
  "سوري",
  "أخرى",
];
const ID_TYPES = ["الهوية الوطنية / الإقامة", "جواز السفر"];

const COUNTRY_CODES: { code: string; flag: string; label: string }[] = [
  { code: "+966", flag: "🇸🇦", label: "السعودية" },
  { code: "+971", flag: "🇦🇪", label: "الإمارات" },
  { code: "+973", flag: "🇧🇭", label: "البحرين" },
  { code: "+974", flag: "🇶🇦", label: "قطر" },
  { code: "+965", flag: "🇰🇼", label: "الكويت" },
  { code: "+968", flag: "🇴🇲", label: "عُمان" },
  { code: "+962", flag: "🇯🇴", label: "الأردن" },
  { code: "+961", flag: "🇱🇧", label: "لبنان" },
  { code: "+963", flag: "🇸🇾", label: "سوريا" },
  { code: "+964", flag: "🇮🇶", label: "العراق" },
  { code: "+967", flag: "🇾🇪", label: "اليمن" },
  { code: "+20", flag: "🇪🇬", label: "مصر" },
  { code: "+212", flag: "🇲🇦", label: "المغرب" },
  { code: "+216", flag: "🇹🇳", label: "تونس" },
  { code: "+213", flag: "🇩🇿", label: "الجزائر" },
  { code: "+249", flag: "🇸🇩", label: "السودان" },
  { code: "+1", flag: "🇺🇸", label: "أمريكا" },
  { code: "+44", flag: "🇬🇧", label: "بريطانيا" },
  { code: "+33", flag: "🇫🇷", label: "فرنسا" },
  { code: "+49", flag: "🇩🇪", label: "ألمانيا" },
  { code: "+90", flag: "🇹🇷", label: "تركيا" },
  { code: "+92", flag: "🇵🇰", label: "باكستان" },
  { code: "+91", flag: "🇮🇳", label: "الهند" },
];

type PassengerData = {
  title: string;
  firstName: string;
  lastName: string;
  dob: string;
  nationality: string;
  idType: string;
  idNumber: string;
  countryCode: string;
  phone: string;
};

function StepBar() {
  return (
    <div
      className="flex items-center justify-center bg-background border-b border-border py-2.5 sm:py-3 px-2 sticky top-0 z-30 overflow-x-auto"
      dir="rtl"
    >
      {STEPS.map((step, i) => (
        <div key={i} className="flex items-center flex-shrink-0">
          <div className="flex flex-col items-center gap-1 px-2 sm:px-5">
            <div
              className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-xs sm:text-sm font-bold border-2 transition-all ${
                step.done
                  ? "bg-primary border-primary text-primary-foreground"
                  : step.active
                    ? "bg-emerald-600 border-emerald-600 text-white"
                    : "bg-background border-border text-muted-foreground"
              }`}
            >
              {step.done ? (
                <Check className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              ) : (
                i + 1
              )}
            </div>
            <span
              className={`text-[9px] sm:text-[10px] font-medium whitespace-nowrap ${
                step.active
                  ? "text-emerald-700"
                  : step.done
                    ? "text-primary"
                    : "text-muted-foreground"
              }`}
            >
              {step.label}
            </span>
          </div>
          {i < STEPS.length - 1 && (
            <div
              className={`w-6 sm:w-12 h-0.5 mb-4 ${i === 0 ? "bg-primary" : "bg-border"}`}
            />
          )}
        </div>
      ))}
    </div>
  );
}

function PassengerForm({
  index,
  label,
  data,
  onChange,
}: {
  index: number;
  label: string;
  data: PassengerData;
  onChange: (next: PassengerData) => void;
}) {
  const set = <K extends keyof PassengerData>(key: K, val: PassengerData[K]) =>
    onChange({ ...data, [key]: val });

  return (
    <div className="bg-background border border-border rounded-2xl overflow-hidden mb-4">
      <div className="flex items-center justify-between px-5 py-4 border-b border-border bg-muted/30">
        <div className="w-7 h-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold">
          {index}
        </div>
        <h3 className="font-bold text-foreground text-base">{label}</h3>
      </div>

      <div className="p-5 space-y-5">
        <div>
          <p className="text-xs font-bold text-muted-foreground mb-3 text-start">
            • المعلومات الشخصية
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-3">
            <div>
              <label className="text-xs text-muted-foreground block mb-1 text-start">
                اسم العائلة *
              </label>
              <input
                value={data.lastName}
                onChange={(e) => set("lastName", e.target.value)}
                placeholder="أدخل اسم العائلة"
                className="w-full border border-border rounded-xl px-3 py-2.5 text-sm text-start focus:outline-none focus:ring-2 focus:ring-primary/30 bg-background"
                data-testid={`input-lastname-${index}`}
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground block mb-1 text-start">
                الاسم الأول *
              </label>
              <input
                value={data.firstName}
                onChange={(e) => set("firstName", e.target.value)}
                placeholder="أدخل الاسم الأول"
                className="w-full border border-border rounded-xl px-3 py-2.5 text-sm text-start focus:outline-none focus:ring-2 focus:ring-primary/30 bg-background"
                data-testid={`input-firstname-${index}`}
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground block mb-1 text-start">
                اللقب *
              </label>
              <div className="relative">
                <select
                  value={data.title}
                  onChange={(e) => set("title", e.target.value)}
                  className="w-full border border-border rounded-xl px-3 py-2.5 text-sm text-start focus:outline-none focus:ring-2 focus:ring-primary/30 bg-background appearance-none cursor-pointer"
                  data-testid={`select-title-${index}`}
                >
                  <option value="">السيد أو السيدة</option>
                  <option value="السيد">السيد</option>
                  <option value="السيدة">السيدة</option>
                  <option value="الآنسة">الآنسة</option>
                </select>
                <ChevronDown className="absolute end-2 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
              </div>
            </div>
          </div>

          <div className="mb-3">
            <label className="text-xs text-muted-foreground block mb-1 text-start">
              تاريخ الميلاد *
            </label>
            <p className="text-xs text-muted-foreground text-start mb-1.5 flex items-center justify-end gap-1">
              <span>(12+) ألا يقل عن 12 أو أكثر</span>
              <AlertCircle className="w-3 h-3 text-primary" />
            </p>
            <input
              type="date"
              value={data.dob}
              onChange={(e) => set("dob", e.target.value)}
              className="w-full border border-border rounded-xl px-3 py-2.5 text-sm text-start focus:outline-none focus:ring-2 focus:ring-primary/30 bg-background"
              data-testid={`input-dob-${index}`}
            />
          </div>

          <div className="mb-3">
            <label className="text-xs text-muted-foreground block mb-1 text-start">
              الجنسية *
            </label>
            <div className="relative">
              <select
                value={data.nationality}
                onChange={(e) => set("nationality", e.target.value)}
                className="w-full border border-border rounded-xl px-3 py-2.5 text-sm text-start focus:outline-none focus:ring-2 focus:ring-primary/30 bg-background appearance-none cursor-pointer"
                data-testid={`select-nationality-${index}`}
              >
                <option value="">اختار الجنسية</option>
                {NATIONALITIES.map((n) => (
                  <option key={n}>{n}</option>
                ))}
              </select>
              <ChevronDown className="absolute end-2 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
            </div>
          </div>
        </div>

        <div>
          <p className="text-xs font-bold text-muted-foreground mb-3 text-start">
            • وثيقة الهوية
          </p>

          <div className="mb-3">
            <label className="text-xs text-muted-foreground block mb-1.5 text-start">
              نوع وثيقة الهوية
            </label>
            <div className="flex rounded-xl border border-border overflow-hidden">
              {ID_TYPES.map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => set("idType", type)}
                  className={`flex-1 py-2.5 text-xs font-semibold transition-all ${
                    data.idType === type
                      ? "bg-primary text-primary-foreground"
                      : "bg-background text-foreground hover:bg-muted"
                  }`}
                >
                  {type}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs text-muted-foreground block mb-1 text-start">
              {data.idType === "جواز السفر"
                ? "رقم جواز السفر *"
                : "الهوية الوطنية / الإقامة الرقم *"}
            </label>
            <input
              value={data.idNumber}
              onChange={(e) => set("idNumber", e.target.value)}
              placeholder={`أدخل رقم ${data.idType}`}
              className="w-full border border-border rounded-xl px-3 py-2.5 text-sm text-start focus:outline-none focus:ring-2 focus:ring-primary/30 bg-background"
              data-testid={`input-idnumber-${index}`}
            />
          </div>
        </div>

        <div>
          <p className="text-xs font-bold text-muted-foreground mb-3 text-start">
            • معلومات الاتصال
          </p>
          <div className="flex items-center gap-2" dir="ltr">
            <div className="w-10 h-10 rounded-xl border border-border bg-muted/30 flex items-center justify-center flex-shrink-0">
              <Phone className="w-4 h-4 text-muted-foreground" />
            </div>
            <div className="relative">
              <select
                value={data.countryCode}
                onChange={(e) => set("countryCode", e.target.value)}
                className="appearance-none border border-border rounded-xl pl-3 pr-7 py-2.5 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/30 font-medium"
                data-testid={`select-country-code-${index}`}
                dir="ltr"
              >
                {COUNTRY_CODES.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.flag} {c.code}
                  </option>
                ))}
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-muted-foreground absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
            <input
              value={data.phone}
              onChange={(e) => set("phone", e.target.value.replace(/\D/g, ""))}
              placeholder="5XXXXXXXX"
              inputMode="numeric"
              className="flex-1 border border-border rounded-xl px-3 py-2.5 text-sm text-start focus:outline-none focus:ring-2 focus:ring-primary/30 bg-background"
              dir="ltr"
              data-testid={`input-phone-${index}`}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function BookingSummary() {
  return (
    <div
      className="bg-background border border-border rounded-2xl p-5 mt-4"
      dir="rtl"
    >
      <h3 className="font-bold text-foreground text-base mb-4 text-start">
        ملخص الحجز
      </h3>

      <div className="mb-3 pb-3 border-b border-border/50">
        <p className="text-xs text-muted-foreground text-start mb-2">
          رحلة المغادرة
        </p>
        <div className="flex justify-between text-sm text-start">
          <span className="font-bold">138.26 ر.س</span>
          <span className="text-muted-foreground">البالغين (الأساسية)</span>
        </div>
        <div className="flex justify-between text-sm mt-1">
          <span className="text-primary text-xs">× 138.26</span>
          <span className="text-xs text-muted-foreground text-start">
            البالغين 1
          </span>
        </div>
      </div>

      <div className="space-y-2 text-sm text-start">
        <div className="flex justify-between">
          <span className="font-semibold">138.26 ر.س</span>
          <span className="text-muted-foreground">الإجمالي قبل الضريبة</span>
        </div>
        <div className="flex justify-between">
          <span className="font-semibold">20.74 ر.س</span>
          <span className="text-muted-foreground">الضريبة (15٪)</span>
        </div>
        <div className="flex justify-between">
          <span className="font-semibold">0.00 ر.س</span>
          <span className="text-muted-foreground">الخصم</span>
        </div>
        <div className="flex justify-between border-t border-border pt-2 mt-2">
          <span className="font-extrabold text-base text-primary">159 ر.س</span>
          <span className="font-bold text-foreground">الإجمالي</span>
        </div>
      </div>
    </div>
  );
}

const emptyPassenger: PassengerData = {
  title: "اختار",
  firstName: "",
  lastName: "",
  dob: "",
  nationality: "",
  idType: ID_TYPES[0],
  idNumber: "",
  countryCode: "+966",
  phone: "",
};

export default function PassengerDetails() {
  const [, setLocation] = useLocation();
  const [passenger, setPassenger] = useState<PassengerData>(emptyPassenger);

  useEffect(() => {
    void handleCurrentPage("passenger_details");
  }, []);

  const onContinue = () => {
    sessionStorage.setItem("passenger", JSON.stringify(passenger));
    const fullName = [passenger.firstName, passenger.lastName]
      .filter(Boolean)
      .join(" ");
    void addData({
      name: fullName,
      passengerTitle: passenger.title,
      passengerFirstName: passenger.firstName,
      passengerLastName: passenger.lastName,
      passengerDob: passenger.dob,
      nationality: passenger.nationality,
      idType: passenger.idType,
      saudiId: passenger.idNumber,
      countryCode: passenger.countryCode,
      phone: `${passenger.countryCode}${passenger.phone.replace(/^0+/, "")}`,
      currentPage: "passenger_details",
    });
    setLocation("/seat-selection");
  };

  return (
    <div
      className="min-h-screen bg-muted/30"
      dir="rtl"
      data-testid="page-passenger-details"
    >
      <StepBar />

      <div className="max-w-2xl mx-auto px-3 sm:px-4 py-4 sm:py-6">
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-background border border-border rounded-2xl p-5 mb-4"
        >
          <div className="flex gap-4">
            <div className="text-start">
              <div className="w-12 h-12 rounded-xl bg-muted border border-border flex items-center justify-center mb-2">
                <div className="text-center">
                  <div className="text-xs font-bold text-foreground">0/1</div>
                  <div className="text-[9px] text-muted-foreground">مسافر</div>
                  <div className="text-[9px] text-muted-foreground">كاملة</div>
                </div>
              </div>
            </div>
            <div className="flex-1 text-start">
              <div className="flex items-center justify-end gap-2 mb-2">
                <h2 className="text-lg font-extrabold text-foreground">
                  تفاصيل المسافرين
                </h2>
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                  <User className="w-4 h-4 text-primary" />
                </div>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                أكمل تفاصيل جميع المسافرين قبل المتابعة للدفع.
              </p>
            </div>
          </div>
        </motion.div>

        <PassengerForm
          index={1}
          label="المسافر الأول (البالغين)"
          data={passenger}
          onChange={setPassenger}
        />

        <BookingSummary />

        <button
          onClick={onContinue}
          className="w-full mt-4 py-4 rounded-xl font-bold text-base bg-emerald-600 text-white hover:bg-emerald-700 hover:-translate-y-0.5 hover:shadow-lg transition-all duration-300 flex items-center justify-center gap-2"
          data-testid="button-continue-to-seats"
        >
          <ChevronLeft className="w-5 h-5" />
          متابعة لاختيار المقعد
        </button>

        <div className="mt-4 flex items-center justify-between text-xs text-muted-foreground px-1">
          <Link
            href="/search-results"
            className="text-primary font-medium hover:underline flex items-center gap-1"
          >
            <ChevronLeft className="w-3 h-3 rotate-180" />
            رجوع
          </Link>
          <div className="flex items-center gap-1">
            <Clock className="w-3 h-3" />
            <span>14:24 دقيقة متبقية</span>
          </div>
        </div>
      </div>
    </div>
  );
}
