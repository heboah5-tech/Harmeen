import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import {
  Train,
  Calendar as CalendarIcon,
  ChevronDown,
  X,
  MapPin,
  Check,
  Menu,
  User,
  Plus,
  Minus,
  Circle,
} from "lucide-react";
import { addData, handleCurrentPage } from "@/lib/firebase";
import { Calendar as CalendarPicker } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import heroBg from "@assets/makkah_hero_bg.jpg";
import sstpcLogo from "@assets/sstpc_logo.png";
import hhrLogo from "@assets/hhr_logo.png";

const STATIONS = [
  { id: "1", name: "مكة المكرمة" },
  { id: "2", name: "السليمانية - جدة" },
  { id: "3", name: "المطار- جدة" },
  { id: "4", name: "مدينة الملك عبدالله الاقتصادية" },
  { id: "5", name: "المدينة المنورة" },
];

type Station = (typeof STATIONS)[number];

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
const fmtDate = (iso: string) => {
  if (!iso) return "";
  const d = new Date(iso);
  return `${d.getDate()} ${AR_MONTHS[d.getMonth()]} ${d.getFullYear()}`;
};
const todayIso = () => new Date().toISOString().split("T")[0];
const tomorrowIso = () => {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d.toISOString().split("T")[0];
};

type TabKey = "new" | "schedule" | "manage";

