import { useState } from "react";

export type PassengerData = {
  name: string;
  id: string;
  phone: string;
  email: string;
};

type Props = {
  data: PassengerData;
  onChange: (data: PassengerData) => void;
};

export default function PassengerForm({ data, onChange }: Props) {
  const [idError, setIdError] = useState("");
  const [phoneError, setPhoneError] = useState("");

  const handleIdChange = (val: string) => {
    const digits = val.replace(/\D/g, "").slice(0, 10);
    onChange({ ...data, id: digits });
    if (digits.length > 0 && !/^[12]/.test(digits)) {
      setIdError("يجب أن يبدأ الرقم بـ 1 أو 2");
    } else if (digits.length > 0 && digits.length < 10) {
      setIdError("رقم الهوية / الإقامة 10 أرقام");
    } else {
      setIdError("");
    }
  };

  const handlePhoneChange = (val: string) => {
    let digits = val.replace(/\D/g, "");
    if (digits.startsWith("966")) digits = digits.slice(3);
    if (digits.startsWith("0")) digits = digits.slice(1);
    digits = digits.slice(0, 9);
    const formatted = digits ? "0" + digits : "";
    onChange({ ...data, phone: formatted });
    if (formatted.length > 0 && !/^05/.test(formatted)) {
      setPhoneError("يجب أن يبدأ الجوال بـ 05");
    } else if (formatted.length > 0 && formatted.length < 10) {
      setPhoneError("رقم الجوال 10 أرقام");
    } else {
      setPhoneError("");
    }
  };

  return (
    <div className="flex flex-col gap-4" dir="rtl">
      <div>
        <label className="text-xs font-bold text-foreground mb-1 block">
          الاسم الكامل *
        </label>
        <input
          type="text"
          placeholder="أدخل الاسم الكامل"
          value={data.name || ""}
          onChange={(e) => onChange({ ...data, name: e.target.value })}
          data-testid="input-passenger-name"
          className="w-full bg-muted border border-border rounded-xl px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary text-right transition-colors"
        />
      </div>

      <div>
        <label className="text-xs font-bold text-foreground mb-1 block">
          رقم الهوية / الإقامة *
        </label>
        <input
          type="text"
          inputMode="numeric"
          placeholder="1XXXXXXXXX أو 2XXXXXXXXX"
          value={data.id || ""}
          onChange={(e) => handleIdChange(e.target.value)}
          maxLength={10}
          data-testid="input-passenger-id"
          className={`w-full bg-muted border rounded-xl px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none text-right transition-colors ${idError ? "border-destructive focus:border-destructive" : "border-border focus:border-primary"}`}
        />
        {idError && <p className="text-xs text-destructive mt-1">{idError}</p>}
        <p className="text-[10px] text-muted-foreground mt-1">
          هوية وطنية تبدأ بـ 1 أو إقامة تبدأ بـ 2
        </p>
      </div>

      <div>
        <label className="text-xs font-bold text-foreground mb-1 block">
          رقم الجوال *
        </label>
        <div
          className={`flex items-center bg-muted border rounded-xl overflow-hidden transition-colors ${phoneError ? "border-destructive" : "border-border focus-within:border-primary"}`}
        >
          <span className="px-3 py-3 text-sm text-muted-foreground border-l border-border bg-secondary/50 shrink-0 font-medium">
            +966
          </span>
          <input
            type="tel"
            inputMode="numeric"
            placeholder="05XXXXXXXX"
            value={data.phone || ""}
            onChange={(e) => handlePhoneChange(e.target.value)}
            data-testid="input-passenger-phone"
            className="flex-1 bg-transparent px-3 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none text-right"
          />
        </div>
        {phoneError && (
          <p className="text-xs text-destructive mt-1">{phoneError}</p>
        )}
      </div>

      <div>
        <label className="text-xs font-bold text-foreground mb-1 block">
          البريد الإلكتروني *
        </label>
        <input
          type="email"
          placeholder="example@mail.com"
          value={data.email || ""}
          onChange={(e) => onChange({ ...data, email: e.target.value })}
          data-testid="input-passenger-email"
          className="w-full bg-muted border border-border rounded-xl px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary text-right transition-colors"
        />
      </div>
    </div>
  );
}
