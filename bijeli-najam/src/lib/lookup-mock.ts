import { NEIGHBORHOOD_CENTERS, centerForSlug } from "@/lib/split-neighborhoods";

const SPLIT_CENTER = { lat: 43.5081, lon: 16.4402 };

const KEYWORD_TO_SLUG: Record<string, string> = {
  "spinčić": "spinut",
  "spinut": "spinut",
  "bačvi": "bacvice",
  "bacv": "bacvice",
  "veli varoš": "veli-varos",
  "veli varos": "veli-varos",
  "varoš": "veli-varos",
  "meje": "meje",
  "mejas": "meje",
  "mešt": "meje",
  "žnja": "znjan",
  "znja": "znjan",
  "firul": "firule",
  "sućidar": "sucidar",
  "sucidar": "sucidar",
  "lovret": "lovret",
  "kman": "kman",
  "trstenik": "trstenik",
  "dioklecijan": "grad",
  "krešimir": "grad",
  "kresimir": "grad",
  "stari grad": "grad",
  "grad": "grad",
};

const KVART_LABEL: Record<string, string> = {
  "veli-varos": "Veli Varoš",
  "mali-varos": "Mali Varoš",
  "bacvice": "Bačvice",
  "spinut": "Spinut",
  "meje": "Meje",
  "znjan": "Žnjan",
  "firule": "Firule",
  "sucidar": "Sućidar",
  "grad": "Grad (Stari grad)",
  "trstenik": "Trstenik",
  "lovret": "Lovret",
  "kman": "Kman",
};

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

function offsetMeters(seed: string, salt: string, maxRadius: number): { dx: number; dy: number } {
  const angle = (hash(seed + salt + "a") % 360) * (Math.PI / 180);
  const dist = (hash(seed + salt + "d") % maxRadius) + 30;
  return { dx: Math.cos(angle) * dist, dy: Math.sin(angle) * dist };
}

function toLatLon(
  base: { lat: number; lon: number },
  dx: number,
  dy: number
): { lat: number; lon: number } {
  const lat = base.lat + dy / 111000;
  const lon = base.lon + dx / (111000 * Math.cos((base.lat * Math.PI) / 180));
  return { lat, lon };
}

export type LookupResult = {
  searched: { address: string; lat: number; lon: number; kvart_slug: string; kvart_name: string };
  flagged: Array<{
    id: string;
    title: string;
    platform: string;
    distance_m: number;
    confidence_unregistered: number;
    price_per_night: number;
    lat: number;
    lon: number;
    days_ago: number;
  }>;
  registered: Array<{
    id: string;
    name: string;
    owner: string;
    beds: number;
    distance_m: number;
    lat: number;
    lon: number;
  }>;
  snapshot: {
    kvart_name: string;
    registered_count: number;
    flagged_count: number;
    avg_undercut_pct: number;
    city_rank: number;
    city_total: number;
    avg_legal_price: number;
    avg_flagged_price: number;
  };
  estimated_loss_eur_per_year: number;
};

function detectKvart(addr: string): { slug: string; name: string } {
  const low = addr.toLowerCase();
  for (const [keyword, slug] of Object.entries(KEYWORD_TO_SLUG)) {
    if (low.includes(keyword)) {
      return { slug, name: KVART_LABEL[slug] ?? slug };
    }
  }
  return { slug: "grad", name: KVART_LABEL.grad };
}

const PLATFORMS = ["Airbnb", "Booking.com"];
const TITLES = [
  "Luksuzni apartman uz more",
  "Studio Marko",
  "Apartman Ana",
  "Heritage Stay Studio",
  "Apartman Vila Petar",
  "Sea View Apartments d.o.o.",
  "Stari grad mirno",
  "Old Town Loft",
  "Centralni studio",
  "Riva View Apartment",
];

const OWNERS = [
  "Kovač Ivan",
  "Marović Ante",
  "Sunčić Josip",
  "Perić Mara",
  "Lukić Luka",
  "Antunović Toni",
  "Stjepanović Stjepan",
];

