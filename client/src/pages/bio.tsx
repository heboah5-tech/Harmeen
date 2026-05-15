import { useEffect } from "react";
import { Link } from "wouter";
import {
  Train,
  Calendar as CalendarIcon,
  Ticket,
  MapPin,
  Phone,
  Mail,
  Globe,
  Shield,
  ChevronLeft,
} from "lucide-react";
import hhrLogo from "@assets/hhr_logo.png";
import sstpcLogo from "@assets/sstpc_logo.png";
import heroBg from "@assets/makkah_hero_bg.jpg";

type LinkItem = {
  label: string;
  sub?: string;
  href: string;
  external?: boolean;
  icon: React.ReactNode;
  testid: string;
};

const LINKS: LinkItem[] = [
  {
    label: "الجدول الزمني للرحلات",
    sub: "مواعيد القطارات اليومية",
    href: "/book?tab=schedule",
    icon: <CalendarIcon className="w-6 h-6" />,
    testid: "link-schedule",
  },
  {
    label: "إدارة الرحلات",
    sub: "تعديل أو إلغاء حجزك",
    href: "/book?tab=manage",
    icon: <Ticket className="w-6 h-6" />,
    testid: "link-manage",
  },
  {
    label: "المحطات",
    sub: "مكة · جدة · المدينة · كاك",
    href: "/book",
    icon: <MapPin className="w-6 h-6" />,
    testid: "link-stations",
  },
  {
    label: "خدمة العملاء",
    sub: "920004433",
    href: "tel:920004433",
    external: true,
    icon: <Phone className="w-6 h-6" />,
    testid: "link-call",
  },
  {
    label: "البريد الإلكتروني",
    sub: "info@hhr.sa",
    href: "mailto:info@hhr.sa",
    external: true,
    icon: <Mail className="w-6 h-6" />,
    testid: "link-email",
  },
  {
    label: "الموقع الرسمي",
    sub: "hhr.sa",
    href: "https://www.hhr.sa",
    external: true,
    icon: <Globe className="w-6 h-6" />,
    testid: "link-website",
  },
  {
    label: "سياسة الخصوصية",
    sub: "كيف نحمي بياناتك",
    href: "/privacy",
    icon: <Shield className="w-6 h-6" />,
    testid: "link-privacy",
  },
];

export default function BioPage() {
  useEffect(() => {
    document.title = "قطار الحرمين السريع | الروابط الرسمية";
  }, []);

  return (
    <div dir="rtl" className="min-h-screen bg-[#0b1c2c] text-white">
      <div
        className="relative"
        style={{
          backgroundImage: `linear-gradient(180deg, rgba(11,28,44,0.55) 0%, rgba(11,28,44,0.85) 60%, #0b1c2c 100%), url(${heroBg})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      >
        <div className="max-w-md mx-auto px-5 pt-10 pb-6 text-center">
          <div className="bg-white/95 inline-flex flex-col items-center gap-2 px-4 py-3 rounded-2xl shadow-xl">
            <img
              src={hhrLogo}
              alt="قطار الحرمين السريع"
              className="h-10 w-auto"
              data-testid="img-bio-logo"
            />
            <img
              src={sstpcLogo}
              alt="Operated by SSTPC"
              className="h-6 w-auto opacity-80"
            />
          </div>
          <p className="mt-4 text-sm text-white/70" data-testid="text-bio-subtitle">
            جميع روابط قطار الحرمين السريع في مكان واحد
          </p>
        </div>
      </div>

      <div className="max-w-md mx-auto px-5 -mt-2 pb-20 space-y-3">
        {LINKS.map((l) => {
          const inner = (
            <div
              className="flex items-center gap-3 bg-white/95 hover:bg-white text-[#0b1c2c] rounded-xl p-4 shadow-md hover-elevate active-elevate-2 transition"
              data-testid={l.testid}
            >
              <div className="w-11 h-11 rounded-lg bg-[#b08a3e]/15 text-[#b08a3e] flex items-center justify-center shrink-0">
                {l.icon}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-extrabold truncate">{l.label}</p>
                {l.sub && (
                  <p className="text-[11px] text-[#0b1c2c]/60 truncate">{l.sub}</p>
                )}
              </div>
              <ChevronLeft className="w-5 h-5 text-[#0b1c2c]/40 shrink-0" />
            </div>
          );
          return l.external ? (
            <a
              key={l.testid}
              href={l.href}
              target={l.href.startsWith("http") ? "_blank" : undefined}
              rel={l.href.startsWith("http") ? "noopener noreferrer" : undefined}
            >
              {inner}
            </a>
          ) : (
            <Link key={l.testid} href={l.href}>
              {inner}
            </Link>
          );
        })}

        <p className="text-center text-[11px] text-white/50 pt-6">
          © {new Date().getFullYear()} قطار الحرمين السريع · جميع الحقوق محفوظة
        </p>
      </div>
    </div>
  );
}
