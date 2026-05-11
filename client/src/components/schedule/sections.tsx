import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { ArrowUpDown, ChevronLeft, ChevronRight, Search } from "lucide-react";
import CityCombobox from "@/components/ui/city-combobox";
import PassengerPickerMulti, {
  DEFAULT_PASSENGERS,
  type PassengerCounts,
} from "@/components/ui/passenger-picker-multi";
import { SAUDI_CITIES } from "@/lib/saudi-cities";

export const GlobalStyles = () => (
  <style>{`
    @keyframes floatA { 0%, 100% { transform: translateY(0) rotate(0deg) scale(1); } 50% { transform: translateY(-20px) rotate(5deg) scale(1.05); } }
    @keyframes floatB { 0%, 100% { transform: translateY(0) rotate(0deg) scale(1); } 50% { transform: translateY(15px) rotate(-3deg) scale(0.95); } }
    @keyframes shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }
  `}</style>
);

export const AnimatedElement = ({
  children,
  className = "",
  delay = 0,
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
}) => {
  const ref = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    if (rect.top < window.innerHeight) {
      setIsVisible(true);
      return;
    }
    const fallback = setTimeout(() => setIsVisible(true), 800 + delay);
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          clearTimeout(fallback);
          setTimeout(() => setIsVisible(true), delay);
          observer.unobserve(el);
        }
      },
      { threshold: 0.05, rootMargin: "0px 0px -50px 0px" },
    );
    observer.observe(el);
    return () => {
      observer.disconnect();
      clearTimeout(fallback);
    };
  }, [delay]);

  return (
    <div
      ref={ref}
      className={`transition-all duration-1000 ease-out ${
        isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-12"
      } ${className}`}
    >
      {children}
    </div>
  );
};

type HeroProps = {
  cities: string[];
  fromCity: string;
  toCity: string;
  date: string;
  setFromCity: (v: string) => void;
  setToCity: (v: string) => void;
  setDate: (v: string) => void;
  onSearch: () => void;
  swap: () => void;
};