export function lookupAddress(
  rawAddress: string,
  override?: { lat: number; lon: number }
): LookupResult {
  const address = rawAddress.trim();
  const seed = address.toLowerCase();
  const kvart = detectKvart(address);
  const base = centerForSlug(kvart.slug) ?? SPLIT_CENTER;

  // Use real coords if available, otherwise small offset within the kvart
  const ownPos = override
    ? { lat: override.lat, lon: override.lon }
    : (() => {
        const own = offsetMeters(seed, "own", 120);
        return toLatLon(base, own.dx, own.dy);
      })();

  const flaggedCount = 3 + (hash(seed + "fc") % 5); // 3..7
  const flagged = Array.from({ length: flaggedCount }, (_, i) => {
    const offset = offsetMeters(seed, `f${i}`, 450);
    const pos = toLatLon(ownPos, offset.dx, offset.dy);
    const distance_m = Math.round(Math.hypot(offset.dx, offset.dy));
    const platform = PLATFORMS[i % PLATFORMS.length];
    const price = pickInRange(seed, `fp${i}`, 78, 245);
    const confidence = 0.55 + (hash(seed + `fc${i}`) % 45) / 100;
    return {
      id: `lookup-flag-${i}`,
      title: TITLES[hash(seed + `ft${i}`) % TITLES.length],
      platform,
      distance_m,
      confidence_unregistered: Math.min(0.99, confidence),
      price_per_night: price,
      lat: pos.lat,
      lon: pos.lon,
      days_ago: pickInRange(seed, `fd${i}`, 1, 30),
    };
  }).sort((a, b) => a.distance_m - b.distance_m);

  const registeredCount = 2 + (hash(seed + "rc") % 4); // 2..5
  const registered = Array.from({ length: registeredCount }, (_, i) => {
    const offset = offsetMeters(seed, `r${i}`, 480);
    const pos = toLatLon(ownPos, offset.dx, offset.dy);
    const distance_m = Math.round(Math.hypot(offset.dx, offset.dy));
    return {
      id: `lookup-reg-${i}`,
      name: TITLES[hash(seed + `rt${i}`) % TITLES.length],
      owner: OWNERS[hash(seed + `ro${i}`) % OWNERS.length],
      beds: pickInRange(seed, `rb${i}`, 2, 6),
      distance_m,
      lat: pos.lat,
      lon: pos.lon,
    };
  }).sort((a, b) => a.distance_m - b.distance_m);

  const avgFlaggedPrice = Math.round(
    flagged.reduce((s, f) => s + f.price_per_night, 0) / flagged.length
  );
  const avgLegalPrice = avgFlaggedPrice + pickInRange(seed, "gap", 45, 95);
  const avgUndercut = Math.round(((avgLegalPrice - avgFlaggedPrice) / avgLegalPrice) * 100);

  const cityRanks: string[] = [
    "veli-varos",
    "bacvice",
    "spinut",
    "meje",
    "znjan",
    "firule",
    "sucidar",
    "grad",
    "trstenik",
    "lovret",
    "kman",
  ];
  const cityRank = Math.max(1, cityRanks.indexOf(kvart.slug) + 1);
  const cityTotal = Object.keys(NEIGHBORHOOD_CENTERS).length;

  const avgNightsPerYear = 140;
  const estimated_loss_eur_per_year = Math.round(
    (avgLegalPrice - avgFlaggedPrice) * avgNightsPerYear * 0.18
  );

  return {
    searched: {
      address,
      lat: ownPos.lat,
      lon: ownPos.lon,
      kvart_slug: kvart.slug,
      kvart_name: kvart.name,
    },
    flagged,
    registered,
    snapshot: {
      kvart_name: kvart.name,
      registered_count: registered.length * (3 + (hash(seed + "rmult") % 8)),
      flagged_count: flagged.length * (3 + (hash(seed + "fmult") % 8)),
      avg_undercut_pct: avgUndercut,
      city_rank: cityRank,
      city_total: cityTotal,
      avg_legal_price: avgLegalPrice,
      avg_flagged_price: avgFlaggedPrice,
    },
    estimated_loss_eur_per_year,
  };
}
