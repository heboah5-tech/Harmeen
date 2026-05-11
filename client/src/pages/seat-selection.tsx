import { useEffect, useState } from "react";
import { Check, Clock, ChevronLeft } from "lucide-react";
import { Link, useLocation } from "wouter";
import { handleCurrentPage } from "@/lib/firebase";

const STEPS = [
  { label: "التذاكر", done: true, active: false },
  { label: "التفاصيل", done: true, active: false },
  { label: "الشراء", done: false, active: true },
  { label: "الدفع", done: false, active: false },
];

type Seat = { id: number; status: "available" | "taken" | "selected" } | null;

const generateSeats = (): Seat[][] => {
  const taken = [1, 2, 5, 6, 9, 10, 17, 18, 19, 20, 21, 22];
  return Array.from({ length: 12 }, (_, rowIdx) => {
    const base = rowIdx * 4;
    return [base + 1, base + 2, null, base + 3, base + 4].map<Seat>((n) =>
      n === null ? null : { id: n, status: taken.includes(n) ? "taken" : "available" },
    );
  });
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
              {step.done ? <Check className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> : i + 1}
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
            <div className={`w-6 sm:w-12 h-0.5 mb-4 ${i < 2 ? "bg-primary" : "bg-border"}`} />
          )}
        </div>
      ))}
    </div>
  );
}

