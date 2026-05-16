"use client";

import React, { useState, useMemo } from "react";
import dynamic from "next/dynamic";
import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FlagListItem } from "@/components/domain/flag-list-item";
import { ConfidenceBadge } from "@/components/domain/confidence-badge";
import {
  WarningCircle,
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
} from "@phosphor-icons/react";
import type { Flag } from "@/lib/types";

const Map3D = dynamic(() => import("@/components/domain/map3d"), { ssr: false });

const AUTO_FLAG_THRESHOLD = 0.9;

interface Props {
  flags: Flag[];
}

export function DashboardClient({ flags }: Props) {
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);

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

  const autoFlagged = filtered.filter((f) => f.confidence_unregistered >= AUTO_FLAG_THRESHOLD);
  const needsReview = filtered.filter((f) => f.confidence_unregistered < AUTO_FLAG_THRESHOLD);

  const selectedFlag = selectedId ? flags.find((f) => f.id === selectedId) : null;

  const mapMarkers = filtered
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
      {/* Header */}
      <div className="flex items-center gap-3 px-6 py-3 border-b">
        <FunnelSimple size={16} className="text-muted-foreground" />
        <Input
          placeholder="Pretraži po naslovu, kvartu ili domaćinu..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-xs h-8 text-sm"
        />
        <div className="ml-auto flex items-center gap-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-destructive inline-block" />
            {autoFlagged.length} automatski označenih
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-amber-500 inline-block" />
            {needsReview.length} na provjeri
          </span>
        </div>
      </div>

      {/* Split: list + map */}
      <div className="flex flex-1 overflow-hidden">
        <div className="w-[60%] overflow-y-auto">

          {/* AUTO-FLAGGED section */}
          <div className="px-4 pt-4 pb-2 flex items-center gap-2">
            <WarningCircle size={15} className="text-destructive" />
            <span className="text-xs font-semibold uppercase tracking-wide text-destructive">
              Automatski označeni — ≥90% pouzdanosti
            </span>
            <Badge className="ml-auto text-xs bg-destructive/10 text-destructive border-destructive/20">
              {autoFlagged.length}
            </Badge>
          </div>

          {autoFlagged.length === 0 ? (
            <p className="px-6 py-3 text-sm text-muted-foreground">Nema automatski označenih.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Pouzdanost</TableHead>
                  <TableHead>Oglas</TableHead>
                  <TableHead>Kvart</TableHead>
                  <TableHead>Cijena</TableHead>
                  <TableHead>Viđen</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {autoFlagged.map((flag) => (
                  <FlagListItem key={flag.id} flag={flag} onSelect={setSelectedId} />
                ))}
              </TableBody>
            </Table>
          )}

          {/* NEEDS REVIEW section */}
          <div className="px-4 pt-6 pb-2 flex items-center gap-2 border-t mt-2">
            <Question size={15} className="text-amber-600" />
            <span className="text-xs font-semibold uppercase tracking-wide text-amber-600">
              Na provjeri — ispod 90% pouzdanosti
            </span>
            <Badge className="ml-auto text-xs bg-amber-500/10 text-amber-700 border-amber-300">
              {needsReview.length}
            </Badge>
          </div>
          <p className="px-6 pb-2 text-xs text-muted-foreground">
            Agent nije mogao donijeti siguran zaključak. Inspektor treba ručno pregledati i odlučiti.
          </p>

          {needsReview.length === 0 ? (
            <p className="px-6 py-3 text-sm text-muted-foreground">Nema stavki na provjeri.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Pouzdanost</TableHead>
                  <TableHead>Oglas</TableHead>
                  <TableHead>Kvart</TableHead>
                  <TableHead>Cijena</TableHead>
                  <TableHead>Viđen</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {needsReview.map((flag) => (
                  <FlagListItem key={flag.id} flag={flag} onSelect={setSelectedId} />
                ))}
              </TableBody>
            </Table>
          )}

        </div>

        <div className="w-[40%] border-l">
          <Map3D
            markers={mapMarkers}
            onMarkerClick={setSelectedId}
            className="h-full w-full"
          />
        </div>
      </div>

      {/* Evidence sheet */}
      <Sheet open={!!selectedId} onOpenChange={(o: boolean) => !o && setSelectedId(null)}>
        <SheetContent className="w-[540px] sm:max-w-[540px] overflow-y-auto">
          <SheetHeader>
            <SheetTitle>{selectedFlag?.candidate_listings?.title ?? "Dokazi"}</SheetTitle>
          </SheetHeader>
          {selectedFlag && <EvidenceSheetContent flag={selectedFlag} />}
        </SheetContent>
      </Sheet>
    </div>
  );
}

