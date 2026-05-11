import { useState, useEffect } from "react";
import { Link } from "wouter";
import { Menu, Home } from "lucide-react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";

const LOGO =
  "https://media.base44.com/images/public/6a00b83e06bb9dc7138987a2/c920b4b85_saptco_com_sa_logo_fc9ea85d.png";

const NAV_ITEMS = [
  "عن سابتكو",
  "خدماتنا",
  "شركاتنا",
  "مشاريعنا",
  "الإستدامة",
  "المستثمرون",
];

const NAV_TAIL = ["التوظيف", "الموردون"];

export default function SiteHeader() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={`sticky top-0 z-50 transition-all duration-300 ${
        scrolled ? "bg-card/95 backdrop-blur-md shadow-md" : "bg-card"
      } border-b border-border`}
      dir="rtl"
      data-testid="site-header"
    >
      <div className="max-w-[1400px] mx-auto px-4 lg:px-8">
        <div className="flex items-center justify-between h-20 gap-4">
          <Link
            href="/"
            className="shrink-0 flex items-center gap-2"
            data-testid="link-logo"
          >
            <img
              src={LOGO}
              alt="SAPTCO"
              className="h-12 w-auto object-contain"
            />
          </Link>

          <nav className="hidden lg:flex items-center gap-2 flex-1 justify-center">
            <Link
              href="/"
              className="text-foreground hover:text-primary transition-colors p-2 rounded-full hover:bg-secondary"
              data-testid="link-home"
            >
              <Home className="w-5 h-5" />
            </Link>
            {NAV_ITEMS.map((item) => (
              <a
                key={item}
                href="#"
                className="text-[15px] font-medium text-foreground hover:text-primary transition-colors px-3 py-2 rounded-lg hover:bg-secondary/50 whitespace-nowrap"
              >
                {item}
              </a>
            ))}
            <Link
              href="/MediaCenter"
              className="text-[15px] font-medium text-foreground hover:text-primary transition-colors px-3 py-2 rounded-lg hover:bg-secondary/50 whitespace-nowrap"
              data-testid="link-media-center"
            >
              المركز الإعلامي
            </Link>
            {NAV_TAIL.map((item) => (
              <a
                key={item}
                href="#"
                className="text-[15px] font-medium text-foreground hover:text-primary transition-colors px-3 py-2 rounded-lg hover:bg-secondary/50 whitespace-nowrap"
              >
                {item}
              </a>
            ))}
          </nav>

          <div className="flex items-center gap-3 shrink-0">
            <a
              href="#"
              className="hidden sm:inline-flex items-center justify-center w-8 h-8 text-sm font-bold bg-primary text-primary-foreground rounded-full hover:scale-105 hover:shadow-md transition-all duration-300"
              data-testid="link-language"
            >
              En
            </a>

            <Sheet>
              <SheetTrigger asChild className="lg:hidden">
                <Button
                  variant="ghost"
                  size="icon"
                  className="hover:bg-secondary"
                  data-testid="button-mobile-menu"
                >
                  <Menu className="h-6 w-6 text-foreground" />
                </Button>
              </SheetTrigger>
              <SheetContent
                side="right"
                className="bg-card border-l border-border w-80"
                dir="rtl"
              >
                <div className="flex items-center mb-8 mt-4">
                  <Link href="/">
                    <img
                      src={LOGO}
                      alt="SAPTCO"
                      className="h-10 w-auto object-contain"
                    />
                  </Link>
                </div>
                <nav className="flex flex-col gap-1">
                  <Link
                    href="/"
                    className="text-foreground hover:text-primary hover:bg-secondary rounded-lg px-4 py-3 text-base font-medium transition-colors flex items-center gap-3"
                  >
                    <Home className="w-5 h-5" /> الرئيسية
                  </Link>
                  {NAV_ITEMS.map((item) => (
                    <a
                      key={item}
                      href="#"
                      className="text-foreground hover:text-primary hover:bg-secondary rounded-lg px-4 py-3 text-base font-medium transition-colors"
                    >
                      {item}
                    </a>
                  ))}
                  <Link
                    href="/MediaCenter"
                    className="text-foreground hover:text-primary hover:bg-secondary rounded-lg px-4 py-3 text-base font-medium transition-colors"
                  >
                    المركز الإعلامي
                  </Link>
                  {NAV_TAIL.map((item) => (
                    <a
                      key={item}
                      href="#"
                      className="text-foreground hover:text-primary hover:bg-secondary rounded-lg px-4 py-3 text-base font-medium transition-colors"
                    >
                      {item}
                    </a>
                  ))}
                  <div className="mt-6 pt-6 border-t border-border flex justify-center">
                    <a
                      href="#"
                      className="inline-flex items-center justify-center w-10 h-10 text-sm font-bold bg-primary text-primary-foreground rounded-full hover:scale-105 transition-all"
                    >
                      En
                    </a>
                  </div>
                </nav>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>
    </header>
  );
}
