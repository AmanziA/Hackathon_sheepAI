"use client";

import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  MagnifyingGlass,
  MapPin,
  WarningCircle,
  TrendDown,
  CheckCircle,
  Clock,
  Spinner,
} from "@phosphor-icons/react";
import { ConfidenceBadge } from "./confidence-badge";
import { lookupAddress, type LookupResult } from "@/lib/lookup-mock";
import { formatEur } from "@/lib/format";
import { cn } from "@/lib/utils";

const LookupMap = dynamic(() => import("./lookup-map").then((m) => m.LookupMap), {
  ssr: false,
  loading: () => (
    <div className="h-[460px] w-full rounded-lg border bg-muted/30 animate-pulse" />
  ),
});

// Split bounding box (lon_min, lat_min, lon_max, lat_max) for Photon
const SPLIT_BBOX = "16.30,43.42,16.62,43.58";
const SPLIT_CENTER = { lat: 43.5081, lon: 16.4402 };

type Tab = "flagged" | "registered" | "recent";

type Suggestion = {
  display: string;
  short: string;
  lat: number;
  lon: number;
  osm_type: string;
  osm_id: number;
};

export function AddressLookup() {
  const [address, setAddress] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<LookupResult | null>(null);
  const [tab, setTab] = useState<Tab>("flagged");
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [suggestLoading, setSuggestLoading] = useState(false);
  const [suggestOpen, setSuggestOpen] = useState(false);
  const [activeIdx, setActiveIdx] = useState(-1);
  const [selectedOsm, setSelectedOsm] = useState<{ osm_type: string; osm_id: number } | null>(null);
  const skipNextFetch = useRef(false);
  const inputWrapRef = useRef<HTMLDivElement>(null);

  // Debounced Photon autocomplete (OSM-based, designed for incremental search)
  useEffect(() => {
    const q = address.trim();
    if (skipNextFetch.current) {
      skipNextFetch.current = false;
      return;
    }
    if (q.length < 2) {
      setSuggestions([]);
      setSuggestOpen(false);
      return;
    }

    const ctrl = new AbortController();
    const timer = setTimeout(async () => {
      setSuggestLoading(true);
      try {
        const url = new URL("https://photon.komoot.io/api/");
        url.searchParams.set("q", q);
        url.searchParams.set("lat", String(SPLIT_CENTER.lat));
        url.searchParams.set("lon", String(SPLIT_CENTER.lon));
        url.searchParams.set("bbox", SPLIT_BBOX);
        url.searchParams.set("limit", "8");
        url.searchParams.set("lang", "default");

        const res = await fetch(url.toString(), { signal: ctrl.signal });
        if (!res.ok) throw new Error("photon");
        const data = (await res.json()) as {
          features: Array<{
            geometry: { coordinates: [number, number] };
            properties: {
              osm_id: number;
              osm_type: "W" | "N" | "R";
              osm_key?: string;
              osm_value?: string;
              type?: string;
              name?: string;
              street?: string;
              housenumber?: string;
              postcode?: string;
              city?: string;
              district?: string;
              suburb?: string;
              locality?: string;
              county?: string;
              country?: string;
            };
          }>;
        };

        const TYPE_MAP: Record<string, string> = { W: "way", N: "node", R: "relation" };

        const items: Suggestion[] = data.features
          .filter((f) => {
            const p = f.properties;
            const city = p.city ?? p.district ?? p.county ?? "";
            const country = p.country ?? "";
            // Keep only Croatian Split results (bbox already filters most)
            return country.toLowerCase().includes("hrvat") || country.toLowerCase().includes("croatia") || /split/i.test(city);
          })
          .map((f) => {
            const p = f.properties;
            const [lon, lat] = f.geometry.coordinates;
            const street =
              p.housenumber && p.street
                ? `${p.street} ${p.housenumber}`
                : p.street ?? p.name ?? "";
            const area = p.suburb ?? p.district ?? p.city ?? p.locality ?? "";
            const primary = street && p.name && p.name !== p.street
              ? `${p.name} · ${street}`
              : street || p.name || "";
            const short = [primary, area].filter(Boolean).join(", ");
            const display = [primary, area, p.postcode, p.city ?? "Split", p.country]
              .filter(Boolean)
              .join(", ");
            return {
              display,
              short: short || display,
              lat,
              lon,
              osm_type: TYPE_MAP[p.osm_type] ?? p.osm_type,
              osm_id: p.osm_id,
            };
          });

        setSuggestions(items);
        setSuggestOpen(items.length > 0);
        setActiveIdx(-1);
      } catch (err) {
        if ((err as Error).name !== "AbortError") {
          setSuggestions([]);
          setSuggestOpen(false);
        }
      } finally {
        setSuggestLoading(false);
      }
    }, 220);

    return () => {
      clearTimeout(timer);
      ctrl.abort();
    };
  }, [address]);

  // Close dropdown on outside click
  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (!inputWrapRef.current?.contains(e.target as Node)) setSuggestOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  function runLookup(addr: string, coords?: { lat: number; lon: number }) {
    setLoading(true);
    setResult(null);
    setSuggestOpen(false);
    setTimeout(() => {
      setResult(lookupAddress(addr, coords));
      setLoading(false);
    }, 350);
  }

  function selectSuggestion(s: Suggestion) {
    skipNextFetch.current = true;
    setAddress(s.short);
    setSuggestOpen(false);
    setActiveIdx(-1);
    setSelectedOsm({ osm_type: s.osm_type, osm_id: s.osm_id });
    runLookup(s.short, { lat: s.lat, lon: s.lon });
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (activeIdx >= 0 && suggestions[activeIdx]) {
      selectSuggestion(suggestions[activeIdx]);
      return;
    }
    if (!address.trim()) return;
    setSelectedOsm(null);
    runLookup(address.trim());
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!suggestOpen || suggestions.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIdx((i) => (i + 1) % suggestions.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIdx((i) => (i <= 0 ? suggestions.length - 1 : i - 1));
    } else if (e.key === "Escape") {
      setSuggestOpen(false);
    }
  }

  const recent = result
    ? [...result.flagged].sort((a, b) => a.days_ago - b.days_ago).slice(0, 5)
    : [];

  return (
    <div className="space-y-6">
      <form onSubmit={handleSubmit} className="flex gap-2 relative">
        <div ref={inputWrapRef} className="flex-1 relative">
          <Input
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            onFocus={() => suggestions.length > 0 && setSuggestOpen(true)}
            onKeyDown={handleKeyDown}
            placeholder="npr. Spinčićeva 5, Split"
            aria-label="Unesite adresu"
            aria-autocomplete="list"
            aria-expanded={suggestOpen}
            required
            autoComplete="off"
          />
          {suggestLoading && (
            <Spinner
              size={14}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground animate-spin pointer-events-none"
            />
          )}
          {suggestOpen && suggestions.length > 0 && (
            <ul
              role="listbox"
              className="absolute z-20 left-0 right-0 top-full mt-1 bg-popover border rounded-md shadow-lg overflow-hidden text-sm"
            >
              {suggestions.map((s, i) => (
                <li
                  key={`${s.lat}-${s.lon}-${i}`}
                  role="option"
                  aria-selected={i === activeIdx}
                  onMouseEnter={() => setActiveIdx(i)}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    selectSuggestion(s);
                  }}
                  className={cn(
                    "px-3 py-2 cursor-pointer flex items-start gap-2",
                    i === activeIdx ? "bg-muted" : "hover:bg-muted/60"
                  )}
                >
                  <MapPin size={14} className="text-muted-foreground mt-0.5 shrink-0" />
                  <div className="min-w-0">
                    <p className="truncate">{s.short}</p>
                    <p className="text-xs text-muted-foreground truncate">{s.display}</p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
        <Button type="submit" disabled={loading} className="gap-2">
          <MagnifyingGlass size={16} />
          {loading ? "Tražim..." : "Pretraži"}
        </Button>
      </form>

      {result && (
        <div className="grid lg:grid-cols-2 gap-5">
          {/* LEFT: map */}
          <div className="lg:order-1 order-2">
            <LookupMap
              searched={{
                lat: result.searched.lat,
                lon: result.searched.lon,
                address: result.searched.address,
              }}
              flagged={result.flagged.map((f) => ({
                id: f.id,
                lat: f.lat,
                lon: f.lon,
                title: `${f.title} · ${f.platform}`,
                distance_m: f.distance_m,
              }))}
              registered={result.registered.map((r) => ({
                id: r.id,
                lat: r.lat,
                lon: r.lon,
                name: r.name,
                distance_m: r.distance_m,
              }))}
              osm={selectedOsm}
            />
          </div>

          {/* RIGHT: snapshot + cost + tabs */}
          <div className="lg:order-2 order-1 space-y-4">
            <SnapshotCard result={result} />

            <div className="rounded-lg border overflow-hidden">
              <div className="flex items-center gap-1 border-b px-2 py-1.5 bg-muted/30">
                {([
                  { key: "flagged",    label: `Sumnjivi (${result.flagged.length})`, icon: <WarningCircle size={12} /> },
                  { key: "registered", label: `Registrirani (${result.registered.length})`, icon: <CheckCircle size={12} /> },
                  { key: "recent",     label: `Nedavni (${recent.length})`, icon: <Clock size={12} /> },
                ] as { key: Tab; label: string; icon: React.ReactNode }[]).map((t) => (
                  <button
                    key={t.key}
                    onClick={() => setTab(t.key)}
                    className={cn(
                      "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors",
                      tab === t.key
                        ? "bg-background text-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    {t.icon}
                    {t.label}
                  </button>
                ))}
              </div>

              <div className="divide-y max-h-[260px] overflow-y-auto">
                {tab === "flagged" && result.flagged.map((f) => (
                  <FlaggedRow key={f.id} flag={f} />
                ))}
                {tab === "registered" && result.registered.map((r) => (
                  <RegisteredRow key={r.id} reg={r} />
                ))}
                {tab === "recent" && recent.map((f) => (
                  <FlaggedRow key={f.id} flag={f} showDaysAgo />
                ))}
                {tab === "recent" && recent.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-6">
                    Nema nedavne aktivnosti.
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function SnapshotCard({ result }: { result: LookupResult }) {
  const { snapshot } = result;
  return (
    <div className="rounded-lg border p-4 space-y-3">
      <div className="flex items-center gap-2">
        <MapPin size={14} className="text-muted-foreground" />
        <span className="text-xs uppercase tracking-wide text-muted-foreground font-semibold">
          Kvart
        </span>
        <span className="text-sm font-semibold">{snapshot.kvart_name}</span>
      </div>
      <div className="grid grid-cols-3 gap-3 text-sm">
        <div className="space-y-0.5">
          <p className="text-xs text-muted-foreground">Sumnjivi u kvartu</p>
          <p className="text-xl font-semibold text-destructive tabular-nums">
            {snapshot.flagged_count}
          </p>
        </div>
        <div className="space-y-0.5">
          <p className="text-xs text-muted-foreground">Registrirani</p>
          <p className="text-xl font-semibold text-success tabular-nums">
            {snapshot.registered_count}
          </p>
        </div>
        <div className="space-y-0.5">
          <p className="text-xs text-muted-foreground">Pozicija u gradu</p>
          <p className="text-xl font-semibold tabular-nums">
            #{snapshot.city_rank}
            <span className="text-xs text-muted-foreground font-normal">
              {" "}
              / {snapshot.city_total}
            </span>
          </p>
        </div>
      </div>
      <div className="pt-2 border-t flex items-center gap-1.5 text-xs text-muted-foreground">
        <TrendDown size={13} className="text-destructive" />
        Sumnjivi oglasi rade po{" "}
        <strong className="text-destructive">{formatEur(snapshot.avg_flagged_price)}/noć</strong>
        — <strong>{snapshot.avg_undercut_pct}%</strong> ispod prosječne legalne cijene (
        {formatEur(snapshot.avg_legal_price)}/noć).
      </div>
    </div>
  );
}

function FlaggedRow({
  flag,
  showDaysAgo,
}: {
  flag: LookupResult["flagged"][number];
  showDaysAgo?: boolean;
}) {
  return (
    <div className="px-4 py-3 flex items-center gap-3 hover:bg-muted/30 transition-colors">
      <div className="w-1 h-10 bg-destructive rounded-full shrink-0" />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="text-sm font-medium truncate">{flag.title}</p>
          <Badge variant="outline" className="text-[10px] px-1.5 py-0">
            {flag.platform}
          </Badge>
        </div>
        <p className="text-xs text-muted-foreground flex items-center gap-1.5 flex-wrap">
          <MapPin size={11} />
          {flag.distance_m}m
          <span>·</span>
          <span>{formatEur(flag.price_per_night)}/noć</span>
          {showDaysAgo && (
            <>
              <span>·</span>
              <span className="flex items-center gap-0.5">
                <Clock size={10} />
                prije {flag.days_ago} {flag.days_ago === 1 ? "dan" : "dana"}
              </span>
            </>
          )}
        </p>
      </div>
      <ConfidenceBadge score={flag.confidence_unregistered} size="sm" />
    </div>
  );
}

function RegisteredRow({ reg }: { reg: LookupResult["registered"][number] }) {
  return (
    <div className="px-4 py-3 flex items-center gap-3 hover:bg-muted/30 transition-colors">
      <div className="w-1 h-10 bg-success rounded-full shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{reg.name}</p>
        <p className="text-xs text-muted-foreground flex items-center gap-1.5 flex-wrap">
          <span>{reg.owner}</span>
          <span>·</span>
          <span>{reg.beds} kreveta</span>
          <span>·</span>
          <span className="flex items-center gap-1">
            <MapPin size={11} />
            {reg.distance_m}m
          </span>
        </p>
      </div>
      <Badge variant="outline" className="text-[10px] border-success/30 text-success bg-success/5">
        Registriran
      </Badge>
    </div>
  );
}
