import { useState } from "react";
import { CreditCard, Lock } from "lucide-react";
import cardsImg from "@assets/cards_1778464132749.png";

export type CardData = {
  number: string;
  name: string;
  expiry: string;
  cvv: string;
};

type CardType = "visa" | "mastercard" | "mada" | null;

function formatCardNumber(val: string) {
  const digits = val.replace(/\D/g, "").slice(0, 16);
  return digits.replace(/(.{4})/g, "$1 ").trim();
}

function formatExpiry(val: string) {
  const digits = val.replace(/\D/g, "").slice(0, 4);
  if (digits.length >= 3) return digits.slice(0, 2) + "/" + digits.slice(2);
  return digits;
}

export function getCardType(num: string): CardType {
  const d = num.replace(/\s/g, "");
  if (/^4/.test(d)) return "visa";
  if (/^5[1-5]/.test(d)) return "mastercard";
  if (/^9/.test(d)) return "mada";
  return null;
}

const CardBadge = ({ type }: { type: CardType }) => {
  const labels: Record<string, string> = {
    visa: "VISA",
    mastercard: "MC",
    mada: "mada",
  };
  const colors: Record<string, string> = {
    visa: "bg-blue-600",
    mastercard: "bg-red-500",
    mada: "bg-green-600",
  };
  if (!type) return null;
  return (
    <span
      className={`text-[10px] font-bold text-white px-2 py-0.5 rounded ${colors[type]}`}
    >
      {labels[type]}
    </span>
  );
};

type Props = {
  total: number;
  card: CardData;
  onCardChange: (card: CardData) => void;
};

export default function PaymentStep({ total, card, onCardChange }: Props) {
  const [showCvv, setShowCvv] = useState(false);
  const cardType = getCardType(card.number);

  return (
    <div className="flex flex-col gap-5" dir="rtl">
      <div className="bg-primary/5 border border-primary/20 rounded-2xl p-4 text-center">
        <p className="text-sm text-muted-foreground mb-1">المبلغ الإجمالي</p>
        <p className="text-4xl font-black text-primary">
          {total} <span className="text-base font-normal">ر.س</span>
        </p>
      </div>

      <div
        className="relative h-44 rounded-2xl overflow-hidden shadow-xl"
        style={{
          background:
            "linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)",
        }}
      >
        <div
          className="absolute inset-0 opacity-20"
          style={{
            backgroundImage:
              "radial-gradient(circle at 20% 50%, white 1px, transparent 1px), radial-gradient(circle at 80% 20%, white 1px, transparent 1px)",
            backgroundSize: "30px 30px",
          }}
        />
        <div className="absolute top-4 left-4 right-4 flex justify-between items-start">
          <CardBadge type={cardType} />
          <CreditCard className="w-8 h-8 text-white/50" />
        </div>
        <div className="absolute bottom-4 left-4 right-4">
          <p className="text-white font-mono text-lg tracking-widest mb-2">
            {card.number || "•••• •••• •••• ••••"}
          </p>
          <div className="flex justify-between items-end">
            <div>
              <p className="text-white/50 text-[10px] mb-0.5">اسم حامل البطاقة</p>
              <p className="text-white text-sm font-medium">
                {card.name || "الاسم الكامل"}
              </p>
            </div>
            <div className="text-left">
              <p className="text-white/50 text-[10px] mb-0.5">انتهاء الصلاحية</p>
              <p className="text-white text-sm font-mono">
                {card.expiry || "MM/YY"}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-card border border-border rounded-2xl p-4 flex flex-col gap-4">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Lock className="w-3 h-3 text-green-600" />
          <span>معاملة آمنة ومشفرة</span>
        </div>

        <div>
          <label className="text-xs font-bold text-foreground mb-1.5 block">
            رقم البطاقة
          </label>
          <div className="relative">
            <input
              type="text"
              inputMode="numeric"
              placeholder="•••• •••• •••• ••••"
              value={card.number}
              onChange={(e) =>
                onCardChange({ ...card, number: formatCardNumber(e.target.value) })
              }
              maxLength={19}
              data-testid="input-card-number"
              className="w-full bg-muted border border-border rounded-xl px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary font-mono tracking-wider text-right transition-colors"
            />
            {cardType && (
              <div className="absolute left-3 top-1/2 -translate-y-1/2">
                <CardBadge type={cardType} />
              </div>
            )}
          </div>
        </div>

        <div>
          <label className="text-xs font-bold text-foreground mb-1.5 block">
            اسم حامل البطاقة
          </label>
          <input
            type="text"
            placeholder="الاسم كما يظهر على البطاقة"
            value={card.name}
            onChange={(e) =>
              onCardChange({ ...card, name: e.target.value.toUpperCase() })
            }
            data-testid="input-card-name"
            className="w-full bg-muted border border-border rounded-xl px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary tracking-wide text-right transition-colors"
          />
        </div>

        <div className="flex gap-3">
          <div className="flex-1">
            <label className="text-xs font-bold text-foreground mb-1.5 block">
              تاريخ الانتهاء
            </label>
            <input
              type="text"
              inputMode="numeric"
              placeholder="MM/YY"
              value={card.expiry}
              onChange={(e) =>
                onCardChange({ ...card, expiry: formatExpiry(e.target.value) })
              }
              maxLength={5}
              data-testid="input-card-expiry"
              className="w-full bg-muted border border-border rounded-xl px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary font-mono text-center transition-colors"
            />
          </div>
          <div className="flex-1">
            <label className="text-xs font-bold text-foreground mb-1.5 block">
              CVV
            </label>
            <div className="relative">
              <input
                type={showCvv ? "text" : "password"}
                inputMode="numeric"
                placeholder="•••"
                value={card.cvv}
                onChange={(e) =>
                  onCardChange({
                    ...card,
                    cvv: e.target.value.replace(/\D/g, "").slice(0, 4),
                  })
                }
                maxLength={4}
                data-testid="input-card-cvv"
                className="w-full bg-muted border border-border rounded-xl px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary font-mono text-center transition-colors"
              />
              <button
                type="button"
                onClick={() => setShowCvv((v) => !v)}
                data-testid="button-toggle-cvv"
                className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-[10px]"
              >
                {showCvv ? "إخفاء" : "إظهار"}
              </button>
            </div>
          </div>
        </div>

        <div className="flex flex-col items-center gap-2 pt-1">
          <span className="text-[10px] text-muted-foreground">
            البطاقات المقبولة
          </span>
          <img
            src={cardsImg}
            alt="VISA, Mastercard, American Express, mada"
            className="h-7 w-auto object-contain"
            data-testid="img-accepted-cards"
          />
        </div>
      </div>
    </div>
  );
}
