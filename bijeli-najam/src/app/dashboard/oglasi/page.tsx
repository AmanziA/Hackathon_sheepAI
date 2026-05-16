import { cookies } from "next/headers";
import { createClient } from "@/utils/supabase/server";
import { OglasiClient, type OglasiRow } from "./oglasi-client";

export const dynamic = "force-dynamic";

const MOCK_CANDIDATES: OglasiRow[] = [
  { id: "c1",  platform: "airbnb",  title: "Luksuzni apartman — Veli Varoš, Split", host_name: "Marko",                    neighborhood: "Veli Varoš", address: null, price_per_night: 145, beds: 4, guests: 8,  scraped_at: "2026-05-14", url: "https://airbnb.com/rooms/001", status: "no_match", confidence: null, matched_registered_id: null, matched_registered_name: null },
  { id: "c2",  platform: "airbnb",  title: "Studio uz more — Bačvice",              host_name: "Ana",                      neighborhood: "Bačvice",    address: null, price_per_night: 98,  beds: 2, guests: 4,  scraped_at: "2026-05-14", url: "https://airbnb.com/rooms/002", status: "matched", confidence: 0.92, matched_registered_id: null, matched_registered_name: "Apartman Ana" },
  { id: "c3",  platform: "booking", title: "Apartments Sunce d.o.o. — Spinut",      host_name: "Apartments Sunce d.o.o.",  neighborhood: "Spinut",     address: null, price_per_night: 210, beds: 8, guests: 16, scraped_at: "2026-05-14", url: "https://booking.com/hotel/003", status: "flagged", confidence: 0.81, matched_registered_id: null, matched_registered_name: null },
  { id: "c4",  platform: "airbnb",  title: "Pogled na more — Meje",                 host_name: "Ivan",                     neighborhood: "Meje",       address: null, price_per_night: 175, beds: 3, guests: 6,  scraped_at: "2026-05-14", url: "https://airbnb.com/rooms/004", status: "inconclusive", confidence: 0.45, matched_registered_id: null, matched_registered_name: null },
  { id: "c5",  platform: "airbnb",  title: "Žnjan raj — uz plažu",                  host_name: "Petra",                    neighborhood: "Žnjan",      address: null, price_per_night: 122, beds: 2, guests: 4,  scraped_at: "2026-05-14", url: "https://airbnb.com/rooms/005", status: "matched", confidence: 0.88, matched_registered_id: null, matched_registered_name: "Petra Žnjan" },
  { id: "c6",  platform: "airbnb",  title: "Centralni studio Split",                host_name: "Josip",                    neighborhood: "Grad",       address: null, price_per_night: 89,  beds: 1, guests: 2,  scraped_at: "2026-05-14", url: "https://airbnb.com/rooms/006", status: "no_match", confidence: null, matched_registered_id: null, matched_registered_name: null },
  { id: "c7",  platform: "booking", title: "Spinut Family Apartment",               host_name: "Obitelj Tomić",            neighborhood: "Spinut",     address: null, price_per_night: 155, beds: 5, guests: 10, scraped_at: "2026-05-14", url: "https://booking.com/hotel/007", status: "matched", confidence: 0.78, matched_registered_id: null, matched_registered_name: "Obitelj Tomić" },
  { id: "c8",  platform: "airbnb",  title: "Firule Beach Studio",                   host_name: "Karlo",                    neighborhood: "Firule",     address: null, price_per_night: 110, beds: 2, guests: 4,  scraped_at: "2026-05-14", url: "https://airbnb.com/rooms/008", status: "flagged", confidence: 0.73, matched_registered_id: null, matched_registered_name: null },
];

type EntityLinkEmbed = {
  verdict: string;
  confidence: number;
  registered_id: string | null;
  registered_units: { id: string; name: string | null } | null;
};

type FlagEmbed = { id: string; confidence_unregistered: number; status: string };

type DbRow = {
  id: string;
  platform: string;
  title: string;
  host_name: string | null;
  neighborhood: string | null;
  address: string | null;
  street: string | null;
  house_number: string | null;
  price_per_night: number | null;
  beds: number | null;
  guests: number | null;
  scraped_at: string;
  url: string;
  // PostgREST returns these as objects (not arrays) because of the
  // `unique (candidate_id)` constraint on both relations. We normalize below.
  entity_links: EntityLinkEmbed | EntityLinkEmbed[] | null;
  flags: FlagEmbed | FlagEmbed[] | null;
};

function firstOf<T>(rel: T | T[] | null | undefined): T | null {
  if (!rel) return null;
  if (Array.isArray(rel)) return rel[0] ?? null;
  return rel;
}

export default async function OglasiPage() {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  const { data, error } = await supabase
    .from("candidate_listings")
    .select(
      `id, platform, title, host_name, neighborhood, address, street, house_number, price_per_night, beds, guests, scraped_at, url,
       entity_links!left ( verdict, confidence, registered_id, registered_units ( id, name ) ),
       flags!left ( id, confidence_unregistered, status )`,
    )
    .order("scraped_at", { ascending: false })
    .limit(500);

  const dbRows = ((data ?? []) as DbRow[]).map<OglasiRow>((r) => {
    const link = firstOf(r.entity_links);
    const flag = firstOf(r.flags);
    let status: OglasiRow["status"] = "no_match";
    let confidence: number | null = null;
    if (flag && flag.status === "open") {
      status = "flagged";
      confidence = flag.confidence_unregistered;
    } else if (link?.verdict === "matched") {
      status = "matched";
      confidence = link.confidence;
    } else if (link?.verdict === "inconclusive") {
      status = "inconclusive";
      confidence = link.confidence;
    }
    const fullAddress =
      r.address ||
      [r.street, r.house_number].filter(Boolean).join(" ") ||
      null;
    return {
      id: r.id,
      platform: r.platform,
      title: r.title,
      host_name: r.host_name ?? "—",
      neighborhood: r.neighborhood ?? "—",
      address: fullAddress,
      price_per_night: r.price_per_night ?? 0,
      beds: r.beds ?? 0,
      guests: r.guests ?? 0,
      scraped_at: r.scraped_at,
      url: r.url,
      status,
      confidence,
      matched_registered_id: link?.registered_units?.id ?? link?.registered_id ?? null,
      matched_registered_name: link?.registered_units?.name ?? null,
    };
  });

  const rows = dbRows.length > 0 ? dbRows : MOCK_CANDIDATES;
  const usingMock = dbRows.length === 0;

  return (
    <OglasiClient
      candidates={rows}
      usingMock={usingMock}
      error={error?.message ?? null}
    />
  );
}
