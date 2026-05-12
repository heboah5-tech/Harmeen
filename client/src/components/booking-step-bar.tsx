import { Check } from "lucide-react";

export const BOOKING_STEPS = [
  { label: "التذاكر" },
  { label: "بيانات المسافر" },
  { label: "المقعد" },
  { label: "الدفع" },
];

type Props = {
  current: number;
  steps?: { label: string }[];
  title?: string;
};

export default function BookingStepBar({
  current,
  steps = BOOKING_STEPS,
  title,
}: Props) {
  return (
    <div className="step-indicator sticky top-0 z-30" dir="rtl">
      {title && (
        <div className="bg-gold-gradient text-white text-center py-3 px-4 text-sm sm:text-base font-bold tracking-wide">
          {title}
        </div>
      )}
      <div className="flex items-center justify-center px-3 py-3 sm:py-4 overflow-x-auto">
        <div className="flex items-center min-w-fit">
          {steps.map((step, i) => {
            const done = i < current;
            const active = i === current;
            return (
              <div
                key={i}
                className="flex items-center flex-shrink-0"
                data-testid={`step-${i}`}
              >
                <div className="flex flex-col items-center gap-1.5 px-2 sm:px-4">
                  <div
                    className={`step-dot ${
                      done ? "is-done" : active ? "is-active" : ""
                    } sm:!w-9 sm:!h-9 sm:!text-sm`}
                  >
                    {done ? <Check className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> : i + 1}
                  </div>
                  <span
                    className={`text-[9px] sm:text-[11px] font-semibold whitespace-nowrap transition-colors ${
                      active
                        ? "text-[hsl(var(--gold-700))]"
                        : done
                          ? "text-[hsl(var(--gold-600))]"
                          : "text-muted-foreground"
                    }`}
                  >
                    {step.label}
                  </span>
                </div>
                {i < steps.length - 1 && (
                  <div className={`step-line ${done ? "is-done" : ""}`} />
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
