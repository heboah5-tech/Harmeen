import { Link } from "wouter";
import { Phone } from "lucide-react";

const FOOTER_LOGO =
  "https://media.base44.com/images/public/6a00b83e06bb9dc7138987a2/844bb772f_saptco_com_sa_saptco-footer-logo_af7c2006.png";

const SOCIALS = [
  {
    href: "https://www.linkedin.com/company/saptcosa/",
    label: "LinkedIn",
    icon: "https://media.base44.com/images/public/6a00b83e06bb9dc7138987a2/d841a7a06_saptco_com_sa_linkedin-icon_7c457505.png",
  },
  {
    href: "https://twitter.com/saptcoSA",
    label: "X",
    icon: "https://media.base44.com/images/public/6a00b83e06bb9dc7138987a2/0dca8103e_saptco_com_sa_twitter-x-icon_927d527d.png",
  },
  {
    href: "https://www.facebook.com/saptcoSA",
    label: "Facebook",
    icon: "https://media.base44.com/images/public/6a00b83e06bb9dc7138987a2/706a5a00b_saptco_com_sa_facebook-icon_20fa65a0.png",
  },
  {
    href: "https://www.instagram.com/saptcosa",
    label: "Instagram",
    icon: "https://media.base44.com/images/public/6a00b83e06bb9dc7138987a2/24bb854e8_saptco_com_sa_instagram-icon_b8498055.png",
  },
  {
    href: "https://www.youtube.com/channel/UCQVnONc5XfZn2TcZ52Dt0iA",
    label: "YouTube",
    icon: "https://media.base44.com/images/public/6a00b83e06bb9dc7138987a2/dbdeb45d0_saptco_com_sa_youtube-icon_4319f551.png",
  },
];

export default function SiteFooter() {
  return (
    <footer
      className="bg-foreground text-background"
      dir="rtl"
      data-testid="site-footer"
    >
      <div className="max-w-7xl mx-auto px-4 py-10">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
          <div className="flex flex-col gap-4">
            <Link href="/" data-testid="link-footer-logo">
              <img
                src={FOOTER_LOGO}
                alt="SAPTCO"
                onError={(e) => {
                  const t = e.currentTarget;
                  t.style.display = "none";
                  const next = t.nextElementSibling as HTMLElement | null;
                  if (next) next.style.display = "inline";
                }}
                className="h-12 w-auto object-contain"
              />
              <span
                className="font-bold text-xl text-background"
                style={{ display: "none" }}
              >
                سابتكو
              </span>
            </Link>
            <p className="text-sm text-background/70 leading-relaxed">
              الشركة السعودية للنقل الجماعي – سابتكو، رائدة في تقديم حلول النقل
              المتكاملة في المملكة العربية السعودية.
            </p>
          </div>

          <div>
            <h4 className="font-bold text-background mb-4 text-sm">
              روابط سريعة
            </h4>
            <ul className="flex flex-col gap-2">
              <li>
                <a
                  href="#"
                  className="text-sm text-background/70 hover:text-background transition-colors"
                >
                  عن سابتكو
                </a>
              </li>
              <li>
                <Link
                  href="/MediaCenter"
                  className="text-sm text-background/70 hover:text-background transition-colors"
                >
                  المركز الإعلامي
                </Link>
              </li>
              <li>
                <Link
                  href="/contact"
                  className="text-sm text-background/70 hover:text-background transition-colors"
                >
                  تواصل معنا
                </Link>
              </li>
              <li>
                <a
                  href="#"
                  className="text-sm text-background/70 hover:text-background transition-colors"
                >
                  الإبلاغ عن مخالفات
                </a>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="font-bold text-background mb-4 text-sm">
              تواصل معنا
            </h4>
            <a
              href="tel:920000877"
              className="inline-flex items-center gap-2 text-sm text-background/70 hover:text-background transition-colors mb-2"
              data-testid="link-phone"
            >
              <Phone className="w-4 h-4" />
              920000877
            </a>
          </div>

          <div>
            <h4 className="font-bold text-background mb-4 text-sm">تابعنا</h4>
            <div className="flex gap-3 flex-wrap">
              {SOCIALS.map((s) => (
                <a
                  key={s.label}
                  href={s.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-8 h-8 rounded-full bg-background/10 hover:bg-primary flex items-center justify-center transition-all duration-300"
                  data-testid={`link-social-${s.label}`}
                >
                  <img
                    src={s.icon}
                    alt={s.label}
                    className="w-4 h-4 object-contain"
                  />
                </a>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="border-t border-background/10">
        <div className="max-w-7xl mx-auto px-4 py-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-background/60 text-center">
            الشركة السعودية للنقل الجماعي (سابتكو) - كافة الحقوق محفوظة 2026 ©
          </p>
          <div className="flex items-center gap-3">
            <a href="#" className="hover:opacity-80 transition-opacity">
              <img
                src="https://media.base44.com/images/public/6a00b83e06bb9dc7138987a2/0a2bb909b_saptco_com_sa_ISO_9001_c2381d8c.png"
                alt="ISO 9001"
                className="h-8 w-auto object-contain"
              />
            </a>
            <a href="#" className="hover:opacity-80 transition-opacity">
              <img
                src="https://media.base44.com/images/public/6a00b83e06bb9dc7138987a2/1f40d2049_saptco_com_sa_ISO_45001_ef992207.png"
                alt="ISO 45001"
                className="h-8 w-auto object-contain"
              />
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
