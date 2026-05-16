export type EvisitorRecord = {
  mbo: string;
  status: "aktivan" | "neaktivan" | "suspendiran";
  categorized_at: string;
  registered_beds: number;
  registered_category: string;
  reported_nights_ytd: number;
  last_check_in_at: string | null;
  tax_paid_ytd_eur: number;
  tourist_board: string;
};

export type EvisitorStay = {
  id: string;
  check_in: string;
  check_out: string;
  nights: number;
  guests: number;
  country: string;
  source: "Airbnb" | "Booking.com" | "Direktno" | "HomeAway";
};

export type EvisitorLookup =
  | { found: true; record: EvisitorRecord }
  | { found: false; reason: "no_registration" };

export type UtilityReading = {
  avg_per_period: number;
  baseline_empty: number;
  occupancy_ratio: number;
  period_label: string;
  last_value: number;
};

export type MonitoringStatus =
  | { kind: "occupied_reporting"; reason: string }
  | { kind: "occupied_silent"; reason: string }
  | { kind: "empty_silent"; reason: string }
  | { kind: "empty_reporting"; reason: string };

const TODAY = new Date("2026-05-14T00:00:00Z");
const COUNTRIES = ["DE", "AT", "IT", "FR", "NL", "GB", "PL", "CZ", "US", "HR"];
const SOURCES: EvisitorStay["source"][] = ["Airbnb", "Booking.com", "Direktno", "HomeAway"];

function hash(seed: string): number {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h);
}

function pickInRange(seed: string, salt: string, min: number, max: number): number {
  const h = hash(seed + salt);
  return min + (h % (max - min + 1));
}

function pickDate(seed: string, salt: string, daysBackMin: number, daysBackMax: number): string {
  const days = pickInRange(seed, salt, daysBackMin, daysBackMax);
  const d = new Date(TODAY);
  d.setUTCDate(d.getUTCDate() - days);
  return d.toISOString();
}

function addDays(iso: string, days: number): string {
  const d = new Date(iso);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString();
}

function isoDay(iso: string): string {
  return iso.slice(0, 10);
}

export function evisitorFor(unit: {
  id: string;
  name?: string | null;
  beds?: number | null;
  category?: string | null;
}): EvisitorRecord {
  const seed = unit.id;
  const h = hash(seed);
  const statusRoll = h % 100;
  const status: EvisitorRecord["status"] =
    statusRoll < 90 ? "aktivan" : statusRoll < 97 ? "neaktivan" : "suspendiran";

  const mboBase = pickInRange(seed, "mbo", 100000, 999999);
  const beds = unit.beds ?? pickInRange(seed, "beds", 2, 8);
  const nightsPerBed = pickInRange(seed, "n", 35, 145);
  const reported = status === "aktivan" ? beds * nightsPerBed : 0;
  const taxRate = 1.65;
  const lastCheckIn =
    status === "aktivan"
      ? pickDate(seed, "lci", 1, 12)
      : status === "neaktivan"
        ? pickDate(seed, "lci-off", 90, 360)
        : null;

  return {
    mbo: `HR-ST-${mboBase}`,
    status,
    categorized_at: pickDate(seed, "cat", 365, 365 * 8),
    registered_beds: beds,
    registered_category: unit.category ?? "Apartman",
    reported_nights_ytd: reported,
    last_check_in_at: lastCheckIn,
    tax_paid_ytd_eur: Math.round(reported * taxRate * 100) / 100,
    tourist_board: "TZG Split",
  };
}

export function staysFor(unit: { id: string }, limit = 12): EvisitorStay[] {
  const seed = unit.id;
  const record = evisitorFor({ id: unit.id });
  if (record.status !== "aktivan") return [];

  const stays: EvisitorStay[] = [];
  let cursor = -pickInRange(seed, "first-gap", 2, 10);
  const targetCount = limit;

  for (let i = 0; i < targetCount; i++) {
    const gap = pickInRange(seed, `gap-${i}`, 1, 6);
    const nights = pickInRange(seed, `n-${i}`, 1, 7);
    cursor -= gap + nights;
    const checkInDate = new Date(TODAY);
    checkInDate.setUTCDate(checkInDate.getUTCDate() + cursor);
    const checkIn = checkInDate.toISOString();
    const checkOut = addDays(checkIn, nights);
    const guestCap = Math.max(2, record.registered_beds);
    const guests = pickInRange(seed, `g-${i}`, 1, guestCap);
    const country = COUNTRIES[hash(seed + `c-${i}`) % COUNTRIES.length];
    const source = SOURCES[hash(seed + `s-${i}`) % SOURCES.length];
    stays.push({
      id: `${unit.id}-stay-${i}`,
      check_in: checkIn,
      check_out: checkOut,
      nights,
      guests,
      country,
      source,
    });
  }

  return stays.sort((a, b) => (a.check_in < b.check_in ? 1 : -1));
}