export function HeroSection({
  cities,
  fromCity,
  toCity,
  date,
  setFromCity,
  setToCity,
  setDate,
  onSearch,
  swap,
}: HeroProps) {
  const [tripType, setTripType] = useState<"one-way" | "round">("one-way");
  const [activeTab, setActiveTab] = useState<"manage" | "international" | "domestic">("domestic");
  const [returnDate, setReturnDate] = useState("");
  const [passengers, setPassengers] = useState<PassengerCounts>(DEFAULT_PASSENGERS);
  const [ticketClass, setTicketClass] = useState("نوع التذكرة");

  const fullCityList = Array.from(
    new Set([
      ...SAUDI_CITIES,
      ...cities.filter((c) => c && c !== "الكل"),
    ]),
  );
  const [currentSlide, setCurrentSlide] = useState(0);

  const slides = [
    {
      img: "https://media.base44.com/images/public/6a0141c514678b9757e134f7/608fbca45_satrans_com_sa_beabFkiTyIELBd3t06Tc5QFVX5UdzNNAHYM8xT7a_778e6f8c.jpg",
      title: "استمتع بالرحلة",
    },
    {
      img: "https://media.base44.com/images/public/6a0141c514678b9757e134f7/1ba508401_satrans_com_sa_qQ5R8rWKwbo7hrAC1aYAUPxTH2WAaoaWhiDwyonF_815c9ffe.jpg",
      title: "سافر ببساطة",
    },
  ];

  useEffect(() => {
    const t = setInterval(() => setCurrentSlide((p) => (p + 1) % slides.length), 5000);
    return () => clearInterval(t);
  }, [slides.length]);

  const tabs = [
    { key: "manage" as const, label: "إدارة التذاكر" },
    { key: "international" as const, label: "رحلات دولية" },
    { key: "domestic" as const, label: "رحلات داخلية" },
  ];

  return (
    <section className="relative bg-background pt-8 pb-16 lg:pt-12 overflow-hidden" dir="rtl">
      <div
        className="absolute top-0 right-0 w-[500px] h-[500px] bg-primary/5 rounded-full blur-[100px] pointer-events-none"
        style={{ animation: "floatA 12s ease-in-out infinite" }}
      />
      <div
        className="absolute bottom-[-100px] left-[-100px] w-[600px] h-[600px] bg-primary/5 rounded-full blur-[120px] pointer-events-none"
        style={{ animation: "floatB 15s ease-in-out infinite" }}
      />

      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 relative z-10">
        <div className="flex justify-end mb-6 relative z-20">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="flex bg-card border border-border/50 rounded-full p-1.5 shadow-lg"
          >
            {tabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`px-5 py-2.5 rounded-full text-sm font-bold transition-all duration-300 ${
                  activeTab === tab.key
                    ? "bg-background shadow-md border border-primary text-primary"
                    : "text-muted-foreground hover:bg-muted/50"
                }`}
                data-testid={`tab-${tab.key}`}
              >
                {tab.label}
              </button>
            ))}
          </motion.div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-stretch">
          <motion.div
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="lg:col-span-5 relative z-[50]"
          >
            <div className="bg-card rounded-[2rem] p-6 lg:p-8 shadow-2xl border border-border/50 relative h-full">
              <div className="absolute top-0 right-0 w-full h-1/2 bg-gradient-to-b from-primary/5 to-transparent pointer-events-none rounded-t-[2rem]" />

              <h1 className="text-2xl lg:text-3xl font-bold text-foreground mb-8 relative">
                أين تفضل الذهاب <span className="text-primary">اليوم؟</span>
              </h1>

              <div className="flex bg-muted/60 p-1.5 rounded-2xl mb-8 relative border border-border/40">
                <button
                  onClick={() => setTripType("one-way")}
                  className={`flex-1 py-3 px-4 rounded-xl text-sm font-bold transition-all duration-300 relative z-10 ${
                    tripType === "one-way" ? "text-primary-foreground" : "text-muted-foreground hover:text-foreground"
                  }`}
                  data-testid="trip-type-one-way"
                >
                  ذهاب فقط
                </button>
                <button
                  onClick={() => setTripType("round")}
                  className={`flex-1 py-3 px-4 rounded-xl text-sm font-bold transition-all duration-300 flex items-center justify-center gap-2 relative z-10 ${
                    tripType === "round" ? "text-primary-foreground" : "text-muted-foreground hover:text-foreground"
                  }`}
                  data-testid="trip-type-round"
                >
                  ذهاب وعودة
                  <span
                    className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                      tripType === "round"
                        ? "bg-background/25 text-primary-foreground"
                        : "bg-primary text-primary-foreground"
                    }`}
                  >
                    خصم 15٪
                  </span>
                </button>
                <div
                  className="absolute inset-y-1.5 w-[calc(50%-0.375rem)] bg-primary rounded-xl transition-all duration-300 ease-in-out shadow-lg shadow-primary/30"
                  style={{ right: tripType === "one-way" ? "0.375rem" : "calc(50% + 0.375rem)" }}
                />
              </div>

              <div className="relative mb-6">
                <div className="space-y-4 relative z-10">
                  <div>
                    <label className="text-sm font-bold text-muted-foreground mb-1.5 block px-1">
                      محطة المغادرة <span className="text-destructive">*</span>
                    </label>
                    <CityCombobox
                      value={fromCity === "الكل" ? "" : fromCity}
                      onChange={(v) => setFromCity(v || "الكل")}
                      options={fullCityList}
                      placeholder="محطة المغادرة"
                      testId="hero-from"
                    />
                  </div>

                  <div>
                    <label className="text-sm font-bold text-muted-foreground mb-1.5 block px-1">
                      محطة الوصول <span className="text-destructive">*</span>
                    </label>
                    <CityCombobox
                      value={toCity === "الكل" ? "" : toCity}
                      onChange={(v) => setToCity(v || "الكل")}
                      options={fullCityList}
                      placeholder="محطة الوصول"
                      testId="hero-to"
                    />
                  </div>

                  <button
                    type="button"
                    onClick={swap}
                    className="absolute top-1/2 left-3 -translate-y-1/2 w-11 h-11 rounded-full bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center shadow-xl shadow-primary/40 hover:scale-110 hover:rotate-180 active:scale-95 transition-all duration-300 z-20 ring-4 ring-background"
                    data-testid="hero-swap"
                    aria-label="تبديل المدن"
                  >
                    <ArrowUpDown className="w-5 h-5 text-primary-foreground" />
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-8">
                <div>
                  <label className="text-xs font-bold text-muted-foreground mb-1.5 block px-1">
                    موعد المغادرة <span className="text-destructive">*</span>
                  </label>
                  <div className="relative flex items-center bg-background border-2 border-border rounded-xl hover:border-primary/40 focus-within:border-primary focus-within:ring-4 focus-within:ring-primary/10 transition-all shadow-sm hover:shadow-md">
                    <input
                      type="date"
                      value={date}
                      onChange={(e) => setDate(e.target.value)}
                      className="w-full bg-transparent py-3 px-3 text-sm font-semibold text-foreground focus:outline-none"
                      data-testid="hero-date-departure"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-xs font-bold text-muted-foreground mb-1.5 block px-1">
                    موعد العودة <span className="text-destructive">*</span>
                  </label>
                  <div
                    className={`relative flex items-center bg-background border-2 border-border rounded-xl transition-all shadow-sm ${
                      tripType !== "one-way"
                        ? "hover:border-primary/40 focus-within:border-primary focus-within:ring-4 focus-within:ring-primary/10 hover:shadow-md"
                        : "opacity-60"
                    }`}
                  >
                    <input
                      type="date"
                      value={returnDate}
                      onChange={(e) => setReturnDate(e.target.value)}
                      disabled={tripType === "one-way"}
                      className="w-full bg-transparent py-3 px-3 text-sm font-semibold text-foreground focus:outline-none disabled:cursor-not-allowed"
                      data-testid="hero-date-return"
                    />
                  </div>
                </div>
                <div className="col-span-2">
                  <label className="text-xs font-bold text-muted-foreground mb-1.5 block px-1">
                    المسافرين <span className="text-destructive">*</span>
                  </label>
                  <PassengerPickerMulti value={passengers} onChange={setPassengers} />
                </div>
                <div className="col-span-2">
                  <label className="text-xs font-bold text-muted-foreground mb-1.5 block px-1">
                    نوع التذكرة
                  </label>
                  <div className="relative flex items-center bg-background border-2 border-border rounded-xl hover:border-primary/40 focus-within:border-primary focus-within:ring-4 focus-within:ring-primary/10 transition-all shadow-sm hover:shadow-md">
                    <select
                      value={ticketClass}
                      onChange={(e) => setTicketClass(e.target.value)}
                      className="w-full bg-transparent py-3 px-3 text-sm font-semibold text-foreground focus:outline-none appearance-none cursor-pointer text-right"
                      data-testid="hero-ticket-class"
                    >
                      <option>نوع التذكرة</option>
                      <option>اقتصادية</option>
                      <option>متميزة</option>
                    </select>
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={onSearch}
                className="relative overflow-hidden w-full bg-primary text-primary-foreground py-4 rounded-xl font-bold text-lg shadow-xl shadow-primary/20 hover:shadow-2xl hover:shadow-primary/40 hover:-translate-y-1 active:translate-y-0 transition-all duration-300"
                data-testid="hero-search"
              >
                <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/25 to-transparent animate-[shimmer_2.5s_ease-in-out_infinite] bg-[length:200%_100%]" />
                <span className="relative flex items-center justify-center gap-2">
                  <Search className="w-5 h-5" /> بحث
                </span>
              </button>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 1, ease: "easeOut" }}
            className="lg:col-span-7 relative z-0 h-[400px] lg:h-full min-h-[400px] rounded-[2rem] overflow-hidden shadow-2xl group"
          >
            {slides.map((slide, i) => (
              <div
                key={i}
                className={`absolute inset-0 transition-all duration-1000 ease-in-out ${
                  i === currentSlide ? "opacity-100 scale-100" : "opacity-0 scale-105 pointer-events-none"
                }`}
              >
                <img src={slide.img} alt={slide.title} className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                <div className="absolute bottom-10 right-10">
                  <h2 className="text-4xl lg:text-5xl font-extrabold text-white drop-shadow-lg mb-2">
                    {slide.title}
                  </h2>
                  <div className="w-20 h-1.5 bg-primary rounded-full" />
                </div>
              </div>
            ))}

            <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex gap-3 z-20">
              {slides.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setCurrentSlide(i)}
                  className={`h-3 rounded-full transition-all duration-500 ${
                    i === currentSlide ? "bg-primary w-10" : "bg-white/50 hover:bg-white w-3"
                  }`}
                  aria-label={`Slide ${i + 1}`}
                />
              ))}
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}

export function HowItWorksSection() {
  const steps = [
    {
      icon: "https://media.base44.com/images/public/6a0141c514678b9757e134f7/6263d3948_satrans_com_sa_world-location00wd0s00lym49_dc45624a.svg",
      label: "الوجهة",
      desc: "اختر وجهتك المفضلة",
    },
    {
      icon: "https://media.base44.com/images/public/6a0141c514678b9757e134f7/719fc3abc_satrans_com_sa_calendar-cone02pll4psp0t33_d14b5b9c.svg",
      label: "اختر التاريخ والوقت",
      desc: "حدد موعد رحلتك بدقة",
    },
    {
      icon: "https://media.base44.com/images/public/6a0141c514678b9757e134f7/6319cd739_satrans_com_sa_ticket-bus056wffqlb5nfb_1244d14b.svg",
      label: "حجز التذاكر",
      desc: "أكمل الحجز بكل سهولة",
    },
  ];
  return (
    <section className="bg-muted/30 py-20 relative overflow-hidden" dir="rtl">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 relative z-10">
        <div className="flex flex-col sm:flex-row items-center justify-center gap-12 lg:gap-24 relative">
          {steps.map((step, i) => (
            <AnimatedElement key={i} delay={i * 200}>
              <div className="flex flex-col items-center gap-5 text-center group cursor-default">
                <div className="relative">
                  <div className="absolute inset-0 bg-primary/10 rounded-full scale-150 opacity-0 group-hover:opacity-100 group-hover:scale-110 transition-all duration-500 ease-out" />
                  <div className="relative w-24 h-24 rounded-full bg-background border-2 border-primary/30 flex items-center justify-center shadow-lg group-hover:shadow-2xl group-hover:border-primary group-hover:-translate-y-2 transition-all duration-500 z-10">
                    <img src={step.icon} alt={step.label} className="w-14 h-14 object-contain" />
                  </div>
                  <div className="absolute -top-2 -right-2 w-8 h-8 rounded-full bg-primary text-primary-foreground font-bold flex items-center justify-center shadow-md z-20">
                    {i + 1}
                  </div>
                </div>
                <div>
                  <h4 className="font-extrabold text-foreground text-xl mb-2">{step.label}</h4>
                  <p className="text-sm text-muted-foreground max-w-[160px] mx-auto leading-relaxed">{step.desc}</p>
                </div>
              </div>
            </AnimatedElement>
          ))}
        </div>
      </div>
    </section>
  );
}

export function OffersSection() {
  const [currentOffer, setCurrentOffer] = useState(0);
  const items = [
    {
      title: "خصم 50% للطلاب",
      description: "استفد من خصم الطلاب على جميع الرحلات الداخلية",
      image_url:
        "https://media.base44.com/images/public/6a0141c514678b9757e134f7/8c5030109_satrans_com_sa_offers-discount-stamp_96517de9.webp",
    },
    {
      title: "خصم 50% لذوي الاحتياجات الخاصة",
      description: "خصم مميز لذوي الاحتياجات الخاصة على جميع الرحلات",
      image_url:
        "https://media.base44.com/images/public/6a0141c514678b9757e134f7/8c5030109_satrans_com_sa_offers-discount-stamp_96517de9.webp",
    },
    {
      title: "خصم 15% على رحلة الذهاب والعودة",
      description: "احجز رحلة الذهاب والعودة ووفر أكثر",
      image_url:
        "https://media.base44.com/images/public/6a0141c514678b9757e134f7/8c5030109_satrans_com_sa_offers-discount-stamp_96517de9.webp",
    },
  ];

  return (
    <section className="bg-background py-20 relative" dir="rtl">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 relative z-10">
        <AnimatedElement>
          <div className="text-center mb-12">
            <h2 className="text-4xl font-extrabold text-primary mb-3">العروض والصفقات</h2>
            <p className="text-muted-foreground text-lg">أفضل العروض لك</p>
          </div>
        </AnimatedElement>

        <AnimatedElement delay={150}>
          <div className="relative px-10 sm:px-16">
            <div className="overflow-hidden rounded-3xl py-4">
              <div
                className="flex transition-transform duration-700 ease-in-out"
                style={{ transform: `translateX(${currentOffer * 100}%)` }}
              >
                {items.map((offer, i) => (
                  <div key={i} className="w-full flex-shrink-0 px-2">
                    <div className="relative bg-card border border-border/60 rounded-3xl p-8 sm:p-10 flex flex-col sm:flex-row items-center gap-8 shadow-xl group hover:shadow-2xl hover:border-primary/30 transition-all duration-500">
                      <div className="absolute top-1/2 -left-3 -translate-y-1/2 w-6 h-12 bg-background border-r border-border/60 rounded-r-full" />
                      <div className="absolute top-1/2 -right-3 -translate-y-1/2 w-6 h-12 bg-background border-l border-border/60 rounded-l-full" />

                      <div className="flex-1 text-center sm:text-start ps-0 sm:ps-8 sm:border-s-2 border-dashed border-border/50">
                        <h4 className="text-3xl font-extrabold text-foreground mb-4 leading-tight">
                          {offer.title}
                        </h4>
                        <p className="text-muted-foreground text-base mb-6 leading-relaxed max-w-md">
                          {offer.description}
                        </p>
                        <a
                          href="#"
                          className="inline-flex items-center justify-center bg-primary text-primary-foreground px-8 py-3 rounded-xl font-bold hover:bg-primary/90 hover:shadow-lg hover:-translate-y-1 transition-all duration-300 gap-2"
                        >
                          احصل على العرض
                          <ChevronLeft className="w-4 h-4" />
                        </a>
                      </div>

                      <div className="flex-shrink-0 relative">
                        <div className="absolute inset-0 bg-primary/20 rounded-full blur-2xl" />
                        <img
                          src={offer.image_url}
                          alt={offer.title}
                          className="w-36 h-36 object-contain relative z-10 group-hover:rotate-12 group-hover:scale-110 transition-transform duration-700"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <button
              onClick={() => setCurrentOffer((p) => Math.max(0, p - 1))}
              disabled={currentOffer === 0}
              className={`absolute top-1/2 -translate-y-1/2 right-0 w-12 h-12 rounded-full bg-background border-2 border-border shadow-lg flex items-center justify-center transition-all duration-300 z-20 ${
                currentOffer === 0
                  ? "opacity-50 cursor-not-allowed"
                  : "hover:bg-primary hover:text-primary-foreground hover:border-primary hover:scale-110"
              }`}
              data-testid="offers-prev"
            >
              <ChevronRight className="w-6 h-6" />
            </button>
            <button
              onClick={() => setCurrentOffer((p) => Math.min(items.length - 1, p + 1))}
              disabled={currentOffer === items.length - 1}
              className={`absolute top-1/2 -translate-y-1/2 left-0 w-12 h-12 rounded-full bg-background border-2 border-border shadow-lg flex items-center justify-center transition-all duration-300 z-20 ${
                currentOffer === items.length - 1
                  ? "opacity-50 cursor-not-allowed"
                  : "hover:bg-primary hover:text-primary-foreground hover:border-primary hover:scale-110"
              }`}
              data-testid="offers-next"
            >
              <ChevronLeft className="w-6 h-6" />
            </button>

            <div className="flex justify-center gap-3 mt-8">
              {items.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setCurrentOffer(i)}
                  className={`transition-all duration-500 rounded-full ${
                    i === currentOffer ? "w-8 h-2.5 bg-primary" : "w-2.5 h-2.5 bg-border hover:bg-muted-foreground"
                  }`}
                  aria-label={`Offer ${i + 1}`}
                />
              ))}
            </div>
          </div>
        </AnimatedElement>
      </div>
    </section>
  );
}

export function BookNowSection() {
  return (
    <section className="relative py-24 bg-background" dir="rtl">
      <AnimatedElement>
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 relative">
          <div className="relative overflow-hidden rounded-[3rem] bg-primary shadow-2xl flex flex-col md:flex-row items-center">
            <div className="absolute inset-0 bg-gradient-to-l from-black/10 to-transparent" />
            <div className="w-full md:w-1/2 h-[300px] md:h-auto md:self-stretch relative overflow-hidden order-2 md:order-1">
              <div className="absolute inset-0 bg-primary/20 z-10 mix-blend-multiply" />
              <img
                src="https://media.base44.com/images/public/6a0141c514678b9757e134f7/e46347120_satrans_com_sa_book-now-saudi-flag0vr63ev05z5_f37185f6.webp"
                alt="Saudi flag over a highway"
                className="w-full h-full object-cover object-center scale-105 hover:scale-110 transition-transform duration-1000"
              />
            </div>

            <div className="w-full md:w-1/2 p-10 md:p-16 lg:p-20 text-start order-1 md:order-2 relative z-20 flex flex-col justify-center">
              <h2 className="text-4xl sm:text-5xl font-extrabold text-primary-foreground mb-6 leading-tight drop-shadow-md">
                احجز رحلتك بالحافلة الآن!
              </h2>
              <p className="text-primary-foreground/90 text-lg sm:text-xl mb-10 max-w-lg font-medium">
                احجز رحلتك ببطاقتك الائتمانية في أقل من دقيقتين واستمتع برحلة آمنة ومريحة.
              </p>
              <div className="flex">
                <a
                  href="#"
                  className="inline-flex items-center justify-center bg-background text-primary px-10 py-4 rounded-2xl font-bold text-lg hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 group"
                >
                  المزيد من التفاصيل
                  <ChevronLeft className="w-5 h-5 ms-2 group-hover:-translate-x-1 transition-transform" />
                </a>
              </div>
            </div>
          </div>
        </div>
      </AnimatedElement>
    </section>
  );
}

export function AppSection() {
  return (
    <section className="bg-muted/20 py-24 relative overflow-hidden" dir="rtl">
      <div
        className="absolute -top-32 -left-32 w-96 h-96 bg-primary/5 rounded-full blur-3xl pointer-events-none"
        style={{ animation: "floatA 10s ease-in-out infinite" }}
      />
      <div
        className="absolute bottom-0 right-0 w-[500px] h-[500px] bg-primary/5 rounded-full blur-3xl pointer-events-none"
        style={{ animation: "floatB 14s ease-in-out infinite" }}
      />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 relative z-10">
        <div className="flex flex-col lg:flex-row items-center gap-16 lg:gap-24">
          <div className="flex-1 text-center lg:text-start order-2 lg:order-1">
            <AnimatedElement>
              <h2 className="text-4xl sm:text-5xl font-extrabold text-foreground mb-6 leading-tight">
                اجعل تجربة سفرك أفضل مع{" "}
                <span className="text-primary relative whitespace-nowrap">
                  تطبيقنا
                  <svg
                    className="absolute -bottom-2 right-0 w-full h-3 text-primary/30"
                    viewBox="0 0 100 20"
                    preserveAspectRatio="none"
                  >
                    <path d="M0 10 Q50 20 100 10" stroke="currentColor" strokeWidth="4" fill="none" />
                  </svg>
                </span>
              </h2>
            </AnimatedElement>

            <AnimatedElement delay={150}>
              <p className="text-muted-foreground text-lg leading-relaxed mb-10 max-w-xl mx-auto lg:mx-0">
                يساعدك على الحجز بسهولة وتسجيل الوصول بسرعة، مع الاهتمام بجميع احتياجاتك. ابق على اطلاع دائم بالإشعارات لقضاء وقت سلس أثناء الرحلة ومزايا إضافية تجعل سفرك ممتعاً.
              </p>
            </AnimatedElement>

            <AnimatedElement delay={300}>
              <div className="flex flex-wrap gap-4 justify-center lg:justify-start">
                <a
                  href="#"
                  className="hover:opacity-90 hover:scale-105 hover:-translate-y-1 transition-all duration-300 block"
                >
                  <img
                    src="https://upload.wikimedia.org/wikipedia/commons/thumb/3/3c/Download_on_the_App_Store_Badge.svg/1280px-Download_on_the_App_Store_Badge.svg.png"
                    alt="App Store"
                    className="h-14 sm:h-16 w-auto drop-shadow-sm"
                  />
                </a>
                <a
                  href="#"
                  className="hover:opacity-90 hover:scale-105 hover:-translate-y-1 transition-all duration-300 block"
                >
                  <img
                    src="https://upload.wikimedia.org/wikipedia/commons/thumb/7/78/Google_Play_Store_badge_EN.svg/2560px-Google_Play_Store_badge_EN.svg.png"
                    alt="Google Play"
                    className="h-14 sm:h-16 w-auto drop-shadow-sm"
                  />
                </a>
              </div>
            </AnimatedElement>
          </div>

          <div className="flex-shrink-0 order-1 lg:order-2 w-full max-w-md relative">
            <AnimatedElement delay={200}>
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-tr from-primary/20 to-primary/10 rounded-full blur-3xl opacity-50 pointer-events-none" />
                <img
                  src="https://media.base44.com/images/public/6a0141c514678b9757e134f7/e6112d771_satrans_com_sa_home-mobile-apps-ar05kxrzwt58vf_f21433a4.png"
                  alt="App screenshots"
                  className="w-full h-auto object-contain drop-shadow-[0_20px_50px_rgba(0,0,0,0.3)] relative z-10"
                  style={{ animation: "floatA 8s ease-in-out infinite" }}
                />
              </div>
            </AnimatedElement>
          </div>
        </div>
      </div>
    </section>
  );
}
