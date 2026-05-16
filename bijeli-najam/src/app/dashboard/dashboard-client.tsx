"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useResolved, type Resolution } from "@/lib/resolved-store";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ConfidenceBadge } from "@/components/domain/confidence-badge";
import {
  CheckCircle,
  MapPin,
  Bed,
  Lightning,
  Drop,
} from "@phosphor-icons/react";
import { cn } from "@/lib/utils";
import type { Flag } from "@/lib/types";

const AUTO_FLAG_THRESHOLD = 0.9;

export type MonitoringAlert = {
  id: string;
  name: string;
  owner: string | null;
  neighborhood: string | null;
  beds: number | null;
  lat: number | null;
  lon: number | null;
  status: "occupied_silent" | "empty_reporting";
  reason: string;
  hep_kwh_per_day: number;
  vodovod_m3_per_month: number;
  reported_nights_ytd: number;
  mbo: string;
  last_check_in_at: string | null;
};

interface Props {
  flags: Flag[];
  monitoringAlerts?: MonitoringAlert[];
}

type Item =
  | { kind: "auto"; id: string; flag: Flag }
  | { kind: "review"; id: string; flag: Flag }
  | { kind: "monitoring"; id: string; alert: MonitoringAlert };

const STATUS_META: Record<
  MonitoringAlert["status"],
  { label: string }
> = {
  occupied_silent: { label: "Aktivan, ne prijavljuje" },
  empty_reporting: { label: "Prijavljuje, prazan" },
};

