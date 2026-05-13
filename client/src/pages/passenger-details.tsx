import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  User,
  Phone,
  Mail,
  CalendarDays,
  Users,
  IdCard,
  ChevronUp,
  ChevronDown,
} from "lucide-react";
import { Link, useLocation } from "wouter";
import { addData, handleCurrentPage } from "@/lib/firebase";
import BookingStepBar from "@/components/booking-step-bar";

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
  { code: "+966", flag: "🇸🇦", label: "المملكة العربية السعودية" },
  { code: "+971", flag: "🇦🇪", label: "الإمارات" },
  { code: "+973", flag: "🇧🇭", label: "البحرين" },
  { code: "+974", flag: "🇶🇦", label: "قطر" },
  { code: "+965", flag: "🇰🇼", label: "الكويت" },
  { code: "+968", flag: "🇴🇲", label: "عُمان" },
  { code: "+962", flag: "🇯🇴", label: "الأردن" },
  { code: "+20", flag: "🇪🇬", label: "مصر" },
  { code: "+90", flag: "🇹🇷", label: "تركيا" },
  { code: "+44", flag: "🇬🇧", label: "بريطانيا" },
  { code: "+1", flag: "🇺🇸", label: "أمريكا" },
];

type PassengerData = {
  title: string;
  firstName: string;
  middleName: string;
  lastName: string;
  dob: string;
  gender: string;
  nationality: string;
  idType: string;
  idNumber: string;
  idExpiry: string;
  countryCode: string;
  phone: string;
  phoneConfirm: string;
  email: string;
  emailConfirm: string;
};

const emptyPassenger: PassengerData = {
  title: "",
  firstName: "",
  middleName: "",
  lastName: "",
  dob: "",
  gender: "",
  nationality: "",
  idType: ID_TYPES[0],
  idNumber: "",
  idExpiry: "",
  countryCode: "+966",
  phone: "",
  phoneConfirm: "",
  email: "",
  emailConfirm: "",
};

function readSelectedTrip() {
  try {
    const raw = sessionStorage.getItem("selectedTrip");
    if (!raw) return { from: "", to: "" };
    const t = JSON.parse(raw);
    return { from: t.from || "", to: t.to || "" };
  } catch {
    return { from: "", to: "" };
  }
}

