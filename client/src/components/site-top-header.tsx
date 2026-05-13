import { ChevronDown, User, Menu } from "lucide-react";
import sstpcLogo from "@assets/sstpc-logo_1778640082608.png";
import hhrLogo from "@assets/xlayout_set_logo,qimg_id=40191841,at=1778516310060.pagespeed.i_1778640082609.png";

export default function SiteTopHeader() {
  return (
    <header className="w-full" dir="rtl" data-testid="site-top-header">
      <div className="bg-[hsl(var(--gold-500))] text-white">
        <div className="max-w-md mx-auto flex items-center justify-end px-3 py-1.5">
          <button
            className="flex items-center gap-2 text-sm font-bold"
            data-testid="button-language"
          >
            <span>ENGLISH</span>
            <span className="w-7 h-7 rounded-full border border-white/70 flex items-center justify-center">
              <User className="w-4 h-4" />
            </span>
            <ChevronDown className="w-4 h-4" />
          </button>
        </div>
      </div>
      <div className="bg-gradient-to-l from-white via-white to-[hsl(40_30%_94%)] border-b border-border/60">
        <div className="max-w-md mx-auto flex items-center justify-between px-3 py-2.5 gap-2">
          <img
            src={sstpcLogo}
            alt="SSTPC - Operated by"
            className="h-9 sm:h-10 w-auto object-contain"
            data-testid="img-sstpc-logo"
          />
          <div className="flex items-center gap-2">
            <img
              src={hhrLogo}
              alt="قطار الحرمين السريع"
              className="h-9 sm:h-10 w-auto object-contain"
              data-testid="img-hhr-logo"
            />
            <button
              className="p-1 text-foreground hover:text-[hsl(var(--gold-700))] transition"
              data-testid="button-menu"
            >
              <Menu className="w-6 h-6" strokeWidth={2.5} />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
