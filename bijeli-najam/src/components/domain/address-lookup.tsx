"use client";

import { useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { Input } from "@/components/ui/input";
import { Button, buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  MagnifyingGlass,
  MapPin,
  WarningCircle,
  TrendDown,
  CheckCircle,
  CurrencyEur,
  ChartLineUp,
  Clock,
} from "@phosphor-icons/react";
import { ConfidenceBadge } from "./confidence-badge";
import { lookupAddress, type LookupResult } from "@/lib/lookup-mock";
import { formatEur } from "@/lib/format";
import { cn } from "@/lib/utils";

const Map3D = dynamic(() => import("./map3d"), { ssr: false });

const ADDRESS_BLUE: [number, number, number, number] = [37, 99, 235, 230];
const REGISTERED_GREEN: [number, number, number, number] = [22, 163, 74, 220];

type Tab = "flagged" | "registered" | "recent";

export function AddressLookup() {
  const [address, setAddress] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<LookupResult | null>(null);
  const [tab, setTab] = useState<Tab>("flagged");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!address.trim()) return;

    setLoading(true);
    setResult(null);
    await new Promise((r) => setTimeout(r, 600));
    setResult(lookupAddress(address.trim()));
    setLoading(false);
  }

  const markers = useMemo(() => {
    if (!result) return [];
    return [
      {
        id: "__searched__",
        lat: result.searched.lat,
        lon: result.searched.lon,
        confidence: 1,
        title: `Vaša adresa: ${result.searched.address}`,
        color: ADDRESS_BLUE,
      },
      ...result.flagged.map((f) => ({
        id: f.id,
        lat: f.lat,
        lon: f.lon,
        confidence: f.confidence_unregistered,
        title: `${f.title} · ${f.platform} · ${Math.round(f.distance_m)}m`,
      })),
      ...result.registered.map((r) => ({
        id: r.id,
        lat: r.lat,
        lon: r.lon,
        confidence: 0.6,
        title: `${r.name} · ${r.owner} · ${Math.round(r.distance_m)}m (registriran)`,
        color: REGISTERED_GREEN,
      })),
    ];
  }, [result]);

  const recent = result
    ? [...result.flagged].sort((a, b) => a.days_ago - b.days_ago).slice(0, 5)
    : [];

  return (
    <div className="space-y-6">
      <form onSubmit={handleSubmit} className="flex gap-2">
        <Input
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          placeholder="npr. Spinčićeva 5, Split"
          className="flex-1"
          aria-label="Unesite adresu"
          required
        />
        <Button type="submit" disabled={loading} className="gap-2">
          <MagnifyingGlass size={16} />
          {loading ? "Tražim..." : "Pretraži"}
        </Button>
      </form>

      {result && (
        <div className="grid lg:grid-cols-2 gap-5">
          {/* LEFT: map */}
          <div className="lg:order-1 order-2 h-[460px] rounded-lg border overflow-hidden relative">
            <Map3D markers={markers} className="h-full w-full" />
            <div className="absolute top-3 left-3 z-10 bg-background/90 backdrop-blur border rounded-md px-2.5 py-1.5 text-[11px] space-y-1 shadow">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-sm bg-blue-600" />
                <span className="text-muted-foreground">Vaša adresa</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-sm bg-red-600" />
                <span className="text-muted-foreground">Sumnjivi oglas</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-sm bg-green-600" />
                <span className="text-muted-foreground">Registrirani</span>
              </div>
            </div>
          </div>

          {/* RIGHT: snapshot + cost + tabs */}
          <div className="lg:order-2 order-1 space-y-4">
            <SnapshotCard result={result} />
            <CostCard result={result} />

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

          {/* BELOW (full width): CTA */}
          <div className="lg:col-span-2 text-center pt-2 border-t space-y-2">
            <p className="text-sm text-muted-foreground">
              Legalni iznajmljivač? Neregistrirani susjedi direktno utječu na vaš prihod.
            </p>
            <a
              href="https://www.iznajmljivaci.hr"
              target="_blank"
              rel="noopener noreferrer"
              className={cn(buttonVariants({ variant: "outline" }))}
            >
              Pridruži se Klubu Iznajmljivača Hrvatske
            </a>
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

function CostCard({ result }: { result: LookupResult }) {
  return (
    <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 space-y-2">
      <div className="flex items-center gap-2">
        <ChartLineUp size={14} className="text-destructive" />
        <span className="text-xs uppercase tracking-wide text-destructive font-semibold">
          Koliko vas to košta
        </span>
      </div>
      <div className="flex items-baseline gap-2">
        <CurrencyEur size={20} className="text-destructive" />
        <p className="text-3xl font-bold tracking-tight tabular-nums">
          {formatEur(result.estimated_loss_eur_per_year)}
        </p>
        <span className="text-sm text-muted-foreground">procijenjeno godišnje</span>
      </div>
      <p className="text-xs text-muted-foreground leading-relaxed">
        Procjena utjecaja na legalnog iznajmljivača u vašem kvartu — temeljeno na razlici u
        cijeni neregistriranih ponuda i prosjeku ~140 iznajmljenih noći godišnje.
      </p>
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
