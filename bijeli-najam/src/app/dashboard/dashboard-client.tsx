"use client";

import React, { useState, useMemo } from "react";
import dynamic from "next/dynamic";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ConfidenceBadge } from "@/components/domain/confidence-badge";
import {
  WarningCircle,
  CheckCircle,
  Eye,
  MapPin,
  Bed,
  CurrencyEur,
  ArrowSquareOut,
  MagnifyingGlass,
  Image,
  Briefcase,
  FileText,
  Gavel,
  Question,
  FilePdf,
  X,
  Lightning,
  Drop,
} from "@phosphor-icons/react";
import { formatEur } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { Flag } from "@/lib/types";

const Map3D = dynamic(() => import("@/components/domain/map3d"), { ssr: false });

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

type Resolution = "reported" | "dismissed";

type FilterTab = "sve" | "auto" | "provjera" | "registrirani" | "prijavljeni";

export function DashboardClient({ flags, monitoringAlerts = [] }: Props) {
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState<FilterTab>("sve");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedMonitoringId, setSelectedMonitoringId] = useState<string | null>(null);
  const [resolved, setResolved] = useState<Record<string, Resolution>>({});

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    if (!q) return flags;
    return flags.filter(
      (f) =>
        f.candidate_listings?.title?.toLowerCase().includes(q) ||
        f.candidate_listings?.neighborhood?.toLowerCase().includes(q) ||
        f.candidate_listings?.host_name?.toLowerCase().includes(q)
    );
  }, [flags, search]);

  const filteredMonitoring = useMemo(() => {
    const q = search.toLowerCase();
    if (!q) return monitoringAlerts;
    return monitoringAlerts.filter(
      (m) =>
        m.name.toLowerCase().includes(q) ||
        m.neighborhood?.toLowerCase().includes(q) ||
        m.owner?.toLowerCase().includes(q)
    );
  }, [monitoringAlerts, search]);

  const open = filtered.filter((f) => !resolved[f.id]);
  const allAutoFlagged = open.filter((f) => f.confidence_unregistered >= AUTO_FLAG_THRESHOLD);
  const allNeedsReview = open.filter((f) => f.confidence_unregistered < AUTO_FLAG_THRESHOLD);
  const allMonitoring = filteredMonitoring.filter((m) => !resolved[m.id]);
  const resolvedList = filtered.filter((f) => !!resolved[f.id]);
  const resolvedMonitoring = filteredMonitoring.filter((m) => !!resolved[m.id]);

  const showFlagSections = activeTab === "sve" || activeTab === "auto" || activeTab === "provjera";
  const showMonitoring = activeTab === "sve" || activeTab === "registrirani";
  const showReported = activeTab === "prijavljeni";

  const autoFlagged = activeTab === "auto" || activeTab === "sve" ? allAutoFlagged : [];
  const needsReview = activeTab === "provjera" || activeTab === "sve" ? allNeedsReview : [];
  const monitoringRows = showMonitoring ? allMonitoring : [];

  const reportedFlags = filtered.filter((f) => resolved[f.id] === "reported");
  const reportedMonitoring = filteredMonitoring.filter((m) => resolved[m.id] === "reported");
  const dismissedFlags = filtered.filter((f) => resolved[f.id] === "dismissed");
  const dismissedMonitoring = filteredMonitoring.filter((m) => resolved[m.id] === "dismissed");
  const reportedTotal = reportedFlags.length + reportedMonitoring.length;

  const selectedFlag = selectedId ? flags.find((f) => f.id === selectedId) : null;
  const selectedMonitoring = selectedMonitoringId
    ? monitoringAlerts.find((m) => m.id === selectedMonitoringId)
    : null;

  function resolve(id: string, how: Resolution) {
    setResolved((prev) => ({ ...prev, [id]: how }));
    if (selectedId === id) setSelectedId(null);
    if (selectedMonitoringId === id) setSelectedMonitoringId(null);
  }

  const mapMarkers = [
    ...open
      .filter((f) => f.candidate_listings?.approx_lat && f.candidate_listings?.approx_lon)
      .map((f) => ({
        id: f.id,
        lat: f.candidate_listings!.approx_lat!,
        lon: f.candidate_listings!.approx_lon!,
        confidence: f.confidence_unregistered,
        title: f.candidate_listings?.title,
      })),
    ...allMonitoring
      .filter((m) => m.lat != null && m.lon != null)
      .map((m) => ({
        id: m.id,
        lat: m.lat!,
        lon: m.lon!,
        confidence: 0.85,
        title: `${m.name} · ${m.status === "occupied_silent" ? "ne prijavljuje" : "prazan, prijavljuje"}`,
      })),
  ];

  return (
    <div className="flex flex-col h-full">
      {/* Top bar */}
      <div className="flex items-center gap-3 px-4 py-2.5 border-b bg-background">
        {/* Filter tabs */}
        <div className="flex items-center gap-1 bg-muted rounded-lg p-1">
          {([
            { key: "sve",          label: "Sve",                count: allAutoFlagged.length + allNeedsReview.length + allMonitoring.length },
            { key: "auto",         label: "Automatski",         count: allAutoFlagged.length },
            { key: "provjera",     label: "Na provjeri",        count: allNeedsReview.length },
            { key: "registrirani", label: "Sumnjivi registrirani", count: allMonitoring.length },
            { key: "prijavljeni",  label: "Prijavljeni",        count: reportedTotal },
          ] as { key: FilterTab; label: string; count: number }[]).map(({ key, label, count }) => (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors",
                activeTab === key
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {label}
              <span className={cn(
                "rounded-full px-1.5 py-0.5 text-[10px] font-semibold leading-none",
                activeTab === key
                  ? key === "auto" ? "bg-destructive/15 text-destructive"
                  : key === "provjera" ? "bg-amber-100 text-amber-700"
                  : key === "registrirani" ? "bg-destructive/15 text-destructive"
                  : key === "prijavljeni" ? "bg-success/15 text-success"
                  : "bg-muted text-muted-foreground"
                  : "bg-muted-foreground/15 text-muted-foreground"
              )}>
                {count}
              </span>
            </button>
          ))}
        </div>

        <div className="w-px h-5 bg-border mx-1" />

        <Input
          placeholder="Pretraži po naslovu, kvartu, domaćinu..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-xs h-8 text-sm"
        />

        <button
          type="button"
          onClick={() => setActiveTab("prijavljeni")}
          className="ml-auto flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          <CheckCircle size={12} />
          {reportedTotal} prijavljeno
        </button>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Left: action list */}
        <div className="w-[58%] overflow-y-auto flex flex-col">

          {/* Empty state */}
          {open.length === 0 && monitoringRows.length === 0 && (
            <div className="flex flex-col items-center justify-center flex-1 gap-3 text-center py-16 px-6">
              <CheckCircle size={40} className="text-muted-foreground/40" />
              <p className="font-medium text-muted-foreground">Sve je riješeno</p>
              <p className="text-sm text-muted-foreground">Nema neriješenih predmeta.</p>
            </div>
          )}

          {/* AUTO-FLAGGED */}
          {showFlagSections && autoFlagged.length > 0 && (
            <section>
              <div className="px-5 pt-4 pb-2 flex items-center gap-2 sticky top-0 bg-background z-10 border-b">
                <WarningCircle size={14} className="text-destructive" />
                <span className="text-xs font-semibold uppercase tracking-wide text-destructive">
                  Automatski označeni — ≥90%
                </span>
                <Badge className="ml-auto bg-destructive/10 text-destructive border-destructive/20 text-xs">
                  {autoFlagged.length}
                </Badge>
              </div>
              <div className="divide-y">
                {autoFlagged.map((flag) => (
                  <FlagCard
                    key={flag.id}
                    flag={flag}
                    variant="auto"
                    onOpen={() => setSelectedId(flag.id)}
                    onResolve={resolve}
                  />
                ))}
              </div>
            </section>
          )}

          {/* NEEDS REVIEW */}
          {showFlagSections && needsReview.length > 0 && (
            <section className={cn(autoFlagged.length > 0 && "mt-2")}>
              <div className="px-5 pt-4 pb-2 flex items-center gap-2 sticky top-0 bg-background z-10 border-b">
                <Question size={14} className="text-amber-600" />
                <span className="text-xs font-semibold uppercase tracking-wide text-amber-600">
                  Na provjeri — ispod 90%
                </span>
                <Badge className="ml-auto bg-amber-500/10 text-amber-700 border-amber-300 text-xs">
                  {needsReview.length}
                </Badge>
              </div>
              <div className="divide-y">
                {needsReview.map((flag) => (
                  <FlagCard
                    key={flag.id}
                    flag={flag}
                    variant="review"
                    onOpen={() => setSelectedId(flag.id)}
                    onResolve={resolve}
                  />
                ))}
              </div>
            </section>
          )}

          {/* SUMNJIVI REGISTRIRANI (Monitoring red) */}
          {monitoringRows.length > 0 && (
            <section className={cn((autoFlagged.length > 0 || needsReview.length > 0) && "mt-2")}>
              <div className="px-5 pt-4 pb-2 flex items-center gap-2 sticky top-0 bg-background z-10 border-b">
                <Lightning size={14} className="text-destructive" />
                <span className="text-xs font-semibold uppercase tracking-wide text-destructive">
                  Sumnjivi registrirani — HEP/Vodovod ↔ eVisitor
                </span>
                <Badge className="ml-auto bg-destructive/10 text-destructive border-destructive/20 text-xs">
                  {monitoringRows.length}
                </Badge>
              </div>
              <div className="divide-y">
                {monitoringRows.map((alert) => (
                  <MonitoringCard
                    key={alert.id}
                    alert={alert}
                    onOpen={() => setSelectedMonitoringId(alert.id)}
                    onResolve={resolve}
                  />
                ))}
              </div>
            </section>
          )}

          {/* PRIJAVLJENI (dedicated tab) */}
          {showReported && (
            <>
              {reportedTotal === 0 && dismissedFlags.length + dismissedMonitoring.length === 0 && (
                <div className="flex flex-col items-center justify-center flex-1 gap-3 text-center py-16 px-6">
                  <FilePdf size={40} className="text-muted-foreground/40" />
                  <p className="font-medium text-muted-foreground">Još nema prijava</p>
                  <p className="text-sm text-muted-foreground">
                    Predmeti koje pošaljete inspektoru bit će ovdje.
                  </p>
                </div>
              )}

              {reportedTotal > 0 && (
                <section>
                  <div className="px-5 pt-4 pb-2 flex items-center gap-2 sticky top-0 bg-background z-10 border-b">
                    <FilePdf size={14} className="text-success" />
                    <span className="text-xs font-semibold uppercase tracking-wide text-success">
                      Prijavljeno inspektoru
                    </span>
                    <Badge className="ml-auto bg-success/10 text-success border-success/20 text-xs">
                      {reportedTotal}
                    </Badge>
                  </div>
                  <div className="divide-y">
                    {reportedFlags.map((flag) => (
                      <ReportedRow
                        key={flag.id}
                        kind="flag"
                        title={flag.candidate_listings?.title ?? "—"}
                        meta={flag.candidate_listings?.neighborhood ?? ""}
                        href={`/dashboard/${flag.id}`}
                        onUndo={() =>
                          setResolved((prev) => {
                            const { [flag.id]: _r, ...rest } = prev;
                            void _r;
                            return rest;
                          })
                        }
                      />
                    ))}
                    {reportedMonitoring.map((alert) => (
                      <ReportedRow
                        key={alert.id}
                        kind="monitoring"
                        title={alert.name}
                        meta={alert.neighborhood ?? ""}
                        href={`/dashboard/registrirani/${alert.id}`}
                        onUndo={() =>
                          setResolved((prev) => {
                            const { [alert.id]: _r, ...rest } = prev;
                            void _r;
                            return rest;
                          })
                        }
                      />
                    ))}
                  </div>
                </section>
              )}

              {dismissedFlags.length + dismissedMonitoring.length > 0 && (
                <section className="mt-2 opacity-60">
                  <div className="px-5 pt-4 pb-2 flex items-center gap-2 border-b">
                    <X size={14} className="text-muted-foreground" />
                    <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Odbačeno
                    </span>
                    <span className="ml-auto text-xs text-muted-foreground">
                      {dismissedFlags.length + dismissedMonitoring.length}
                    </span>
                  </div>
                  <div className="divide-y">
                    {dismissedFlags.map((flag) => (
                      <div key={flag.id} className="px-5 py-3 flex items-center gap-3">
                        <X size={14} className="text-muted-foreground shrink-0" />
                        <span className="text-sm text-muted-foreground line-through flex-1 truncate">
                          {flag.candidate_listings?.title}
                        </span>
                      </div>
                    ))}
                    {dismissedMonitoring.map((alert) => (
                      <div key={alert.id} className="px-5 py-3 flex items-center gap-3">
                        <X size={14} className="text-muted-foreground shrink-0" />
                        <span className="text-sm text-muted-foreground line-through flex-1 truncate">
                          {alert.name}
                        </span>
                      </div>
                    ))}
                  </div>
                </section>
              )}
            </>
          )}

          {/* Resolved inline (other tabs) — short summary at bottom */}
          {!showReported && (resolvedList.length > 0 || resolvedMonitoring.length > 0) && (
            <button
              type="button"
              onClick={() => setActiveTab("prijavljeni")}
              className="mt-4 mx-5 mb-4 px-3 py-2 rounded-md border text-xs text-muted-foreground hover:bg-muted/40 transition-colors text-left flex items-center gap-2"
            >
              <CheckCircle size={12} className="text-muted-foreground" />
              {resolvedList.length + resolvedMonitoring.length} riješeno · klikni za pregled
            </button>
          )}
        </div>

        {/* Right: 3D map */}
        <div className="flex-1 border-l">
          <Map3D
            markers={mapMarkers}
            onMarkerClick={(id: string) => {
              if (monitoringAlerts.some((m) => m.id === id)) setSelectedMonitoringId(id);
              else setSelectedId(id);
            }}
            className="h-full w-full"
          />
        </div>
      </div>

      {/* Evidence sheet — candidate flag */}
      <Sheet open={!!selectedId} onOpenChange={(o: boolean) => !o && setSelectedId(null)}>
        <SheetContent className="w-[480px] sm:max-w-[480px] overflow-y-auto px-6 py-6">
          <SheetHeader className="mb-4">
            <SheetTitle className="text-base leading-snug pr-6">
              {selectedFlag?.candidate_listings?.title ?? "Dokazi"}
            </SheetTitle>
          </SheetHeader>
          {selectedFlag && (
            <EvidenceSheetContent
              flag={selectedFlag}
              resolution={resolved[selectedFlag.id]}
              onResolve={resolve}
            />
          )}
        </SheetContent>
      </Sheet>

      {/* Evidence sheet — monitoring alert */}
      <Sheet
        open={!!selectedMonitoringId}
        onOpenChange={(o: boolean) => !o && setSelectedMonitoringId(null)}
      >
        <SheetContent className="w-[480px] sm:max-w-[480px] overflow-y-auto px-6 py-6">
          <SheetHeader className="mb-4">
            <SheetTitle className="text-base leading-snug pr-6">
              {selectedMonitoring?.name ?? "Dokazi"}
            </SheetTitle>
          </SheetHeader>
          {selectedMonitoring && (
            <MonitoringSheetContent
              alert={selectedMonitoring}
              resolution={resolved[selectedMonitoring.id]}
              onResolve={resolve}
            />
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}

/* ─── Flag card ─────────────────────────────────────────────────────────── */

function ReportedRow({
  kind,
  title,
  meta,
  href,
  onUndo,
}: {
  kind: "flag" | "monitoring";
  title: string;
  meta: string;
  href: string;
  onUndo: () => void;
}) {
  return (
    <div className="px-5 py-3 flex items-center gap-3">
      <FilePdf size={14} className="text-success shrink-0" />
      <div className="flex-1 min-w-0">
        <a href={href} className="text-sm font-medium hover:underline block truncate">
          {title}
        </a>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Badge variant="outline" className="text-[10px] px-1.5 py-0">
            {kind === "flag" ? "Oglas" : "Registrirani"}
          </Badge>
          {meta && <span>{meta}</span>}
        </div>
      </div>
      <Button
        size="sm"
        variant="ghost"
        className="h-7 text-xs text-muted-foreground"
        onClick={onUndo}
      >
        Vrati
      </Button>
    </div>
  );
}

function FlagCard({
  flag,
  variant,
  onOpen,
  onResolve,
}: {
  flag: Flag;
  variant: "auto" | "review";
  onOpen: () => void;
  onResolve: (id: string, how: Resolution) => void;
}) {
  const listing = flag.candidate_listings;

  return (
    <div
      className={cn(
        "px-5 py-4 flex gap-4 hover:bg-muted/40 transition-colors",
        variant === "auto" ? "border-l-2 border-l-destructive" : "border-l-2 border-l-amber-400"
      )}
    >
      {/* Left: confidence + info */}
      <div className="flex-1 min-w-0 space-y-1.5">
        <div className="flex items-center gap-2 flex-wrap">
          <ConfidenceBadge score={flag.confidence_unregistered} size="sm" />
          <Badge variant="outline" className="text-xs capitalize">{listing?.platform}</Badge>
          {listing?.neighborhood && (
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              <MapPin size={11} />
              {listing.neighborhood}
            </span>
          )}
        </div>
        <p
          className="text-sm font-medium truncate cursor-pointer hover:underline"
          onClick={onOpen}
        >
          {listing?.title ?? "—"}
        </p>
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          {listing?.host_name && <span>{listing.host_name}</span>}
          {listing?.beds && (
            <span className="flex items-center gap-1">
              <Bed size={11} />
              {listing.beds} kr.
            </span>
          )}
          {listing?.price_per_night && (
            <span className="flex items-center gap-1">
              <CurrencyEur size={11} />
              {listing.price_per_night} €/noć
            </span>
          )}
        </div>
      </div>

      {/* Right: actions */}
      <div className="flex flex-col gap-1.5 shrink-0 justify-center">
        {variant === "auto" ? (
          <>
            <Button
              size="sm"
              className="gap-1.5 h-7 text-xs"
              onClick={() => onResolve(flag.id, "reported")}
            >
              <FilePdf size={13} />
              Generiraj prijavu
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="gap-1.5 h-7 text-xs text-muted-foreground"
              onClick={() => onResolve(flag.id, "dismissed")}
            >
              <X size={13} />
              Odbaci
            </Button>
          </>
        ) : (
          <>
            <Button
              size="sm"
              variant="outline"
              className="gap-1.5 h-7 text-xs border-amber-300 text-amber-700 hover:bg-amber-50"
              onClick={onOpen}
            >
              <Eye size={13} />
              Provjeri
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="gap-1.5 h-7 text-xs text-muted-foreground"
              onClick={() => onResolve(flag.id, "dismissed")}
            >
              <X size={13} />
              Odbaci
            </Button>
          </>
        )}
      </div>
    </div>
  );
}

/* ─── Evidence sheet content ────────────────────────────────────────────── */

const TOOL_ICONS: Record<string, React.ReactNode> = {
  search_htz_registry: <MagnifyingGlass size={14} />,
  get_htz_listing: <FileText size={14} />,
  search_sudski_registar: <Briefcase size={14} />,
  phash_compare: <Image size={14} />,
  geocode: <MapPin size={14} />,
  normalize_croatian: <FileText size={14} />,
  check_hep_consumption: <Lightning size={14} />,
  check_vodovod_consumption: <Drop size={14} />,
};

function splitFact(fact: string): { action: string; finding: string | null } {
  const idx = fact.indexOf(" — ");
  if (idx === -1) return { action: fact, finding: null };
  return { action: fact.slice(0, idx), finding: fact.slice(idx + 3) };
}

function EvidenceSheetContent({
  flag,
  resolution,
  onResolve,
}: {
  flag: Flag;
  resolution: Resolution | undefined;
  onResolve: (id: string, how: Resolution) => void;
}) {
  const listing = flag.candidate_listings;
  const trace = flag.agent_traces;
  const isAuto = flag.confidence_unregistered >= AUTO_FLAG_THRESHOLD;

  return (
    <div className="space-y-4">
      <a
        href={`/dashboard/${flag.id}`}
        className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
      >
        Otvori punu stranicu <ArrowSquareOut size={11} />
      </a>

      {/* Status banner */}
      {resolution ? (
        <div className="rounded-xl bg-muted px-4 py-3 flex items-center gap-2.5">
          <CheckCircle size={16} className="text-muted-foreground shrink-0" />
          <span className="text-sm text-muted-foreground">
            {resolution === "reported" ? "Prijavljeno inspektoru" : "Odbačeno"}
          </span>
        </div>
      ) : isAuto ? (
        <div className="rounded-xl bg-destructive/10 border border-destructive/20 px-4 py-3 flex items-center gap-2.5">
          <WarningCircle size={16} className="text-destructive shrink-0" />
          <span className="text-sm font-medium text-destructive">Automatski označeno</span>
          <span className="ml-auto"><ConfidenceBadge score={flag.confidence_unregistered} size="sm" /></span>
        </div>
      ) : (
        <div className="rounded-xl bg-amber-500/10 border border-amber-300 px-4 py-3 flex items-center gap-2.5">
          <Question size={16} className="text-amber-600 shrink-0" />
          <span className="text-sm font-medium text-amber-700">Na provjeri</span>
          <span className="ml-auto"><ConfidenceBadge score={flag.confidence_unregistered} size="sm" /></span>
        </div>
      )}

      {/* Listing details */}
      <div className="rounded-xl border p-4 space-y-3">
        <Badge variant="outline" className="text-xs capitalize">{listing?.platform}</Badge>
        <div className="space-y-2 text-sm">
          {listing?.neighborhood && (
            <div className="flex items-center gap-2.5 text-muted-foreground">
              <MapPin size={14} className="shrink-0" />
              <span>{listing.neighborhood}, Split</span>
            </div>
          )}
          {listing?.beds && (
            <div className="flex items-center gap-2.5 text-muted-foreground">
              <Bed size={14} className="shrink-0" />
              <span>{listing.beds} kreveta · {listing.guests} gostiju</span>
            </div>
          )}
          {listing?.price_per_night && (
            <div className="flex items-center gap-2.5 text-muted-foreground">
              <CurrencyEur size={14} className="shrink-0" />
              <span>{listing.price_per_night} € / noć</span>
            </div>
          )}
        </div>
        {listing?.url && (
          <a href={listing.url} target="_blank" rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-xs text-primary hover:underline pt-1">
            Otvori oglas <ArrowSquareOut size={12} />
          </a>
        )}
      </div>

      {/* Agent trace */}
      {trace && (
        <div className="rounded-xl border p-4 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold">Trag istrage</p>
            <span className="text-xs text-muted-foreground">{trace.step_count} koraka</span>
          </div>
          <div className="relative pl-4 border-l space-y-4">
            {trace.evidence_chain.map((item, i) => {
              const { action, finding } = splitFact(item.fact);
              return (
                <div key={i} className="flex items-start gap-2.5">
                  <span className="mt-0.5 text-muted-foreground shrink-0">
                    {TOOL_ICONS[item.tool_called] ?? <MagnifyingGlass size={14} />}
                  </span>
                  <div className="min-w-0 space-y-0.5">
                    <p className="text-sm font-medium leading-snug">{action}</p>
                    {finding && (
                      <p className="text-xs text-muted-foreground leading-snug">{finding}</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Actions */}
      {!resolution && (
        <div className="space-y-2">
          {isAuto ? (
            <>
              <Button className="w-full gap-2" onClick={() => onResolve(flag.id, "reported")}>
                <FilePdf size={15} />
                Generiraj prijavu
              </Button>
              <Button variant="outline" className="w-full gap-2 text-muted-foreground"
                onClick={() => onResolve(flag.id, "dismissed")}>
                <X size={15} />
                Odbaci
              </Button>
            </>
          ) : (
            <>
              <Button className="w-full gap-2" onClick={() => onResolve(flag.id, "reported")}>
                <Gavel size={15} />
                Ručno označi i generiraj prijavu
              </Button>
              <Button variant="outline" className="w-full gap-2 text-muted-foreground"
                onClick={() => onResolve(flag.id, "dismissed")}>
                <X size={15} />
                Odbaci
              </Button>
            </>
          )}
        </div>
      )}

    </div>
  );
}

/* ─── Monitoring alert card + sheet ─────────────────────────────────────── */

const MONITORING_META: Record<
  MonitoringAlert["status"],
  { label: string; short: string; tone: "destructive" | "warning" }
> = {
  occupied_silent: {
    label: "Aktivan, ne prijavljuje noćenja",
    short: "Aktivan, ne prijavljuje",
    tone: "destructive",
  },
  empty_reporting: {
    label: "Prijavljuje noćenja, ali stan je prazan",
    short: "Prijavljuje, prazan",
    tone: "destructive",
  },
};

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("hr-HR", { day: "numeric", month: "short" });
}

function MonitoringCard({
  alert,
  onOpen,
  onResolve,
}: {
  alert: MonitoringAlert;
  onOpen: () => void;
  onResolve: (id: string, how: Resolution) => void;
}) {
  const meta = MONITORING_META[alert.status];

  return (
    <div className="px-5 py-4 flex gap-4 hover:bg-muted/40 transition-colors border-l-2 border-l-destructive">
      <div className="flex-1 min-w-0 space-y-1.5">
        <div className="flex items-center gap-2 flex-wrap">
          <Badge className="bg-destructive/10 text-destructive border-destructive/20 text-xs">
            {meta.short}
          </Badge>
          <Badge variant="outline" className="text-xs">
            Registrirani
          </Badge>
          {alert.neighborhood && (
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              <MapPin size={11} />
              {alert.neighborhood}
            </span>
          )}
        </div>
        <p
          className="text-sm font-medium truncate cursor-pointer hover:underline"
          onClick={onOpen}
        >
          {alert.name}
        </p>
        <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
          {alert.owner && <span>{alert.owner}</span>}
          <span className="flex items-center gap-1">
            <Lightning size={11} />
            {alert.hep_kwh_per_day.toFixed(1)} kWh/dan
          </span>
          <span className="flex items-center gap-1">
            <Drop size={11} />
            {alert.vodovod_m3_per_month.toFixed(1)} m³/mj
          </span>
          <span>· prijavljeno {alert.reported_nights_ytd}</span>
        </div>
      </div>

      <div className="flex flex-col gap-1.5 shrink-0 justify-center">
        <Button
          size="sm"
          className="gap-1.5 h-7 text-xs"
          onClick={() => onResolve(alert.id, "reported")}
        >
          <FilePdf size={13} />
          Prijavi inspektoru
        </Button>
        <Button
          size="sm"
          variant="ghost"
          className="gap-1.5 h-7 text-xs text-muted-foreground"
          onClick={() => onResolve(alert.id, "dismissed")}
        >
          <X size={13} />
          Odbaci
        </Button>
      </div>
    </div>
  );
}

function MonitoringSheetContent({
  alert,
  resolution,
  onResolve,
}: {
  alert: MonitoringAlert;
  resolution: Resolution | undefined;
  onResolve: (id: string, how: Resolution) => void;
}) {
  const meta = MONITORING_META[alert.status];

  return (
    <div className="space-y-4">
      <a
        href={`/dashboard/registrirani/${alert.id}`}
        className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
      >
        Otvori karton registriranog <ArrowSquareOut size={11} />
      </a>

      {resolution ? (
        <div className="rounded-xl bg-muted px-4 py-3 flex items-center gap-2.5">
          <CheckCircle size={16} className="text-muted-foreground shrink-0" />
          <span className="text-sm text-muted-foreground">
            {resolution === "reported" ? "Prijavljeno inspektoru" : "Odbačeno"}
          </span>
        </div>
      ) : (
        <div className="rounded-xl bg-destructive/10 border border-destructive/20 px-4 py-3 space-y-1">
          <div className="flex items-center gap-2.5">
            <Lightning size={16} className="text-destructive shrink-0" />
            <span className="text-sm font-medium text-destructive">{meta.label}</span>
          </div>
          <p className="text-xs text-muted-foreground pl-7">{alert.reason}</p>
        </div>
      )}

      <div className="rounded-xl border p-4 space-y-2 text-sm">
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">MBO</span>
          <code className="font-mono text-xs">{alert.mbo}</code>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">Vlasnik</span>
          <span>{alert.owner ?? "—"}</span>
        </div>
        {alert.neighborhood && (
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Kvart</span>
            <span>{alert.neighborhood}</span>
          </div>
        )}
        {alert.beds != null && (
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Registrirano kreveta</span>
            <span className="tabular-nums">{alert.beds}</span>
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className="rounded-xl border p-3 space-y-0.5">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Lightning size={12} className="text-warning" />
            HEP
          </div>
          <p className="text-lg font-semibold tabular-nums">
            {alert.hep_kwh_per_day.toFixed(1)}
            <span className="text-xs font-normal text-muted-foreground ml-1">kWh/dan</span>
          </p>
        </div>
        <div className="rounded-xl border p-3 space-y-0.5">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Drop size={12} className="text-primary" />
            Vodovod
          </div>
          <p className="text-lg font-semibold tabular-nums">
            {alert.vodovod_m3_per_month.toFixed(1)}
            <span className="text-xs font-normal text-muted-foreground ml-1">m³/mj</span>
          </p>
        </div>
        <div className="rounded-xl border p-3 space-y-0.5">
          <div className="text-xs text-muted-foreground">eVisitor noćenja YTD</div>
          <p className="text-lg font-semibold tabular-nums">{alert.reported_nights_ytd}</p>
        </div>
        <div className="rounded-xl border p-3 space-y-0.5">
          <div className="text-xs text-muted-foreground">Posljednja prijava</div>
          <p className="text-sm font-semibold">{formatDate(alert.last_check_in_at)}</p>
        </div>
      </div>

      {!resolution && (
        <div className="space-y-2">
          <Button className="w-full gap-2" onClick={() => onResolve(alert.id, "reported")}>
            <FilePdf size={15} />
            Prijavi inspektoru
          </Button>
          <Button
            variant="outline"
            className="w-full gap-2 text-muted-foreground"
            onClick={() => onResolve(alert.id, "dismissed")}
          >
            <X size={15} />
            Odbaci
          </Button>
        </div>
      )}
    </div>
  );
}