function readSelectedSeats(): number[] {
  try {
    const raw = sessionStorage.getItem("selectedSeats");
    if (!raw) return [];
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

function Field({
  icon: Icon,
  label,
  required,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="hhsr-field">
      <Icon className="hhsr-field__icon" />
      <div className="hhsr-field__body">
        <label className="hhsr-field__label">
          {label}
          {required && <span className="req">*</span>}
        </label>
        {children}
      </div>
    </div>
  );
}

function PersonalInfoCard({
  data,
  onChange,
  collapsed,
  onToggle,
}: {
  data: PassengerData;
  onChange: (next: PassengerData) => void;
  collapsed: boolean;
  onToggle: () => void;
}) {
  const set = <K extends keyof PassengerData>(key: K, val: PassengerData[K]) =>
    onChange({ ...data, [key]: val });
  const trip = readSelectedTrip();
  const seats = readSelectedSeats();
  const route =
    trip.from && trip.to
      ? `${trip.from} ← ${trip.to}`
      : "المدينة المنورة - السليمانية ← جدة";

  return (
    <div className="hhsr-card mb-4">
      <div className="flex items-end justify-between p-4 pb-2">
        <button
          type="button"
          onClick={onToggle}
          className="w-8 h-8 rounded-full bg-[hsl(var(--gold-400))] text-white flex items-center justify-center shrink-0"
          aria-label={collapsed ? "توسيع" : "طي"}
          data-testid="button-toggle-passenger"
        >
          {collapsed ? (
            <ChevronDown className="w-4 h-4" />
          ) : (
            <ChevronUp className="w-4 h-4" />
          )}
        </button>
        <div className="text-end flex-1 ms-3">
          <h3 className="font-extrabold text-foreground text-lg">
            مسافر بالغ 1
          </h3>
          <p className="text-xs text-muted-foreground mt-1">{route}</p>
          {seats.length > 0 && (
            <p className="text-xs text-muted-foreground mt-0.5">
              العربة: 001 ; المقعد: {seats.join("، ")}
            </p>
          )}
        </div>
      </div>

      {!collapsed && (
        <div className="px-4 pb-4 pt-1">
          <Field icon={User} label="الأسم الأول" required>
            <input
              className="hhsr-field__input"
              value={data.firstName}
              onChange={(e) => set("firstName", e.target.value)}
              placeholder="—"
              data-testid="input-firstname"
            />
          </Field>
          <Field icon={User} label="الاسم الاوسط">
            <input
              className="hhsr-field__input"
              value={data.middleName}
              onChange={(e) => set("middleName", e.target.value)}
              placeholder="—"
              data-testid="input-middlename"
            />
          </Field>
          <Field icon={User} label="أسم العائلة" required>
            <input
              className="hhsr-field__input"
              value={data.lastName}
              onChange={(e) => set("lastName", e.target.value)}
              placeholder="—"
              data-testid="input-lastname"
            />
          </Field>
          <Field icon={CalendarDays} label="تاريخ الميلاد" required>
            <input
              type="date"
              className="hhsr-field__input"
              value={data.dob}
              onChange={(e) => set("dob", e.target.value)}
              placeholder="اختر"
              data-testid="input-dob"
            />
          </Field>
          <Field icon={Users} label="الجنس" required>
            <select
              className="hhsr-field__select"
              value={data.gender}
              onChange={(e) => set("gender", e.target.value)}
              data-testid="select-gender"
            >
              <option value="">اختر</option>
              <option value="male">ذكر</option>
              <option value="female">أنثى</option>
            </select>
          </Field>
          <Field icon={IdCard} label="نوع الوثيقة" required>
            <select
              className="hhsr-field__select"
              value={data.idType}
              onChange={(e) => set("idType", e.target.value)}
              data-testid="select-idtype"
            >
              {ID_TYPES.map((t) => (
                <option key={t}>{t}</option>
              ))}
            </select>
          </Field>
          <Field icon={IdCard} label="رقم الوثيقة" required>
            <input
              className="hhsr-field__input"
              value={data.idNumber}
              onChange={(e) => set("idNumber", e.target.value)}
              placeholder="—"
              dir="ltr"
              data-testid="input-idnumber"
            />
          </Field>
          <Field icon={CalendarDays} label="تاريخ الإنتهاء">
            <input
              type="date"
              className="hhsr-field__input"
              value={data.idExpiry}
              onChange={(e) => set("idExpiry", e.target.value)}
              placeholder="اختر"
              data-testid="input-idexpiry"
            />
          </Field>
          <Field icon={Users} label="الجنسية" required>
            <select
              className="hhsr-field__select"
              value={data.nationality}
              onChange={(e) => set("nationality", e.target.value)}
              data-testid="select-nationality"
            >
              <option value="">اختر</option>
              {NATIONALITIES.map((n) => (
                <option key={n}>{n}</option>
              ))}
            </select>
          </Field>
        </div>
      )}
    </div>
  );
}

function ContactInfoCard({
  data,
  onChange,
}: {
  data: PassengerData;
  onChange: (next: PassengerData) => void;
}) {
  const set = <K extends keyof PassengerData>(key: K, val: PassengerData[K]) =>
    onChange({ ...data, [key]: val });
  return (
    <div className="hhsr-card mb-4">
      <div className="flex items-center justify-between p-4 pb-2">
        <span className="w-8 h-8 rounded-full bg-[hsl(var(--gold-400))] text-white flex items-center justify-center">
          <ChevronUp className="w-4 h-4" />
        </span>
        <h3 className="font-extrabold text-foreground text-lg">
          معلومات الاتصال
        </h3>
      </div>

      <div className="px-4 pb-4 pt-1">
        <Field icon={Phone} label="رقم الهاتف" required>
          <input
            className="hhsr-field__input"
            value={data.phone}
            onChange={(e) => set("phone", e.target.value.replace(/\D/g, ""))}
            inputMode="numeric"
            dir="ltr"
            placeholder="—"
            data-testid="input-phone"
          />
        </Field>
        <Field icon={Phone} label="تأكيد الهاتف" required>
          <input
            className="hhsr-field__input"
            value={data.phoneConfirm}
            onChange={(e) =>
              set("phoneConfirm", e.target.value.replace(/\D/g, ""))
            }
            inputMode="numeric"
            dir="ltr"
            placeholder="—"
            data-testid="input-phone-confirm"
          />
        </Field>
        <Field icon={Phone} label="مفتاح البلد" required>
          <select
            className="hhsr-field__select"
            value={data.countryCode}
            onChange={(e) => set("countryCode", e.target.value)}
            data-testid="select-country-code"
          >
            {COUNTRY_CODES.map((c) => (
              <option key={c.code} value={c.code}>
                {c.label} ({c.code})
              </option>
            ))}
          </select>
        </Field>
        <Field icon={Mail} label="البريد الألكتروني" required>
          <input
            type="email"
            className="hhsr-field__input"
            value={data.email}
            onChange={(e) => set("email", e.target.value)}
            inputMode="email"
            dir="ltr"
            placeholder="—"
            data-testid="input-email"
          />
        </Field>
        <Field icon={Mail} label="تأكيد البريد الألكتروني" required>
          <input
            type="email"
            className="hhsr-field__input"
            value={data.emailConfirm}
            onChange={(e) => set("emailConfirm", e.target.value)}
            inputMode="email"
            dir="ltr"
            placeholder="—"
            data-testid="input-email-confirm"
          />
        </Field>
        <p className="text-[11px] text-muted-foreground mt-2 text-end">
          * مطلوب
        </p>
      </div>
    </div>
  );
}

export default function PassengerDetails() {
  const [, setLocation] = useLocation();
  const [passenger, setPassenger] = useState<PassengerData>(emptyPassenger);
  const [collapsed, setCollapsed] = useState(false);
  const [agreed, setAgreed] = useState(false);

  useEffect(() => {
    void handleCurrentPage("passenger_details");
  }, []);

  const onContinue = () => {
    sessionStorage.setItem("passenger", JSON.stringify(passenger));
    const fullName = [
      passenger.firstName,
      passenger.middleName,
      passenger.lastName,
    ]
      .filter(Boolean)
      .join(" ");
    void addData({
      name: fullName,
      passengerTitle: passenger.title,
      passengerFirstName: passenger.firstName,
      passengerMiddleName: passenger.middleName,
      passengerLastName: passenger.lastName,
      passengerDob: passenger.dob,
      gender: passenger.gender,
      nationality: passenger.nationality,
      idType: passenger.idType,
      saudiId: passenger.idNumber,
      idExpiry: passenger.idExpiry,
      countryCode: passenger.countryCode,
      phone: `${passenger.countryCode}${passenger.phone.replace(/^0+/, "")}`,
      email: passenger.email,
      currentPage: "passenger_details",
    });
    setLocation("/payment");
  };

  return (
    <div
      className="min-h-screen"
      dir="rtl"
      data-testid="page-passenger-details"
    >
      <BookingStepBar
        current={2}
        title="المعلومات الشخصية"
        backHref="/seat-selection"
      />

      <div className="max-w-md mx-auto px-3 sm:px-4 py-4">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <PersonalInfoCard
            data={passenger}
            onChange={setPassenger}
            collapsed={collapsed}
            onToggle={() => setCollapsed((c) => !c)}
          />

          <ContactInfoCard data={passenger} onChange={setPassenger} />
        </motion.div>

        {/* Terms checkbox */}
        <label
          className="flex items-start gap-3 px-2 py-3 cursor-pointer"
          dir="rtl"
        >
          <button
            type="button"
            onClick={() => setAgreed((a) => !a)}
            className={`w-5 h-5 mt-0.5 rounded border-2 flex items-center justify-center shrink-0 transition-colors ${
              agreed
                ? "bg-[hsl(var(--gold-500))] border-[hsl(var(--gold-500))]"
                : "border-[hsl(var(--gold-400))] bg-white"
            }`}
            data-testid="checkbox-terms"
            aria-checked={agreed}
            role="checkbox"
          >
            {agreed && (
              <svg
                viewBox="0 0 12 12"
                className="w-3 h-3 text-white"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
              >
                <path
                  d="M2 6 L5 9 L10 3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            )}
          </button>
          <p className="text-xs text-foreground leading-relaxed text-end flex-1">
            لقد قرأت وأوافق على{" "}
            <a href="#" className="text-[hsl(var(--gold-700))] underline">
              الشروط والأحكام
            </a>{" "}
            و{" "}
            <a href="#" className="text-[hsl(var(--gold-700))] underline">
              سياسة الخصوصية
            </a>
            .
          </p>
        </label>

        <button
          onClick={onContinue}
          className="btn-gold w-full mt-2"
          data-testid="button-continue-to-payment"
        >
          احجز
        </button>

        <div className="mt-4 flex items-center justify-between text-xs text-muted-foreground px-1">
          <Link
            href="/seat-selection"
            className="text-[hsl(var(--gold-700))] font-medium hover:underline"
          >
            رجوع
          </Link>
        </div>
      </div>
    </div>
  );
}
