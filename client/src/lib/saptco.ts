export type SaptcoPassengers = {
  adults: number;
  children?: number;
  infants?: number;
};

export const SAPTCO_STOPS: Record<string, number> = {
  "الرياض": 10,
  "الرياض - العزيزية": 10,
  "Riyadh -AL Azziziya": 10,
  "جدة": 121,
  "Jeddah": 121,
};

export type SaptcoTrip = {
  id: number;
  trip_code: string;
  departure_date: string;
  type: string;
  lowest_price: number;
  duration: number;
  distance: number;
  stops: {
    id: number;
    stop_name: string;
    departure_time?: string;
    arrival_time?: string;
    next_day?: boolean;
  }[];
  price: {
    base_fare_option?: SaptcoFareOption;
    minimum_option?: SaptcoFareOption;
    reduced_option?: SaptcoFareOption;
    flexable_option?: SaptcoFareOption;
  };
};

export type SaptcoFareOption = {
  fare_category: string;
  available_seats: number;
  hide_fare?: boolean;
  total: number;
  subtotal: number;
  vat_value: number;
  tickets: { price_of_ticket: string; total: number; count: string }[];
};

export type SaptcoApiResponse = {
  data: SaptcoTrip[];
};

export function lookupStopId(name: string): number | null {
  if (!name) return null;
  if (SAPTCO_STOPS[name] != null) return SAPTCO_STOPS[name];
  const norm = name.trim();
  for (const [k, v] of Object.entries(SAPTCO_STOPS)) {
    if (k.includes(norm) || norm.includes(k)) return v;
  }
  return null;
}

export async function fetchSaptcoTrips(args: {
  fromCity: string;
  toCity: string;
  isoDate: string;
  passengers: SaptcoPassengers;
}): Promise<SaptcoTrip[]> {
  const departureId = lookupStopId(args.fromCity);
  const arrivalId = lookupStopId(args.toCity);
  if (!departureId || !arrivalId) {
    throw new Error("STOP_NOT_MAPPED");
  }
  const qs = new URLSearchParams({
    departure_stop_id: String(departureId),
    arrival_stop_id: String(arrivalId),
    departure_date: args.isoDate,
    is_transit: "0",
    page: "1",
    per_page: "10",
  });
  qs.append("passengers[Adult]", String(Math.max(1, args.passengers.adults)));
  if (args.passengers.children && args.passengers.children > 0) {
    qs.append("passengers[Child]", String(args.passengers.children));
  }
  if (args.passengers.infants && args.passengers.infants > 0) {
    qs.append("passengers[Infant]", String(args.passengers.infants));
  }
  const url = `https://api.satrans.com.sa/api/v1/web/trips/filter?${qs.toString()}`;
  const res = await fetch(url, {
    method: "GET",
    headers: { Accept: "application/json" },
  });
  if (!res.ok) throw new Error(`SAPTCO ${res.status}`);
  const json = (await res.json()) as SaptcoApiResponse;
  return Array.isArray(json?.data) ? json.data : [];
}
