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
import { Input } from "@/components/ui/input";
import { FlagListItem } from "@/components/domain/flag-list-item";
import { EmptyState } from "@/components/domain/empty-state";
import { ConfidenceBadge } from "@/components/domain/confidence-badge";
import { ListChecks, FunnelSimple, MapPin, Bed, CurrencyEur, ArrowSquareOut, MagnifyingGlass, Image, Briefcase, FileText, Gavel } from "@phosphor-icons/react";
import type { Flag } from "@/lib/types";

const Map3D = dynamic(() => import("@/components/domain/map3d"), { ssr: false });

// Shown when DB has no data yet — realistic Split coordinates
const DEMO_MARKERS = [
  { id: "d1", lat: 43.5083, lon: 16.4378, confidence: 0.92, title: "Apartman Petar — Veli Varoš" },
  { id: "d2", lat: 43.5071, lon: 16.4412, confidence: 0.87, title: "Studio Marko — Veli Varoš" },
  { id: "d3", lat: 43.5098, lon: 16.4450, confidence: 0.81, title: "Rooms Ana — Grad" },
  { id: "d4", lat: 43.5065, lon: 16.4395, confidence: 0.78, title: "Apartman Sunce — Mali Varoš" },
  { id: "d5", lat: 43.5055, lon: 16.4501, confidence: 0.74, title: "Sea View Luka — Bačvice" },
  { id: "d6", lat: 43.5112, lon: 16.4360, confidence: 0.68, title: "Old Town Flat — Veli Varoš" },
  { id: "d7", lat: 43.5040, lon: 16.4530, confidence: 0.65, title: "Bačvice Beach Apt — Bačvice" },
  { id: "d8", lat: 43.5130, lon: 16.4420, confidence: 0.61, title: "Spinut Studio — Spinut" },
  { id: "d9", lat: 43.5020, lon: 16.4480, confidence: 0.55, title: "Apartment Jadranka" },
  { id: "d10", lat: 43.5145, lon: 16.4390, confidence: 0.48, title: "Spinut House" },
  { id: "d11", lat: 43.5088, lon: 16.4320, confidence: 0.44, title: "Cozy Studio Centar" },
  { id: "d12", lat: 43.5035, lon: 16.4560, confidence: 0.38, title: "Firule Apt — Firule" },
  { id: "d13", lat: 43.5160, lon: 16.4450, confidence: 0.31, title: "Lovret Room" },
  { id: "d14", lat: 43.5078, lon: 16.4290, confidence: 0.25, title: "Meje Apartment — Meje" },
  { id: "d15", lat: 43.4990, lon: 16.4600, confidence: 0.88, title: "Žnjan Paradise — Žnjan" },
  { id: "d16", lat: 43.5005, lon: 16.4620, confidence: 0.83, title: "Žnjan Beach House" },
  { id: "d17", lat: 43.5050, lon: 16.4340, confidence: 0.76, title: "Stari Grad Rooms" },
  { id: "d18", lat: 43.5120, lon: 16.4480, confidence: 0.72, title: "Sućidar Flat — Sućidar" },
  { id: "d19", lat: 43.5095, lon: 16.4510, confidence: 0.59, title: "Trstenik Studio" },
  { id: "d20", lat: 43.5170, lon: 16.4560, confidence: 0.41, title: "Kman Apartment" },
];

interface Props {
  flags: Flag[];
}

export function DashboardClient({ flags }: Props) {
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [minConfidence, setMinConfidence] = useState(0);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return flags.filter(
      (f) =>
        f.confidence_unregistered >= minConfidence &&
        (!q ||
          f.candidate_listings?.title?.toLowerCase().includes(q) ||
          f.candidate_listings?.neighborhood?.toLowerCase().includes(q))
    );
  }, [flags, search, minConfidence]);

  const selectedFlag = selectedId ? flags.find((f) => f.id === selectedId) : null;

  const realMarkers = filtered
    .filter((f) => f.candidate_listings?.approx_lat && f.candidate_listings?.approx_lon)
    .map((f) => ({
      id: f.id,
      lat: f.candidate_listings!.approx_lat!,
      lon: f.candidate_listings!.approx_lon!,
      confidence: f.confidence_unregistered,
      title: f.candidate_listings?.title,
    }));

  const mapMarkers = realMarkers.length > 0 ? realMarkers : DEMO_MARKERS;

  return (
    <div className="flex flex-col h-full">
      {/* Filter bar */}
      <div className="flex items-center gap-3 px-6 py-3 border-b">
        <FunnelSimple size={16} className="text-muted-foreground" />
        <Input
          placeholder="Pretraži po naslovu ili kvartu..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-xs h-8 text-sm"
        />
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span>Min. pouzdanost:</span>
          <input
            type="range"
            min={0}
            max={100}
            value={minConfidence * 100}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setMinConfidence(Number(e.target.value) / 100)}
            className="w-24"
            aria-label="Minimalna pouzdanost"
          />
          <span className="w-8 tabular-nums">{Math.round(minConfidence * 100)}%</span>
        </div>
        <span className="ml-auto text-xs text-muted-foreground">
          {filtered.length} oznaka
        </span>
      </div>

      {/* Split: list + map */}
      <div className="flex flex-1 overflow-hidden">
        <div className="w-[60%] overflow-y-auto">
          {filtered.length === 0 ? (
            <EmptyState
              icon={<ListChecks />}
              headline="Nema pronađenih oznaka"
              body="Pokušajte promijeniti filter ili prag pouzdanosti."
            />
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
                {filtered.map((flag) => (
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
  const [expandedStep, setExpandedStep] = useState<number | null>(null);
  const listing = flag.candidate_listings;
  const trace = flag.agent_traces;

  return (
    <div className="mt-4 space-y-6">
      {/* Listing info */}
      <div className="rounded-lg border p-4 space-y-3">
        <div className="flex items-center justify-between">
          <Badge variant="outline" className="text-xs capitalize">{listing?.platform}</Badge>
          <ConfidenceBadge score={flag.confidence_unregistered} />
        </div>
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

          {/* Steps */}
          <div className="relative pl-4 border-l space-y-3">
            {trace.evidence_chain.map((item, i) => (
              <div key={i} className="space-y-1">
                <button
                  onClick={() => setExpandedStep(expandedStep === i ? null : i)}
                  className="w-full text-left"
                >
                  <div className="flex items-start gap-2">
                    <span className="mt-0.5 text-muted-foreground">
                      {TOOL_ICONS[item.tool_called] ?? <MagnifyingGlass size={14} />}
                    </span>
                    <div className="flex-1 min-w-0">
                      <code className="text-xs text-muted-foreground">{item.tool_called}</code>
                      <p className="text-sm">{item.fact}</p>
                    </div>
                  </div>
                </button>
              </div>
            ))}
          </div>

          {/* Verdict */}
          <div className="rounded-lg bg-destructive/10 border border-destructive/20 p-3 flex items-start gap-2">
            <Gavel size={16} className="text-destructive mt-0.5 shrink-0" />
            <div className="space-y-0.5">
              <p className="text-sm font-medium text-destructive">Označeno kao neregistrirano</p>
              <p className="text-xs text-muted-foreground">
                Pouzdanost: {Math.round(flag.confidence_unregistered * 100)}% · Trošak: ${trace.total_cost_usd?.toFixed(4)}
              </p>
            </div>
          </div>
        </div>
      )}

      <a
        href={`/dashboard/${flag.id}`}
        className="block text-sm text-primary hover:underline"
      >
        Otvori cijelu stranicu →
      </a>
    </div>
  );
}
