"use client";

import { useMemo, useState } from "react";
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
  MagnifyingGlass,
  Question,
  XCircle,
} from "@phosphor-icons/react";
import { cn } from "@/lib/utils";
import { formatConfidence } from "@/lib/format";

export type OglasiStatus = "matched" | "flagged" | "inconclusive" | "no_match";

export interface OglasiRow {
  id: string;
  platform: string;
  title: string;
  host_name: string;
  neighborhood: string;
  price_per_night: number;
  beds: number;
  guests: number;
  scraped_at: string;
  url: string;
  status: OglasiStatus;
  confidence: number | null;
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
  const [busyId, setBusyId] = useState<string | null>(null);
  const [runError, setRunError] = useState<string | null>(null);

  const platforms = useMemo(() => {
    const set = new Set(candidates.map((c) => c.platform));
    return ["all", ...Array.from(set)];
  }, [candidates]);

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

  async function runInvestigate(candidateId: string) {
    setBusyId(candidateId);
    setRunError(null);
    try {
      const res = await fetch("/api/investigate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ candidate_id: candidateId }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || `HTTP ${res.status}`);
      }
      router.refresh();
    } catch (err) {
      setRunError((err as Error).message);
    } finally {
      setBusyId(null);
    }
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
        <div className="flex items-center gap-1">
          {platforms.map((p) => (
            <Button
              key={p}
              size="sm"
              variant={platform === p ? "default" : "outline"}
              onClick={() => setPlatform(p)}
            >
              {p}
            </Button>
          ))}
        </div>
        <div className="flex items-center gap-1">
          {(["all", "matched", "flagged", "inconclusive", "no_match"] as const).map((s) => (
            <Button
              key={s}
              size="sm"
              variant={statusFilter === s ? "default" : "outline"}
              onClick={() => setStatusFilter(s)}
            >
              {s === "all" ? "all" : STATUS_LABEL[s as OglasiStatus]}
              {s !== "all" ? ` (${counts[s]})` : ""}
            </Button>
          ))}
        </div>
      </div>

      {runError ? (
        <div className="text-sm text-destructive border rounded p-2">{runError}</div>
      ) : null}

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[100px]">Platforma</TableHead>
              <TableHead className="w-[300px]">Naziv</TableHead>
              <TableHead>Domaćin</TableHead>
              <TableHead>Kvart</TableHead>
              <TableHead className="text-right">Cijena/noć</TableHead>
              <TableHead className="text-center">Kreveti</TableHead>
              <TableHead className="text-center">Gosti</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Akcija</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center text-sm text-muted-foreground py-8">
                  Nema oglasa za odabrane filtere.
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((c) => (
                <TableRow key={c.id}>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={cn(
                        "text-xs",
                        c.platform === "airbnb"
                          ? "border-blue-300 text-blue-700 bg-blue-50"
                          : c.platform === "booking"
                          ? "border-orange-300 text-orange-700 bg-orange-50"
                          : "",
                      )}
                    >
                      {c.platform === "airbnb" ? "Airbnb" : c.platform === "booking" ? "Booking" : c.platform}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-medium text-sm">{c.title}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{c.host_name}</TableCell>
                  <TableCell className="text-sm">{c.neighborhood}</TableCell>
                  <TableCell className="text-right text-sm font-medium">
                    {c.price_per_night ? `${c.price_per_night} €` : "—"}
                  </TableCell>
                  <TableCell className="text-center text-sm">{c.beds || "—"}</TableCell>
                  <TableCell className="text-center text-sm">{c.guests || "—"}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className={cn("text-xs gap-1", STATUS_CLASSES[c.status])}>
                      <StatusIcon status={c.status} />
                      {STATUS_LABEL[c.status]}
                      {c.confidence != null ? ` · ${formatConfidence(c.confidence)}` : ""}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
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
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => runInvestigate(c.id)}
                        disabled={busyId === c.id || usingMock}
                        title={usingMock ? "Nedostupno u mock prikazu" : undefined}
                      >
                        <MagnifyingGlass size={14} className="mr-1" />
                        {busyId === c.id ? "Istraga…" : "Istraži"}
                      </Button>
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
