"use client";

import { useState, useMemo } from "react";
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
import { Input } from "@/components/ui/input";
import { FlagListItem } from "@/components/domain/flag-list-item";
import { EmptyState } from "@/components/domain/empty-state";
import { ListChecks, FunnelSimple } from "@phosphor-icons/react";
import type { Flag } from "@/lib/types";

const LeafletMap = dynamic(() => import("@/components/domain/leaflet-map"), { ssr: false });

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
          <LeafletMap
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
          {selectedId && <EvidenceSheetContent flagId={selectedId} />}
        </SheetContent>
      </Sheet>
    </div>
  );
}

function EvidenceSheetContent({ flagId }: { flagId: string }) {
  return (
    <div className="mt-4">
      <a
        href={`/dashboard/${flagId}`}
        className="text-sm text-primary hover:underline"
      >
        Otvori cijelu stranicu →
      </a>
    </div>
  );
}
