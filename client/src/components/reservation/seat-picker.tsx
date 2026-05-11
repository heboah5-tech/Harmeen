import { useState } from "react";

const totalSeats = 32;

type Props = {
  bookedSeats?: number[];
  onSelect: (seat: number | null) => void;
};

export default function SeatPicker({
  bookedSeats = [2, 5, 8, 14, 17, 22, 25],
  onSelect,
}: Props) {
  const [selected, setSelected] = useState<number | null>(null);

  const handleSeat = (num: number) => {
    if (bookedSeats.includes(num)) return;
    const s = selected === num ? null : num;
    setSelected(s);
    onSelect(s);
  };

  return (
    <div className="flex flex-col items-center gap-4" dir="rtl">
      <div className="flex items-center gap-4 text-xs text-muted-foreground">
        <span className="flex items-center gap-1">
          <span className="w-4 h-4 rounded bg-muted border border-border inline-block" />{" "}
          متاح
        </span>
        <span className="flex items-center gap-1">
          <span className="w-4 h-4 rounded bg-primary inline-block" /> مختار
        </span>
        <span className="flex items-center gap-1">
          <span className="w-4 h-4 rounded bg-foreground/20 inline-block" /> محجوز
        </span>
      </div>

      <div className="w-full flex justify-center">
        <div className="bg-primary/10 border border-primary/30 rounded-xl px-6 py-1.5 text-xs font-bold text-primary">
          🚌 مقدمة الحافلة
        </div>
      </div>

      <div
        className="grid gap-2"
        style={{ gridTemplateColumns: "repeat(4, 1fr)", maxWidth: 200 }}
      >
        {Array.from({ length: totalSeats }, (_, i) => i + 1).map((num) => {
          const isBooked = bookedSeats.includes(num);
          const isSelected = selected === num;
          const isAisle = num % 4 === 3;

          return (
            <button
              key={num}
              onClick={() => handleSeat(num)}
              disabled={isBooked}
              data-testid={`button-seat-${num}`}
              className={`w-10 h-10 rounded-lg text-xs font-bold border transition-all duration-200 ${
                isBooked
                  ? "bg-foreground/15 border-foreground/10 text-foreground/30 cursor-not-allowed"
                  : isSelected
                    ? "bg-primary text-primary-foreground border-primary shadow-lg scale-110"
                    : "bg-muted border-border text-foreground hover:border-primary hover:bg-primary/10"
              }`}
              style={isAisle ? { marginRight: "8px" } : {}}
            >
              {num}
            </button>
          );
        })}
      </div>
    </div>
  );
}
