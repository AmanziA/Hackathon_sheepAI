"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  ArrowSquareOut,
  ArrowsClockwise,
  CheckCircle,
  Flag,
  Question,
  XCircle,
} from "@phosphor-icons/react";
import { cn } from "@/lib/utils";
import { formatConfidence } from "@/lib/format";
import { InvestigationTrigger } from "@/components/domain/investigation-trigger";

export type OglasiStatus = "matched" | "flagged" | "inconclusive" | "no_match";

export interface OglasiRow {
  id: string;
  platform: string;
  title: string;
  host_name: string;
  neighborhood: string;
  address: string | null;
  price_per_night: number;
  beds: number;
  guests: number;
  scraped_at: string;
  url: string;
  status: OglasiStatus;
  confidence: number | null;
  matched_registered_id: string | null;
  matched_registered_name: string | null;
}

interface Props {
  candidates: OglasiRow[];
  usingMock?: boolean;
  error?: string | null;
}

const STATUS_LABEL: Record<OglasiStatus, string> = {
  matched: "Registrirano",
  flagged: "Označeno",
  inconclusive: "Neodlučno",
  no_match: "Bez podudaranja",
};

const STATUS_CLASSES: Record<OglasiStatus, string> = {
  matched: "border-emerald-300 text-emerald-700 bg-emerald-50",
  flagged: "border-red-300 text-red-700 bg-red-50",
  inconclusive: "border-amber-300 text-amber-700 bg-amber-50",
  no_match: "border-slate-300 text-slate-700 bg-slate-50",
};

function StatusIcon({ status }: { status: OglasiStatus }) {
  const size = 12;
  if (status === "matched") return <CheckCircle size={size} weight="fill" />;
  if (status === "flagged") return <Flag size={size} weight="fill" />;
  if (status === "inconclusive") return <Question size={size} weight="fill" />;
  return <XCircle size={size} />;
}

export function OglasiClient({ candidates, usingMock, error }: Props) {
  const router = useRouter();
  const [batchLoading, setBatchLoading] = useState(false);
  const [platform, setPlatform] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<"all" | OglasiStatus>("all");
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    const s = search.trim().toLowerCase();
    return candidates.filter((c) => {
      if (platform !== "all" && c.platform !== platform) return false;
      if (statusFilter !== "all" && c.status !== statusFilter) return false;
      if (!s) return true;
      return (
        c.title.toLowerCase().includes(s) ||
        c.host_name.toLowerCase().includes(s) ||
        c.neighborhood.toLowerCase().includes(s)
      );
    });
  }, [candidates, platform, statusFilter, search]);
  void setPlatform; void setStatusFilter; // filters parked behind the top-bar badges

  const counts = useMemo(() => {
    const c = { total: candidates.length, matched: 0, flagged: 0, inconclusive: 0, no_match: 0 } as Record<string, number>;
    for (const r of candidates) c[r.status] += 1;
    return c;
  }, [candidates]);

  const airbnbCount = candidates.filter((c) => c.platform === "airbnb").length;
  const bookingCount = candidates.filter((c) => c.platform === "booking").length;

  function handleBatch() {
    setBatchLoading(true);
    setTimeout(() => router.push("/dashboard"), 2500);
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold tracking-tight">Online oglasi</h1>
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant="secondary" className="text-sm px-3 py-1">
              {counts.total} oglasa
            </Badge>
            <Badge variant="outline" className="border-blue-300 text-blue-700 bg-blue-50 text-xs">
              Airbnb {airbnbCount}
            </Badge>
            <Badge variant="outline" className="border-orange-300 text-orange-700 bg-orange-50 text-xs">
              Booking {bookingCount}
            </Badge>
            {usingMock ? (
              <Badge variant="outline" className="text-xs">
                mock fallback
              </Badge>
            ) : null}
          </div>
          {error ? (
            <p className="text-xs text-destructive">Supabase: {error}</p>
          ) : null}
        </div>

        <Button onClick={handleBatch} disabled={batchLoading} className="shrink-0">
          {batchLoading ? (
            <>
              <ArrowsClockwise size={16} className="mr-2 animate-spin" />
              Analiziranje...
            </>
          ) : (
            "Pokreni uspoređivanje"
          )}
        </Button>
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <Input
          placeholder="Pretraži po nazivu, hostu, kvartu…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-sm"
        />
        <span className="text-xs text-muted-foreground tabular-nums">
          {filtered.length} / {counts.total}
        </span>
      </div>

      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Oglas</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right w-[100px]">Akcija</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={3} className="text-center text-sm text-muted-foreground py-8">
                  Nema oglasa za odabrane filtere.
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((c) => (
                <TableRow
                  key={c.id}
                  onClick={() => {
                    if (c.matched_registered_id) {
                      router.push(`/dashboard/registrirani/${c.matched_registered_id}`);
                    } else {
                      window.open(c.url, "_blank", "noopener,noreferrer");
                    }
                  }}
                  className="cursor-pointer"
                >
                  <TableCell className="py-2 min-w-0">
                    <div className="flex items-center gap-2 min-w-0">
                      <Badge
                        variant="outline"
                        className={cn(
                          "text-[10px] shrink-0",
                          c.platform === "airbnb"
                            ? "border-blue-300 text-blue-700 bg-blue-50"
                            : c.platform === "booking"
                            ? "border-orange-300 text-orange-700 bg-orange-50"
                            : "",
                        )}
                      >
                        {c.platform === "airbnb" ? "Airbnb" : c.platform === "booking" ? "Booking" : c.platform}
                      </Badge>
                      <span className="font-medium text-sm truncate">{c.title}</span>
                    </div>
                    <div className="text-xs text-muted-foreground flex items-center gap-1.5 mt-0.5 flex-wrap">
                      <span>{c.host_name}</span>
                      {c.neighborhood && c.neighborhood !== "—" ? (
                        <>
                          <span aria-hidden>·</span>
                          <span>{c.neighborhood}</span>
                        </>
                      ) : null}
                      {c.address ? (
                        <>
                          <span aria-hidden>·</span>
                          <span className="truncate">{c.address}</span>
                        </>
                      ) : null}
                    </div>
                  </TableCell>
                  <TableCell className="py-2">
                    <Badge
                      variant="outline"
                      className={cn("text-xs gap-1 inline-flex items-center", STATUS_CLASSES[c.status])}
                    >
                      <StatusIcon status={c.status} />
                      <span className="whitespace-nowrap">
                        {STATUS_LABEL[c.status]}
                        {c.confidence != null ? ` · ${formatConfidence(c.confidence)}` : ""}
                      </span>
                    </Badge>
                    {c.status === "matched" && c.matched_registered_id && c.matched_registered_name ? (
                      <div className="text-xs text-muted-foreground mt-0.5 truncate">
                        →{" "}
                        <Link
                          href={`/dashboard/registrirani/${c.matched_registered_id}`}
                          className="underline underline-offset-2 hover:no-underline hover:text-foreground"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {c.matched_registered_name}
                        </Link>
                      </div>
                    ) : null}
                  </TableCell>
                  <TableCell className="py-2 text-right">
                    <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                      <a
                        href={c.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label={`Otvori oglas ${c.title}`}
                      >
                        <Button size="sm" variant="ghost">
                          <ArrowSquareOut size={14} />
                        </Button>
                      </a>
                      <InvestigationTrigger
                        candidateId={c.id}
                        candidateTitle={c.title}
                      />
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
