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
  FunnelSimple,
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
  ArrowSquareOut as LinkIcon,
} from "@phosphor-icons/react";
import { formatEur } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { Flag } from "@/lib/types";

const Map3D = dynamic(() => import("@/components/domain/map3d"), { ssr: false });

const AUTO_FLAG_THRESHOLD = 0.9;

interface Props {
  flags: Flag[];
}

type Resolution = "reported" | "dismissed";

type FilterTab = "sve" | "auto" | "provjera";

export function DashboardClient({ flags }: Props) {
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState<FilterTab>("sve");
  const [selectedId, setSelectedId] = useState<string | null>(null);
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

  const open = filtered.filter((f) => !resolved[f.id]);
  const allAutoFlagged = open.filter((f) => f.confidence_unregistered >= AUTO_FLAG_THRESHOLD);
  const allNeedsReview = open.filter((f) => f.confidence_unregistered < AUTO_FLAG_THRESHOLD);
  const resolvedList = filtered.filter((f) => !!resolved[f.id]);

  const autoFlagged = activeTab === "provjera" ? [] : allAutoFlagged;
  const needsReview = activeTab === "auto" ? [] : allNeedsReview;

  const selectedFlag = selectedId ? flags.find((f) => f.id === selectedId) : null;

  function resolve(id: string, how: Resolution) {
    setResolved((prev) => ({ ...prev, [id]: how }));
    if (selectedId === id) setSelectedId(null);
  }

  const mapMarkers = open
    .filter((f) => f.candidate_listings?.approx_lat && f.candidate_listings?.approx_lon)
    .map((f) => ({
      id: f.id,
      lat: f.candidate_listings!.approx_lat!,
      lon: f.candidate_listings!.approx_lon!,
      confidence: f.confidence_unregistered,
      title: f.candidate_listings?.title,
    }));

  return (
    <div className="flex flex-col h-full">
      {/* Top bar */}
      <div className="flex items-center gap-3 px-4 py-2.5 border-b bg-background">
        {/* Filter tabs */}
        <div className="flex items-center gap-1 bg-muted rounded-lg p-1">
          {([
            { key: "sve",      label: "Sve",              count: allAutoFlagged.length + allNeedsReview.length },
            { key: "auto",     label: "Automatski",       count: allAutoFlagged.length },
            { key: "provjera", label: "Na provjeri",      count: allNeedsReview.length },
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
                  : "bg-muted text-muted-foreground"
                  : "bg-muted-foreground/15 text-muted-foreground"
              )}>
                {count}
              </span>
            </button>
          ))}
        </div>

        <div className="w-px h-5 bg-border mx-1" />

        <FunnelSimple size={14} className="text-muted-foreground shrink-0" />
        <Input
          placeholder="Pretraži po naslovu, kvartu, domaćinu..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-xs h-8 text-sm"
        />

        <div className="ml-auto flex items-center gap-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <CheckCircle size={12} />
            {resolvedList.length} riješeno
          </span>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Left: action list */}
        <div className="w-[58%] overflow-y-auto flex flex-col">

          {/* Empty state */}
          {open.length === 0 && (
            <div className="flex flex-col items-center justify-center flex-1 gap-3 text-center py-16 px-6">
              <CheckCircle size={40} className="text-muted-foreground/40" />
              <p className="font-medium text-muted-foreground">Sve je riješeno</p>
              <p className="text-sm text-muted-foreground">Nema neriješenih oznaka.</p>
            </div>
          )}

          {/* AUTO-FLAGGED */}
          {autoFlagged.length > 0 && (
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
          {needsReview.length > 0 && (
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

          {/* RESOLVED */}
          {resolvedList.length > 0 && (
            <section className="mt-4 opacity-50">
              <div className="px-5 pt-3 pb-2 flex items-center gap-2 border-t border-b">
                <CheckCircle size={14} className="text-muted-foreground" />
                <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Riješeno
                </span>
                <span className="ml-auto text-xs text-muted-foreground">{resolvedList.length}</span>
              </div>
              <div className="divide-y">
                {resolvedList.map((flag) => (
                  <div key={flag.id} className="px-5 py-3 flex items-center gap-3">
                    {resolved[flag.id] === "reported" ? (
                      <FilePdf size={14} className="text-muted-foreground shrink-0" />
                    ) : (
                      <X size={14} className="text-muted-foreground shrink-0" />
                    )}
                    <span className="text-sm text-muted-foreground line-through flex-1 truncate">
                      {flag.candidate_listings?.title}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {resolved[flag.id] === "reported" ? "Prijavljeno" : "Odbačeno"}
                    </span>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>

        {/* Right: 3D map */}
        <div className="flex-1 border-l">
          <Map3D
            markers={mapMarkers}
            onMarkerClick={setSelectedId}
            className="h-full w-full"
          />
        </div>
      </div>

      {/* Evidence sheet */}
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
    </div>
  );
}

/* ─── Flag card ─────────────────────────────────────────────────────────── */

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
};

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
          <div className="relative pl-4 border-l space-y-3.5">
            {trace.evidence_chain.map((item, i) => (
              <div key={i} className="flex items-start gap-2.5">
                <span className="mt-0.5 text-muted-foreground shrink-0">
                  {TOOL_ICONS[item.tool_called] ?? <MagnifyingGlass size={14} />}
                </span>
                <div className="min-w-0 space-y-0.5">
                  <code className="text-[11px] text-muted-foreground block">{item.tool_called}</code>
                  <p className="text-sm leading-snug">{item.fact}</p>
                </div>
              </div>
            ))}
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

      <a href={`/dashboard/${flag.id}`} className="block text-xs text-muted-foreground hover:underline pt-1">
        Otvori punu stranicu →
      </a>
    </div>
  );
}