export default function SeatSelection() {
  const [, setLocation] = useLocation();
  const [seats, setSeats] = useState<Seat[][]>(generateSeats);
  const [selected, setSelected] = useState<number[]>([]);

  useEffect(() => {
    void handleCurrentPage("seat_selection");
  }, []);

  const toggleSeat = (rowIdx: number, colIdx: number) => {
    const seat = seats[rowIdx][colIdx];
    if (!seat || seat.status === "taken") return;

    setSeats((prev) => {
      const next: Seat[][] = prev.map((r) => r.map((s) => (s ? { ...s } : null)));
      const s = next[rowIdx][colIdx]!;
      if (s.status === "selected") {
        s.status = "available";
        setSelected((sel) => sel.filter((id) => id !== s.id));
      } else if (selected.length < 1) {
        s.status = "selected";
        setSelected((sel) => [...sel, s.id]);
      }
      return next;
    });
  };

  const seatColor = (status: string) => {
    if (status === "taken")
      return "bg-destructive/20 border-destructive/40 text-destructive/60 cursor-not-allowed";
    if (status === "selected")
      return "bg-emerald-600 border-emerald-600 text-white cursor-pointer shadow-md";
    return "bg-background border-border text-foreground cursor-pointer hover:border-primary hover:bg-primary/5";
  };

  const onContinue = () => {
    if (selected.length === 0) return;
    sessionStorage.setItem("selectedSeats", JSON.stringify(selected));
    setLocation("/payment");
  };

  return (
    <div className="min-h-screen bg-muted/30" dir="rtl" data-testid="page-seat-selection">
      <StepBar />

      <div className="max-w-2xl mx-auto px-3 sm:px-4 py-4 sm:py-6">
        <div className="bg-background border border-border rounded-2xl p-4 mb-4">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-muted-foreground">الدمام → الرياض</span>
            <span className="text-sm font-bold text-foreground">رحلة المغادرة</span>
          </div>
          <div className="flex items-center justify-between">
            <div className="text-start">
              <div className="text-xl font-extrabold text-foreground">17:20</div>
              <div className="text-xs text-muted-foreground">عفيف</div>
            </div>
            <div className="flex flex-col items-center gap-0.5 text-xs text-muted-foreground">
              <div className="w-px h-4 bg-border" />
              <span>4 ساعات</span>
              <div className="w-px h-4 bg-border" />
            </div>
            <div className="text-start">
              <div className="text-xl font-extrabold text-foreground">06:30</div>
              <div className="text-xs text-muted-foreground">الرياض - العزيزية</div>
            </div>
          </div>
          <div className="mt-2 text-xs text-muted-foreground text-end">11 مايو 2026 — الأحد</div>
        </div>

        <div className="bg-background border border-border rounded-2xl p-5 mb-4">
          <div className="flex items-center justify-between mb-4">
            <div className="text-xs text-muted-foreground">
              {selected.length > 0 ? `مقعد ${selected[0]} محدد` : "لم يُحدد مقعد"}
            </div>
            <h3 className="font-bold text-foreground text-base">اختار مقاعدك</h3>
          </div>

          <div className="flex items-center justify-center gap-4 mb-5 text-xs text-muted-foreground flex-wrap">
            {[
              { color: "bg-background border-border", label: "متاح" },
              { color: "bg-destructive/20 border-destructive/40", label: "محجوز" },
              { color: "bg-emerald-600 border-emerald-600", label: "مختار" },
            ].map((l, i) => (
              <div key={i} className="flex items-center gap-1.5">
                <div className={`w-5 h-5 rounded-md border-2 ${l.color}`} />
                <span>{l.label}</span>
              </div>
            ))}
          </div>

          <div className="flex justify-center mb-3">
            <div className="flex items-center justify-center w-12 h-7 rounded-full bg-muted border border-border text-xs text-muted-foreground font-medium">
              🚌
            </div>
          </div>

          <div className="flex flex-col gap-1.5 items-center">
            {seats.map((row, rowIdx) => (
              <div key={rowIdx} className="flex gap-1.5 items-center">
                {row.map((seat, colIdx) =>
                  seat === null ? (
                    <div key={colIdx} className="w-8" />
                  ) : (
                    <button
                      key={colIdx}
                      onClick={() => toggleSeat(rowIdx, colIdx)}
                      disabled={seat.status === "taken"}
                      className={`w-8 h-8 rounded-lg border-2 text-[11px] font-bold transition-all duration-150 ${seatColor(seat.status)}`}
                      data-testid={`seat-${seat.id}`}
                    >
                      {seat.id}
                    </button>
                  ),
                )}
                <span className="text-[10px] text-muted-foreground w-4 text-center">
                  {rowIdx + 1}
                </span>
              </div>
            ))}
          </div>

          <p className="text-center text-xs text-muted-foreground mt-4">
            يمكنك اختيار مقعد واحد فقط لكل راكب
          </p>
        </div>

        <div className="bg-background border border-border rounded-2xl p-4 mb-4">
          <h3 className="font-bold text-foreground text-sm mb-3 text-end">رمز الخصم</h3>
          <div className="flex gap-2">
            <button className="bg-primary text-primary-foreground px-5 py-2.5 rounded-xl text-sm font-bold hover:bg-primary/90 transition-colors flex-shrink-0">
              تطبيق
            </button>
            <input
              type="text"
              placeholder="أدخل رمز الخصم إن وجد"
              className="flex-1 border border-border rounded-xl px-3 py-2.5 text-sm text-end focus:outline-none focus:ring-2 focus:ring-primary/30 bg-background"
              data-testid="input-discount"
            />
          </div>
        </div>

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
            <div className="flex justify-between border-t border-border pt-2 mt-2">
              <span className="font-extrabold text-base text-primary">159 ر.س</span>
              <span className="font-bold text-foreground">الإجمالي</span>
            </div>
          </div>
        </div>

        <button
          onClick={onContinue}
          disabled={selected.length === 0}
          className={`w-full py-4 rounded-xl font-bold text-base flex items-center justify-center gap-2 transition-all duration-300 mb-4 ${
            selected.length === 0
              ? "bg-muted text-muted-foreground cursor-not-allowed"
              : "bg-emerald-600 text-white hover:bg-emerald-700 hover:-translate-y-0.5 hover:shadow-lg"
          }`}
          data-testid="button-continue-payment"
        >
          <ChevronLeft className="w-5 h-5" />
          المتابعة للدفع
        </button>

        <div className="flex items-center justify-between text-xs text-muted-foreground px-1">
          <Link
            href="/passenger-details"
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