export function occupancyByDay(
  stays: EvisitorStay[],
  daysBack: number
): Map<string, number> {
  const map = new Map<string, number>();
  for (let i = 0; i < daysBack; i++) {
    const d = new Date(TODAY);
    d.setUTCDate(d.getUTCDate() - i);
    map.set(isoDay(d.toISOString()), 0);
  }
  for (const stay of stays) {
    const start = new Date(stay.check_in);
    for (let n = 0; n < stay.nights; n++) {
      const d = new Date(start);
      d.setUTCDate(d.getUTCDate() + n);
      const key = isoDay(d.toISOString());
      if (map.has(key)) map.set(key, (map.get(key) ?? 0) + stay.guests);
    }
  }
  return map;
}

export function hepFor(unit: { id: string }): UtilityReading {
  const record = evisitorFor({ id: unit.id });
  const baseline = 1.8;
  const occupied = record.status === "aktivan" && record.last_check_in_at;
  const ratio = occupied
    ? 4 + (hash(unit.id + "hep") % 100) / 16
    : 0.7 + (hash(unit.id + "hep-low") % 30) / 100;
  const avg = +(baseline * ratio).toFixed(1);
  return {
    avg_per_period: avg,
    baseline_empty: baseline,
    occupancy_ratio: +ratio.toFixed(1),
    period_label: "Zadnja 3 mjeseca",
    last_value: avg,
  };
}

export function vodovodFor(unit: { id: string }): UtilityReading {
  const record = evisitorFor({ id: unit.id });
  const baseline = 2.5;
  const occupied = record.status === "aktivan" && record.last_check_in_at;
  const ratio = occupied
    ? 2.5 + (hash(unit.id + "vod") % 100) / 30
    : 0.6 + (hash(unit.id + "vod-low") % 30) / 100;
  const avg = +(baseline * ratio).toFixed(1);
  return {
    avg_per_period: avg,
    baseline_empty: baseline,
    occupancy_ratio: +ratio.toFixed(1),
    period_label: "Zadnja 3 mjeseca",
    last_value: avg,
  };
}

export function monitoringStatusFor(unit: {
  id: string;
  name?: string | null;
  beds?: number | null;
  category?: string | null;
}): MonitoringStatus {
  const record = evisitorFor(unit);
  const hep = hepFor(unit);
  const occupiedByUtility = hep.occupancy_ratio >= 1.5;
  const reportingActive = record.status === "aktivan" && record.reported_nights_ytd > 30;

  if (occupiedByUtility && reportingActive) {
    return {
      kind: "occupied_reporting",
      reason: "Potrošnja struje i vode pokazuje zauzetost, eVisitor evidencija aktivna.",
    };
  }
  if (occupiedByUtility && !reportingActive) {
    return {
      kind: "occupied_silent",
      reason: "HEP/Vodovod pokazuju aktivnost, ali u eVisitoru nema (dovoljno) prijavljenih noćenja.",
    };
  }
  if (!occupiedByUtility && reportingActive) {
    return {
      kind: "empty_reporting",
      reason: "eVisitor prijavljuje noćenja, ali utilities pokazuju prazan stan — moguća lažna prijava.",
    };
  }
  return {
    kind: "empty_silent",
    reason: "Stan se ne koristi — bez potrošnje, bez prijava. Vjerojatno mirovanje.",
  };
}

export function evisitorLookupForCandidate(
  candidate: { id: string; title?: string | null; neighborhood?: string | null },
  options: { confidenceUnregistered?: number } = {}
): EvisitorLookup {
  if ((options.confidenceUnregistered ?? 0) >= 0.5) {
    return { found: false, reason: "no_registration" };
  }
  const seed = candidate.id + (candidate.title ?? "") + (candidate.neighborhood ?? "");
  const h = hash(seed);
  if (h % 100 < 50) return { found: false, reason: "no_registration" };
  return { found: true, record: evisitorFor({ id: candidate.id }) };
}