const TOOL_ICONS: Record<string, React.ReactNode> = {
  search_htz_registry: <MagnifyingGlass size={14} />,
  get_htz_listing: <FileText size={14} />,
  search_sudski_registar: <Briefcase size={14} />,
  phash_compare: <Image size={14} />,
  geocode: <MapPin size={14} />,
  normalize_croatian: <FileText size={14} />,
};

function EvidenceSheetContent({ flag }: { flag: Flag }) {
  const listing = flag.candidate_listings;
  const trace = flag.agent_traces;
  const isAutoFlagged = flag.confidence_unregistered >= AUTO_FLAG_THRESHOLD;

  return (
    <div className="mt-4 space-y-6">
      {/* Status banner */}
      {isAutoFlagged ? (
        <div className="rounded-lg bg-destructive/10 border border-destructive/20 px-4 py-2.5 flex items-center gap-2">
          <WarningCircle size={16} className="text-destructive shrink-0" />
          <span className="text-sm font-medium text-destructive">Automatski označeno</span>
          <span className="ml-auto"><ConfidenceBadge score={flag.confidence_unregistered} size="sm" /></span>
        </div>
      ) : (
        <div className="rounded-lg bg-amber-500/10 border border-amber-300 px-4 py-2.5 flex items-center gap-2">
          <Question size={16} className="text-amber-600 shrink-0" />
          <span className="text-sm font-medium text-amber-700">Na provjeri — potrebna ručna odluka</span>
          <span className="ml-auto"><ConfidenceBadge score={flag.confidence_unregistered} size="sm" /></span>
        </div>
      )}

      {/* Listing info */}
      <div className="rounded-lg border p-4 space-y-3">
        <Badge variant="outline" className="text-xs capitalize">{listing?.platform}</Badge>
        <div className="space-y-1.5 text-sm">
          {listing?.neighborhood && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <MapPin size={14} />
              <span>{listing.neighborhood}, Split</span>
            </div>
          )}
          {listing?.beds && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Bed size={14} />
              <span>{listing.beds} kreveta · {listing.guests} gostiju</span>
            </div>
          )}
          {listing?.price_per_night && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <CurrencyEur size={14} />
              <span>{listing.price_per_night} € / noć</span>
            </div>
          )}
        </div>
        {listing?.url && (
          <a
            href={listing.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-xs text-primary hover:underline"
          >
            Otvori oglas <ArrowSquareOut size={12} />
          </a>
        )}
      </div>

      {/* Agent trace */}
      {trace && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold">Trag istrage</p>
            <span className="text-xs text-muted-foreground">{trace.step_count} koraka · {trace.model.split("-").slice(0, 3).join("-")}</span>
          </div>
          <div className="relative pl-4 border-l space-y-3">
            {trace.evidence_chain.map((item, i) => (
              <div key={i} className="flex items-start gap-2">
                <span className="mt-0.5 text-muted-foreground shrink-0">
                  {TOOL_ICONS[item.tool_called] ?? <MagnifyingGlass size={14} />}
                </span>
                <div className="flex-1 min-w-0">
                  <code className="text-xs text-muted-foreground">{item.tool_called}</code>
                  <p className="text-sm">{item.fact}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Verdict */}
          {isAutoFlagged ? (
            <div className="rounded-lg bg-destructive/10 border border-destructive/20 p-3 flex items-start gap-2">
              <Gavel size={16} className="text-destructive mt-0.5 shrink-0" />
              <div className="space-y-0.5">
                <p className="text-sm font-medium text-destructive">Označeno kao neregistrirano</p>
                <p className="text-xs text-muted-foreground">
                  Pouzdanost: {Math.round(flag.confidence_unregistered * 100)}% · Agent: {trace.total_cost_usd ? `$${trace.total_cost_usd.toFixed(4)}` : "—"}
                </p>
              </div>
            </div>
          ) : (
            <div className="rounded-lg bg-amber-500/10 border border-amber-300 p-3 space-y-2">
              <div className="flex items-start gap-2">
                <Eye size={16} className="text-amber-600 mt-0.5 shrink-0" />
                <div className="space-y-0.5">
                  <p className="text-sm font-medium text-amber-700">Agent nije siguran — potrebna provjera</p>
                  <p className="text-xs text-muted-foreground">
                    Pouzdanost: {Math.round(flag.confidence_unregistered * 100)}% — ispod praga od 90%
                  </p>
                </div>
              </div>
              <Button size="sm" variant="outline" className="w-full border-amber-300 text-amber-700 hover:bg-amber-50">
                Ručno označi kao neregistrirano
              </Button>
            </div>
          )}
        </div>
      )}

      <a href={`/dashboard/${flag.id}`} className="block text-sm text-primary hover:underline">
        Otvori cijelu stranicu →
      </a>
    </div>
  );
}