export function DashboardClient({ flags, monitoringAlerts = [] }: Props) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const { items: resolvedItems } = useResolved();
  const resolved = useMemo(
    () =>
      new Set(
        Object.entries(resolvedItems)
          .filter(([, v]) => v.resolution === "reported" || v.resolution === "dismissed")
          .map(([id]) => id)
      ),
    [resolvedItems]
  );

  const filteredFlags = useMemo(() => {
    const q = search.toLowerCase();
    return flags
      .filter((f) => !resolved.has(f.id))
      .filter(
        (f) =>
          !q ||
          f.candidate_listings?.title?.toLowerCase().includes(q) ||
          f.candidate_listings?.neighborhood?.toLowerCase().includes(q) ||
          f.candidate_listings?.host_name?.toLowerCase().includes(q)
      );
  }, [flags, search, resolved]);

  const filteredMonitoring = useMemo(() => {
    const q = search.toLowerCase();
    return monitoringAlerts
      .filter((m) => !resolved.has(m.id))
      .filter(
        (m) =>
          !q ||
          m.name.toLowerCase().includes(q) ||
          m.neighborhood?.toLowerCase().includes(q) ||
          m.owner?.toLowerCase().includes(q)
      );
  }, [monitoringAlerts, search, resolved]);

  const allAuto = filteredFlags.filter((f) => f.confidence_unregistered >= AUTO_FLAG_THRESHOLD);
  const allReview = filteredFlags.filter((f) => f.confidence_unregistered < AUTO_FLAG_THRESHOLD);
  const allMonitoring = filteredMonitoring;

  const items: Item[] = useMemo(() => {
    const list: Item[] = [
      ...allAuto.map((f): Item => ({ kind: "auto", id: f.id, flag: f })),
      ...allReview.map((f): Item => ({ kind: "review", id: f.id, flag: f })),
      ...allMonitoring.map((m): Item => ({ kind: "monitoring", id: m.id, alert: m })),
    ];

    // Sort: high-confidence flags first, then review, then monitoring
    return list.sort((a, b) => {
      const kindOrder = { auto: 0, review: 1, monitoring: 2 } as const;
      const k = kindOrder[a.kind] - kindOrder[b.kind];
      if (k !== 0) return k;
      if (a.kind !== "monitoring" && b.kind !== "monitoring") {
        return b.flag.confidence_unregistered - a.flag.confidence_unregistered;
      }
      return 0;
    });
  }, [allAuto, allReview, allMonitoring]);

  const reportedCount = Object.values(resolvedItems).filter(
    (i) => i.resolution === "reported"
  ).length;

  function openItem(it: Item) {
    if (it.kind === "monitoring") {
      router.push(`/dashboard/registrirani/${it.id}`);
    } else {
      router.push(`/dashboard/${it.id}`);
    }
  }

  return (
    <div className="flex flex-col h-full">
      <div className="px-6 pt-6 pb-4 border-b space-y-6">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">Za provjeru</h1>
          <p className="text-sm text-muted-foreground">
            Oglasi i registrirani objekti koje treba pregledati. Klikni redak za detalje i pokretanje naloga.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Input
            placeholder="Pretraži po naslovu, kvartu, domaćinu…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="max-w-xs h-8 text-sm"
          />
          <span className="text-xs text-muted-foreground tabular-nums">
            {items.length} predmeta
          </span>

          <a
            href="/dashboard/prijavljeni"
            className="ml-auto flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            <CheckCircle size={12} />
            {reportedCount} prijavljeno →
          </a>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="px-6 py-4">
          {items.length === 0 ? (
            <div className="rounded-lg border flex flex-col items-center justify-center gap-3 text-center py-20 px-6">
              <CheckCircle size={40} className="text-muted-foreground/40" />
              <p className="font-medium text-muted-foreground">Nema predmeta za provjeru</p>
              <p className="text-sm text-muted-foreground">
                Pokušajte drukčiji filter ili pretragu.
              </p>
            </div>
          ) : (
            <div className="rounded-lg border divide-y overflow-hidden">
              {items.map((it) =>
                it.kind === "monitoring" ? (
                  <MonitoringRow key={it.id} alert={it.alert} onOpen={() => openItem(it)} />
                ) : (
                  <FlagRow
                    key={it.id}
                    flag={it.flag}
                    variant={it.kind}
                    onOpen={() => openItem(it)}
                  />
                )
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function FlagRow({
  flag,
  variant,
  onOpen,
}: {
  flag: Flag;
  variant: "auto" | "review";
  onOpen: () => void;
}) {
  const listing = flag.candidate_listings;
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onOpen();
        }
      }}
      className={cn(
        "group px-6 py-4 flex items-center gap-4 cursor-pointer transition-colors duration-150 hover:bg-black/5 focus:outline-none focus:bg-black/5",
        "border-l-2",
        variant === "auto" ? "border-l-destructive" : "border-l-[var(--brand-orange-500)]"
      )}
    >
      <div className="flex-1 min-w-0 space-y-0.5">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="text-sm font-medium truncate">{listing?.title ?? "—"}</p>
          {listing?.platform && (
            <Badge variant="outline" className="text-[10px] capitalize px-1.5 py-0">
              {listing.platform}
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
          {listing?.host_name && <span>{listing.host_name}</span>}
          {listing?.neighborhood && (
            <span className="flex items-center gap-1">
              <MapPin size={11} />
              {listing.neighborhood}
            </span>
          )}
          {listing?.beds && (
            <span className="flex items-center gap-1">
              <Bed size={11} />
              {listing.beds} kr.
            </span>
          )}
        </div>
      </div>
      <div className="ml-auto shrink-0">
        <ConfidenceBadge score={flag.confidence_unregistered} size="sm" />
      </div>
    </div>
  );
}

function MonitoringRow({
  alert,
  onOpen,
}: {
  alert: MonitoringAlert;
  onOpen: () => void;
}) {
  const meta = STATUS_META[alert.status];
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onOpen();
        }
      }}
      className="group px-6 py-4 flex items-center gap-4 cursor-pointer transition-colors duration-150 hover:bg-black/5 focus:outline-none focus:bg-black/5 border-l-2 border-l-destructive"
    >
      <div className="flex-1 min-w-0 space-y-0.5">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="text-sm font-medium truncate">{alert.name}</p>
          <Badge variant="outline" className="text-[10px] px-1.5 py-0">
            Registriran
          </Badge>
        </div>
        <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
          {alert.owner && <span>{alert.owner}</span>}
          {alert.neighborhood && (
            <span className="flex items-center gap-1">
              <MapPin size={11} />
              {alert.neighborhood}
            </span>
          )}
          <span className="flex items-center gap-1">
            <Lightning size={11} />
            {alert.hep_kwh_per_day.toFixed(1)} kWh/dan
          </span>
          <span className="flex items-center gap-1">
            <Drop size={11} />
            {alert.vodovod_m3_per_month.toFixed(1)} m³/mj
          </span>
        </div>
      </div>
      <Badge className="bg-destructive/10 text-destructive border-destructive/20 text-xs shrink-0">
        {meta.label}
      </Badge>
    </div>
  );
}