export default function Book() {
  const [, setLocation] = useLocation();
  const [tab, setTab] = useState<TabKey>("new");
  const [tripType, setTripType] = useState<"oneWay" | "roundTrip">("oneWay");
  const [from, setFrom] = useState<Station | null>(null);
  const [to, setTo] = useState<Station | null>(null);
  const [picker, setPicker] = useState<null | "from" | "to">(null);
  const [departDate, setDepartDate] = useState<string>("");
  const [returnDate, setReturnDate] = useState<string>(tomorrowIso());
  const [paxOpen, setPaxOpen] = useState(false);
  const [adults, setAdults] = useState(1);
  const [children, setChildren] = useState(0);
  const [infants, setInfants] = useState(0);
  const [showCookies, setShowCookies] = useState(true);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    void handleCurrentPage("book");
  }, []);

  const pick = (s: Station) => {
    if (picker === "from") setFrom(s);
    if (picker === "to") setTo(s);
    setPicker(null);
  };

  const guestsLabel = (() => {
    const total = adults + children + infants;
    if (total === 0) return "";
    const parts: string[] = [];
    if (adults) parts.push(`${adults} البالغين`);
    if (children) parts.push(`${children} أطفال`);
    if (infants) parts.push(`${infants} رضع`);
    return parts.join("، ");
  })();

  const onSearch = () => {
    setSubmitted(true);
    if (!from || !to || from.id === to.id || !departDate) return;
    sessionStorage.setItem(
      "searchPassengers",
      JSON.stringify({ adults, children, infants, special: 0, student: 0 }),
    );
    void addData({
      from: from.name,
      to: to.name,
      fromId: from.id,
      toId: to.id,
      searchDate: departDate,
      adults,
      children,
      infants,
      tripType,
      bookingDate: fmtDate(departDate),
      returnDate: tripType === "roundTrip" ? fmtDate(returnDate) : "",
      ticketQuantity: adults + children + infants,
      currentPage: "book",
    });
    const params = new URLSearchParams({
      from: from.name,
      to: to.name,
      fromId: from.id,
      toId: to.id,
      date: departDate,
      adults: String(adults),
      children: String(children),
      infants: String(infants),
    });
    setLocation(`/schedule?${params.toString()}`);
  };

  return (
    <div
      dir="rtl"
      className="min-h-screen bg-white flex flex-col"
      data-testid="page-book"
    >
      {/* Top gold bar */}
      <div className="bg-[#b08a3e] text-white text-xs">
        <div className="max-w-6xl mx-auto px-4 h-9 flex items-center justify-between">
          <button
            type="button"
            className="flex items-center gap-1.5 font-bold tracking-wider hover:opacity-80"
            data-testid="button-lang"
          >
            <User className="w-4 h-4" />
            ENGLISH
          </button>
          <span />
        </div>
      </div>

      {/* White logo header */}
      <header className="bg-white border-b border-black/5">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center">
            <img
              src={hhrLogo}
              alt="قطار الحرمين السريع - Haramain High Speed Railway"
              className="h-10 sm:h-12 w-auto object-contain"
              data-testid="img-logo-hhr"
            />
          </div>
          <div className="flex items-center gap-3">
            <div className="pl-3 border-l border-black/10">
              <img
                src={sstpcLogo}
                alt="Operated by SSTPC"
                className="h-8 sm:h-10 w-auto object-contain"
                data-testid="img-logo-sstpc"
              />
            </div>
            <button type="button" className="p-2" data-testid="button-menu">
              <Menu className="w-6 h-6 text-[#b08a3e]" />
            </button>
          </div>
        </div>
      </header>

      {/* Hero with booking card */}
      <section
        className="relative flex-1 overflow-hidden pb-16 bg-[#060f1a]"
        style={{
          backgroundImage: `url(${heroBg})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundRepeat: "no-repeat",
        }}
      >
        <div className="absolute inset-0 bg-gradient-to-b from-[#0b1c2c]/55 via-[#0b1c2c]/45 to-[#060f1a]/85" />
        <div className="relative max-w-md mx-auto px-4 pt-8 pb-10 sm:pb-16">
          <BookingCard
            tab={tab}
            setTab={setTab}
            tripType={tripType}
            setTripType={setTripType}
            from={from}
            to={to}
            onPickFrom={() => setPicker("from")}
            onPickTo={() => setPicker("to")}
            departDate={departDate}
            setDepartDate={setDepartDate}
            returnDate={returnDate}
            setReturnDate={setReturnDate}
            adults={adults}
            setAdults={setAdults}
            childrenCount={children}
            setChildren={setChildren}
            infants={infants}
            setInfants={setInfants}
            paxOpen={paxOpen}
            setPaxOpen={setPaxOpen}
            guestsLabel={guestsLabel}
            submitted={submitted}
            onSearch={onSearch}
          />

          <div className="grid grid-cols-2 gap-3 mt-6">
            <PromoCard
              title="كم حقيبة يسمح بها قطار الحرمين؟"
              subtitle="حقيبة سفر · حقيبة يد"
              accent="#f3eadb"
              testid="promo-luggage"
            >
              <LuggageArt />
            </PromoCard>
            <PromoCard
              title="رحلة هادئة بقطار الحرمين السريع"
              subtitle="تجربة على متن القطار"
              accent="#0e3b2f"
              dark
              testid="promo-interior"
            >
              <InteriorArt />
            </PromoCard>
          </div>
        </div>
      </section>

      {/* Cookie banner */}
      <AnimatePresence>
        {showCookies && (
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ duration: 0.3 }}
            className="fixed bottom-0 left-0 right-0 bg-[#1f2937] text-white px-4 py-3 z-50 shadow-2xl"
            data-testid="banner-cookies"
          >
            <div className="max-w-3xl mx-auto flex items-center justify-between gap-3 flex-wrap">
              <p className="text-xs sm:text-sm leading-relaxed flex-1 min-w-[220px]">
                يستخدم موقع الحرمين ملفات تعريف الارتباط لنقدم لك تجربة مستخدم
                أكثر اكتمالًا. تعلم المزيد في{" "}
                <a className="underline font-bold">سياسة الكوكيز.</a>
              </p>
              <button
                onClick={() => setShowCookies(false)}
                className="flex items-center gap-1.5 text-sm font-bold hover:opacity-80"
                data-testid="button-cookies-close"
              >
                <X className="w-4 h-4" />
                إغلاق وقبول
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <StationPicker
        open={picker !== null}
        title={picker === "from" ? "من" : "إلى"}
        selected={picker === "from" ? from : to}
        excluded={picker === "from" ? to : from}
        onClose={() => setPicker(null)}
        onPick={pick}
      />
    </div>
  );
}

/* ---------- Booking card ---------- */

function BookingCard(props: {
  tab: TabKey;
  setTab: (t: TabKey) => void;
  tripType: "oneWay" | "roundTrip";
  setTripType: (t: "oneWay" | "roundTrip") => void;
  from: Station | null;
  to: Station | null;
  onPickFrom: () => void;
  onPickTo: () => void;
  departDate: string;
  setDepartDate: (s: string) => void;
  returnDate: string;
  setReturnDate: (s: string) => void;
  adults: number;
  setAdults: (n: number) => void;
  childrenCount: number;
  setChildren: (n: number) => void;
  infants: number;
  setInfants: (n: number) => void;
  paxOpen: boolean;
  setPaxOpen: (b: boolean) => void;
  guestsLabel: string;
  submitted: boolean;
  onSearch: () => void;
}) {
  const {
    tab,
    setTab,
    tripType,
    setTripType,
    from,
    to,
    onPickFrom,
    onPickTo,
    departDate,
    setDepartDate,
    returnDate,
    setReturnDate,
    adults,
    setAdults,
    childrenCount,
    setChildren,
    infants,
    setInfants,
    paxOpen,
    setPaxOpen,
    guestsLabel,
    submitted,
    onSearch,
  } = props;

  const dateError = submitted && !departDate;
  const fromError = submitted && !from;
  const toError = submitted && !to;

  return (
    <div
      className="bg-white rounded-md shadow-2xl overflow-hidden"
      data-testid="card-booking"
      dir="rtl"
    >
      {/* Tabs */}
      <div className="grid grid-cols-3 border-b border-black/10 bg-white">
        <TabButton
          label="حجز جديد"
          active={tab === "new"}
          onClick={() => setTab("new")}
          icon="train"
          testid="tab-new"
        />
        <TabButton
          label="الجدول الزمني"
          active={tab === "schedule"}
          onClick={() => setTab("schedule")}
          icon="calendar"
          testid="tab-schedule"
        />
        <TabButton
          label="إدارة الرحلات"
          active={tab === "manage"}
          onClick={() => setTab("manage")}
          icon="ticket"
          testid="tab-manage"
        />
      </div>

      {tab === "new" && (
        <>
          <div className="px-5 pt-5 flex items-center gap-6 justify-start">
            <RadioPill
              label="ذهاب وعودة"
              checked={tripType === "roundTrip"}
              onClick={() => setTripType("roundTrip")}
              testid="radio-round"
            />
            <RadioPill
              label="ذهاب فقط"
              checked={tripType === "oneWay"}
              onClick={() => setTripType("oneWay")}
              testid="radio-one"
            />
          </div>
          <FieldRow
            label="من"
            required
            error={fromError}
            onClick={onPickFrom}
            testid="field-from"
            icon={<Train className="w-5 h-5 text-[#b08a3e] -scale-x-100" />}
            value={from?.name}
            placeholder="من"
          />
          <FieldRow
            label="إلى"
            required
            error={toError}
            onClick={onPickTo}
            testid="field-to"
            icon={<MapPin className="w-5 h-5 text-[#b08a3e]" />}
            value={to?.name}
            placeholder="إلى"
          />
          <DateRow
            label="متى السفر؟"
            required
            error={dateError}
            value={departDate}
            onChange={setDepartDate}
            testid="field-date"
          />
          {tripType === "roundTrip" && (
            <DateRow
              label="تاريخ العودة"
              required
              error={false}
              value={returnDate}
              onChange={setReturnDate}
              min={departDate}
              testid="field-return-date"
            />
          )}
          <GuestsRow
            open={paxOpen}
            setOpen={setPaxOpen}
            label="الضيوف"
            valueLabel={guestsLabel}
            adults={adults}
            setAdults={setAdults}
            children={childrenCount}
            setChildren={setChildren}
            infants={infants}
            setInfants={setInfants}
          />
        </>
      )}

      {tab === "schedule" && (
        <>
          <FieldRow
            label="من"
            required
            error={fromError}
            onClick={onPickFrom}
            testid="field-from-sched"
            icon={<Train className="w-5 h-5 text-[#b08a3e] -scale-x-100" />}
            value={from?.name}
            placeholder="من"
          />
          <FieldRow
            label="إلى"
            required
            error={toError}
            onClick={onPickTo}
            testid="field-to-sched"
            icon={<MapPin className="w-5 h-5 text-[#b08a3e]" />}
            value={to?.name}
            placeholder="إلى"
          />
          <DateRow
            label="متى السفر؟"
            required
            error={dateError}
            value={departDate}
            onChange={setDepartDate}
            testid="field-date-sched"
          />
        </>
      )}

      {tab === "manage" && (
        <div className="px-5 py-8 text-center text-sm text-[#0b1c2c]/60">
          <p className="mb-2 font-bold text-[#0b1c2c]">إدارة الرحلات</p>
          <p>قريباً — تابع رحلتك وتفاصيل تذكرتك من هنا.</p>
        </div>
      )}

      <div className="px-5 pt-5 pb-1">
        <button
          onClick={onSearch}
          className="w-full bg-[#b08a3e] hover:bg-[#9a7831] active:scale-[0.99] text-white py-3 font-bold text-base transition rounded-sm shadow-md"
          data-testid="button-search"
        >
          البحث
        </button>
      </div>

      <p className="px-5 pt-3 pb-4 text-xs text-[#c0392b] text-start">
        * مطلوب
      </p>
    </div>
  );f
}

function TabButton({
  label,
  active,
  onClick,
  icon,
  testid,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
  icon: "train" | "calendar" | "ticket";
  testid: string;
}) {
  const Icon =
    icon === "train" ? Train : icon === "calendar" ? CalendarIcon : Train;
  return (
    <button
      type="button"
      onClick={onClick}
      className="relative py-3 flex items-center justify-center gap-2 text-sm transition"
      data-testid={testid}
    >
      <Icon
        className={`w-4 h-4 ${active ? "text-[#0b1c2c]" : "text-[#0b1c2c]/40"}`}
      />
      <span
        className={`${active ? "text-[#0b1c2c] font-extrabold" : "text-[#0b1c2c]/55 font-semibold"}`}
      >
        {label}
      </span>
      {active && (
        <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-12 h-0.5 bg-[#b08a3e] rounded-full" />
      )}
    </button>
  );
}

function RadioPill({
  label,
  checked,
  onClick,
  testid,
}: {
  label: string;
  checked: boolean;
  onClick: () => void;
  testid: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center gap-2 text-sm font-semibold text-[#0b1c2c]"
      data-testid={testid}
    >
      <span
        className={`w-5 h-5 rounded-full flex items-center justify-center border-2 ${checked ? "border-[#b08a3e]" : "border-[#0b1c2c]/30"}`}
      >
        {checked ? (
          <Check className="w-3.5 h-3.5 text-[#b08a3e]" strokeWidth={3} />
        ) : (
          <Circle className="w-2 h-2 text-transparent" />
        )}
      </span>
      <span>{label}</span>
    </button>
  );
}

function FieldRow({
  label,
  required,
  error,
  onClick,
  icon,
  value,
  placeholder,
  testid,
}: {
  label: string;
  required?: boolean;
  error?: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  value?: string;
  placeholder: string;
  testid: string;
}) {
  return (
    <div className="px-5 pt-4" dir="rtl">
      <label className="block text-sm font-bold text-[#0b1c2c] mb-1.5 text-start">
        {label}
        {required && <span className="text-[#c0392b]"> *</span>}
      </label>
      <button
        type="button"
        onClick={onClick}
        className={`w-full flex items-center justify-between gap-2 py-2.5 border-b ${error ? "border-[#c0392b]" : "border-black/15"} hover:border-[#b08a3e] transition`}
        data-testid={testid}
      >
        <ChevronDown className="w-5 h-5 text-[#0b1c2c]/50 shrink-0" />
        <span
          className={`flex-1 text-start text-sm ${value ? "text-[#0b1c2c] font-semibold" : "text-[#0b1c2c]/40"}`}
        >
          {value || placeholder}
        </span>
        {icon}
      </button>
      {error && (
        <p className="mt-1 text-[11px] text-[#c0392b] text-start">
          هذا الحقل مطلوب
        </p>
      )}
    </div>
  );
}

function DateRow({
  label,
  required,
  error,
  value,
  onChange,
  min,
  testid,
}: {
  label: string;
  required?: boolean;
  error?: boolean;
  value: string;
  onChange: (v: string) => void;
  min?: string;
  testid: string;
}) {
  const minDate = min ? new Date(min) : new Date();
  const selected = value ? new Date(value) : undefined;
  const [open, setOpen] = useState(false);
  return (
    <div className="px-5 pt-4">
      <label className="block text-sm font-bold text-[#0b1c2c] mb-1.5 text-start">
        {label}
        {required && <span className="text-[#c0392b]"> *</span>}
      </label>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            className={`w-full flex items-center justify-between gap-2 py-2.5 border-b ${error ? "border-[#c0392b]" : "border-black/15"} hover:border-[#b08a3e] transition`}
            data-testid={testid}
          >
            <ChevronDown className="w-5 h-5 text-[#0b1c2c]/50 shrink-0 opacity-0" />
            <span
              className={`flex-1 text-start text-sm ${value ? "text-[#0b1c2c] font-semibold" : "text-[#0b1c2c]/40"}`}
            >
              {value ? fmtDate(value) : "يوم/شهر/سنة"}
            </span>
            <CalendarIcon className="w-5 h-5 text-[#b08a3e]" />
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="end">
          <CalendarPicker
            mode="single"
            selected={selected}
            onSelect={(d) => {
              if (d) {
                const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
                onChange(iso);
                setOpen(false);
              }
            }}
            disabled={{ before: minDate }}
            initialFocus
          />
        </PopoverContent>
      </Popover>
      {error && (
        <p className="mt-1 text-[11px] text-[#c0392b] text-start">
          هذا الحقل مطلوب
        </p>
      )}
    </div>
  );
}

function GuestsRow({
  open,
  setOpen,
  label,
  valueLabel,
  adults,
  setAdults,
  children,
  setChildren,
  infants,
  setInfants,
}: {
  open: boolean;
  setOpen: (b: boolean) => void;
  label: string;
  valueLabel: string;
  adults: number;
  setAdults: (n: number) => void;
  children: number;
  setChildren: (n: number) => void;
  infants: number;
  setInfants: (n: number) => void;
}) {
  return (
    <div className="px-5 pt-4">
      <label className="block text-sm font-bold text-[#0b1c2c] mb-1.5 text-start">
        {label}
        <span className="text-[#c0392b]"> *</span>
      </label>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between gap-2 py-2.5 border-b border-black/15 hover:border-[#b08a3e] transition"
        data-testid="field-guests"
      >
        <ChevronDown
          className={`w-5 h-5 text-[#0b1c2c]/50 shrink-0 transition ${open ? "rotate-180" : ""}`}
        />
        <span className="flex-1 text-start text-sm text-[#0b1c2c] font-semibold">
          {valueLabel || "البالغين 0"}
        </span>
        <User className="w-5 h-5 text-[#b08a3e]" />
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="pt-3 space-y-2">
              <PaxRow
                label="بالغ"
                value={adults}
                setValue={setAdults}
                min={1}
              />
              <PaxRow label="طفل" value={children} setValue={setChildren} />
              <PaxRow label="رضيع" value={infants} setValue={setInfants} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function PaxRow({
  label,
  value,
  setValue,
  min = 0,
  max = 9,
}: {
  label: string;
  value: number;
  setValue: (n: number) => void;
  min?: number;
  max?: number;
}) {
  return (
    <div className="flex items-center justify-between bg-[#f7f3ea] rounded px-3 py-2">
      <div className="flex items-center gap-2">
        <button
          onClick={() => setValue(Math.max(min, value - 1))}
          disabled={value <= min}
          className="w-7 h-7 rounded-full border border-[#b08a3e]/40 text-[#b08a3e] disabled:opacity-30"
          data-testid={`button-pax-minus-${label}`}
        >
          <Minus className="w-3.5 h-3.5 mx-auto" />
        </button>
        <span
          className="w-6 text-center font-bold tabular-nums text-[#0b1c2c]"
          data-testid={`text-pax-${label}`}
        >
          {value}
        </span>
        <button
          onClick={() => setValue(Math.min(max, value + 1))}
          disabled={value >= max}
          className="w-7 h-7 rounded-full border border-[#b08a3e]/40 text-[#b08a3e] disabled:opacity-30"
          data-testid={`button-pax-plus-${label}`}
        >
          <Plus className="w-3.5 h-3.5 mx-auto" />
        </button>
      </div>
      <span className="text-sm font-semibold text-[#0b1c2c]">{label}</span>
    </div>
  );
}

/* ---------- Promo cards ---------- */

function PromoCard({
  title,
  subtitle,
  accent,
  dark,
  children,
  testid,
}: {
  title: string;
  subtitle: string;
  accent: string;
  dark?: boolean;
  children: React.ReactNode;
  testid: string;
}) {
  return (
    <div
      className="rounded-md overflow-hidden shadow-xl flex flex-col aspect-[4/5]"
      style={{ background: accent }}
      data-testid={testid}
    >
      <div className="px-3 pt-3">
        <p
          className={`text-xs sm:text-sm font-extrabold leading-snug ${dark ? "text-white" : "text-[#0b1c2c]"}`}
        >
          {title}
        </p>
        <p
          className={`text-[10px] mt-1 ${dark ? "text-white/70" : "text-[#0b1c2c]/60"}`}
        >
          {subtitle}
        </p>
      </div>
      <div className="flex-1 flex items-start justify-center p-3">
        {children}
      </div>
    </div>
  );
}

function LuggageArt() {
  return (
    <svg viewBox="0 0 120 90" className="w-full h-auto" aria-hidden>
      <rect
        x="14"
        y="18"
        width="44"
        height="60"
        rx="5"
        fill="#cfd8dc"
        stroke="#90a4ae"
        strokeWidth="1.5"
      />
      <rect
        x="22"
        y="10"
        width="28"
        height="10"
        rx="3"
        fill="none"
        stroke="#90a4ae"
        strokeWidth="1.5"
      />
      <line x1="36" y1="20" x2="36" y2="78" stroke="#90a4ae" strokeWidth="1" />
      <text
        x="36"
        y="86"
        textAnchor="middle"
        fontSize="6"
        fill="#0b1c2c"
        fontWeight="700"
      >
        65cm
      </text>
      <ellipse cx="86" cy="58" rx="26" ry="16" fill="#3a4a3f" />
      <rect x="74" y="46" width="24" height="6" rx="2" fill="#2c3a30" />
      <path
        d="M76 48 q10 -10 20 0"
        fill="none"
        stroke="#b08a3e"
        strokeWidth="1.5"
      />
      <text
        x="86"
        y="86"
        textAnchor="middle"
        fontSize="6"
        fill="#0b1c2c"
        fontWeight="700"
      >
        55cm
      </text>
    </svg>
  );
}

function InteriorArt() {
  return (
    <svg viewBox="0 0 120 90" className="w-full h-auto" aria-hidden>
      <rect x="0" y="0" width="120" height="90" fill="#0e3b2f" />
      <rect
        x="14"
        y="14"
        width="44"
        height="60"
        rx="6"
        fill="#1c5b48"
        stroke="#b08a3e"
        strokeWidth="1"
      />
      <rect
        x="20"
        y="22"
        width="32"
        height="22"
        rx="2"
        fill="#cfe7d8"
        opacity="0.9"
      />
      <rect x="20" y="50" width="32" height="20" rx="2" fill="#0a2a23" />
      <rect
        x="64"
        y="14"
        width="44"
        height="60"
        rx="6"
        fill="#0a2a23"
        stroke="#b08a3e"
        strokeWidth="1"
      />
      <rect
        x="70"
        y="22"
        width="32"
        height="14"
        rx="2"
        fill="#cfe7d8"
        opacity="0.6"
      />
      <circle cx="86" cy="56" r="10" fill="#b08a3e" opacity="0.3" />
      <rect x="78" y="50" width="16" height="14" rx="2" fill="#b08a3e" />
    </svg>
  );
}

/* ---------- Station picker (kept) ---------- */

function StationPicker({
  open,
  title,
  selected,
  excluded,
  onClose,
  onPick,
}: {
  open: boolean;
  title: string;
  selected: Station | null;
  excluded: Station | null;
  onClose: () => void;
  onPick: (s: Station) => void;
}) {
  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            className="fixed inset-0 bg-black/40 z-40"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.div
            className="fixed left-0 right-0 bottom-0 bg-white z-50 rounded-t-3xl shadow-2xl overflow-hidden max-w-md mx-auto"
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 28, stiffness: 280 }}
            data-testid="station-picker"
          >
            <div className="flex justify-center pt-2 pb-1">
              <span className="w-10 h-1 bg-black/10 rounded-full" />
            </div>
            <div className="px-5 pt-2 pb-3 flex items-center justify-between border-b border-black/10">
              <button
                onClick={onClose}
                className="p-1.5 rounded-full hover:bg-black/5 transition"
                data-testid="picker-close"
              >
                <X className="w-5 h-5 text-[#0b1c2c]/60" />
              </button>
              <h2 className="text-base font-extrabold text-[#0b1c2c]">
                اختر المحطة — {title}
              </h2>
              <div className="w-7" />
            </div>
            <ul className="max-h-[60vh] overflow-y-auto py-2">
              {STATIONS.map((s) => {
                const isSelected = selected?.id === s.id;
                const isExcluded = excluded?.id === s.id;
                return (
                  <li key={s.id}>
                    <button
                      disabled={isExcluded}
                      onClick={() => onPick(s)}
                      className={`w-full flex items-center justify-between gap-3 px-5 py-3.5 text-start transition ${
                        isExcluded
                          ? "opacity-40 cursor-not-allowed"
                          : isSelected
                            ? "bg-[#f7f3ea]"
                            : "hover:bg-black/5"
                      }`}
                      data-testid={`station-${s.id}`}
                    >
                      <div className="flex items-center gap-3 flex-1">
                        <span
                          className={`w-9 h-9 rounded-full flex items-center justify-center ${isSelected ? "bg-[#b08a3e] text-white" : "bg-[#f7f3ea] text-[#b08a3e]"}`}
                        >
                          <MapPin className="w-4 h-4" />
                        </span>
                        <span className="text-sm font-semibold text-[#0b1c2c] flex-1 text-start">
                          {s.name}
                        </span>
                      </div>
                      {isSelected && (
                        <Check className="w-5 h-5 text-[#b08a3e]" />
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
