"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/utils/supabase/client";
import { TraceSummary } from "./trace-summary";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { ArrowSquareOut, MagnifyingGlass, CircleNotch, CheckCircle } from "@phosphor-icons/react";
import type { AgentTrace, TraceStep } from "@/lib/types";
import { formatConfidence } from "@/lib/format";

export type DrawerMode = "discovery" | "investigation";

interface Props {
  open: boolean;
  onClose: () => void;
  mode: DrawerMode;
  /** registered_id for discovery, candidate_id for investigation */
  id: string | null;
  /** Header subject (unit name or candidate title) */
  title?: string | null;
}

const POLL_MS = 1500;

type DiscoveryMatch = {
  kind: "candidate";
  id: string;
  platform: string | null;
  title: string | null;
  url: string | null;
  host_name: string | null;
  confidence: number;
};

type InvestigationMatch = {
  kind: "registered";
  id: string;
  name: string | null;
  address: string | null;
  street: string | null;
  number: string | null;
  neighborhood: string | null;
  confidence: number;
  verdict: string;
};

type Match = DiscoveryMatch | InvestigationMatch;

const COPY = {
  discovery: {
    header: "AI istraga oglasa",
    emptyState:
      "Još nije pretraženo. Pokreni istragu da pronađemo online oglase za ovaj objekt.",
    matchesLabel: "Pronađeni oglasi",
    foundBanner: (n: number) =>
      `Agent je pronašao ${n} ${n === 1 ? "podudaran oglas" : "podudarna oglasa"} online`,
    emptyVerdictLabel: "no_listings_found",
    emptyVerdictBanner: "Agent nije pronašao nijedan oglas.",
    emptyVerdictHint: "Ovaj registrirani objekt vjerojatno nije aktivno oglašen online.",
  },
  investigation: {
    header: "AI provjera HTZ registra",
    emptyState:
      "Još nije provjereno. Pokreni AI provjeru da utvrdimo je li oglas u HTZ registru.",
    matchesLabel: "HTZ podudaranje",
    foundBanner: (n: number) =>
      n === 0
        ? "Agent NIJE pronašao podudaranje u HTZ registru."
        : `Agent je pronašao podudaranje u HTZ registru.`,
    emptyVerdictLabel: "unmatched",
    emptyVerdictBanner: "Oglas nije u HTZ registru — vjerojatno neregistriran.",
    emptyVerdictHint:
      "Agent je iscrpio pretragu po susjedstvu, hostu i sudskom registru bez podudaranja.",
  },
} as const;

function verdictBadge(verdict: string) {
  if (verdict === "running") {
    return (
      <Badge variant="outline" className="text-xs gap-1">
        <CircleNotch size={10} className="animate-spin" /> u tijeku
      </Badge>
    );
  }
  if (verdict === "clear" || verdict === "matched") {
    return <Badge variant="default" className="text-xs">podudaranje</Badge>;
  }
  if (verdict === "no_listings_found" || verdict === "unmatched") {
    return <Badge variant="secondary" className="text-xs">bez podudaranja</Badge>;
  }
  if (verdict === "error") return <Badge variant="destructive" className="text-xs">greška</Badge>;
  return <Badge variant="outline" className="text-xs">{verdict}</Badge>;
}

export function DiscoveryDrawer({ open, onClose, mode, id, title }: Props) {
  const router = useRouter();
  const [trace, setTrace] = useState<AgentTrace | null>(null);
  const [steps, setSteps] = useState<TraceStep[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(false);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const pollTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const activeTraceId = useRef<string | null>(null);

  const copy = COPY[mode];
  const apiPath = mode === "discovery" ? "/api/discover" : "/api/investigate";
  const apiBodyKey = mode === "discovery" ? "registered_id" : "candidate_id";
  const traceFilterColumn = mode === "discovery" ? "registered_id" : "candidate_id";

  const fetchTrace = useCallback(
    async (traceId: string) => {
      const supabase = createClient();
      const linkSelect =
        mode === "discovery"
          ? "confidence, verdict, candidate_id, candidate_listings ( id, platform, title, url, host_name )"
          : "confidence, verdict, registered_id, registered_units ( id, name, address, street, number, neighborhood )";

      const [{ data: traceRow }, { data: stepRows }, { data: linkRows }] = await Promise.all([
        supabase.from("agent_traces").select("*").eq("id", traceId).limit(1),
        supabase.from("trace_steps").select("*").eq("trace_id", traceId).order("step_index"),
        supabase.from("entity_links").select(linkSelect).eq("trace_id", traceId),
      ]);

      const traceData = ((traceRow ?? []) as AgentTrace[])[0] ?? null;
      if (!traceData) return null;
      setTrace(traceData);
      setSteps((stepRows ?? []) as TraceStep[]);

      const mapped: Match[] = mode === "discovery"
        ? (((linkRows ?? []) as Array<{
            confidence: number;
            candidate_listings: {
              id: string;
              platform: string | null;
              title: string | null;
              url: string | null;
              host_name: string | null;
            } | null;
          }>)
            .map((row) =>
              row.candidate_listings
                ? {
                    kind: "candidate" as const,
                    id: row.candidate_listings.id,
                    platform: row.candidate_listings.platform,
                    title: row.candidate_listings.title,
                    url: row.candidate_listings.url,
                    host_name: row.candidate_listings.host_name,
                    confidence: row.confidence,
                  }
                : null,
            )
            .filter((m): m is DiscoveryMatch => m !== null))
        : (((linkRows ?? []) as Array<{
            confidence: number;
            verdict: string;
            registered_units: {
              id: string;
              name: string | null;
              address: string | null;
              street: string | null;
              number: string | null;
              neighborhood: string | null;
            } | null;
          }>)
            .filter((row) => row.verdict === "matched" && row.registered_units)
            .map((row) => ({
              kind: "registered" as const,
              id: row.registered_units!.id,
              name: row.registered_units!.name,
              address: row.registered_units!.address,
              street: row.registered_units!.street,
              number: row.registered_units!.number,
              neighborhood: row.registered_units!.neighborhood,
              confidence: row.confidence,
              verdict: row.verdict,
            })));

      setMatches(mapped);
      return traceData;
    },
    [mode],
  );

  const stopPolling = useCallback(() => {
    if (pollTimer.current) {
      clearTimeout(pollTimer.current);
      pollTimer.current = null;
    }
  }, []);

  const pollLoop = useCallback(
    (traceId: string) => {
      const tick = async () => {
        if (activeTraceId.current !== traceId) return;
        const t = await fetchTrace(traceId);
        if (!t) {
          pollTimer.current = setTimeout(tick, POLL_MS);
          return;
        }
        if (t.final_verdict === "running") {
          pollTimer.current = setTimeout(tick, POLL_MS);
        } else {
          // One more fetch after a short delay — entity_links can lag behind
          // the trace verdict update by a few hundred ms.
          setTimeout(() => {
            if (activeTraceId.current === traceId) void fetchTrace(traceId);
          }, 800);
          setRunning(false);
          router.refresh();
        }
      };
      void tick();
    },
    [fetchTrace, router],
  );

  const loadLatestTrace = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    const supabase = createClient();

    const { data: latestList } = await supabase
      .from("agent_traces")
      .select("id, final_verdict")
      .eq(traceFilterColumn, id)
      .order("completed_at", { ascending: false })
      .limit(1);
    const latest = (latestList ?? [])[0] as
      | { id: string; final_verdict: string }
      | undefined;

    if (!latest) {
      setTrace(null);
      setSteps([]);
      setMatches([]);
      setLoading(false);
      return;
    }

    activeTraceId.current = latest.id;
    await fetchTrace(latest.id);
    setLoading(false);

    if (latest.final_verdict === "running") {
      setRunning(true);
      pollLoop(latest.id);
    }
  }, [id, traceFilterColumn, fetchTrace, pollLoop]);

  useEffect(() => {
    if (open && id) {
      loadLatestTrace();
    }
    return () => {
      stopPolling();
      activeTraceId.current = null;
    };
  }, [open, id, loadLatestTrace, stopPolling]);

  const runAgent = async () => {
    if (!id) return;
    stopPolling();
    setRunning(true);
    setError(null);
    setTrace(null);
    setSteps([]);
    setMatches([]);
    try {
      const res = await fetch(apiPath, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [apiBodyKey]: id }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || `HTTP ${res.status}`);
      }
      const data = (await res.json()) as { trace_id: string };
      activeTraceId.current = data.trace_id;
      pollLoop(data.trace_id);
    } catch (err) {
      setError((err as Error).message);
      setRunning(false);
    }
  };

  const formatAddress = (m: InvestigationMatch) => {
    if (m.address) return m.address;
    const parts = [m.street, m.number].filter(Boolean);
    return parts.length ? parts.join(" ") : null;
  };

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="sm:max-w-2xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center justify-between gap-3">
            <span className="truncate">{copy.header}: {title ?? "—"}</span>
            <Button size="sm" onClick={runAgent} disabled={running}>
              <MagnifyingGlass size={14} className="mr-1" />
              {running ? "Pretraživanje…" : trace ? "Pokreni ponovno" : "Pokreni"}
            </Button>
          </SheetTitle>
        </SheetHeader>

        <div className="p-4 space-y-6">
          {error ? (
            <div className="text-sm text-destructive border rounded p-3">
              Greška: {error}
            </div>
          ) : null}

          {loading ? (
            <div className="text-sm text-muted-foreground">Učitavanje…</div>
          ) : !trace ? (
            <div className="text-sm text-muted-foreground border rounded p-4">
              {copy.emptyState}
            </div>
          ) : (
            <>
              <div className="flex items-center gap-2 text-sm">
                <span className="font-medium">Status:</span>
                {verdictBadge(trace.final_verdict)}
                <span className="text-xs text-muted-foreground ml-auto">
                  {trace.step_count} {trace.step_count === 1 ? "korak" : "koraka"}
                </span>
              </div>

              {trace.final_verdict !== "running" && matches.length > 0 ? (
                <div className="border-l-4 border-emerald-500 bg-emerald-50 rounded p-3 text-sm">
                  <div className="font-semibold mb-1">
                    {copy.foundBanner(matches.length)}
                    {trace.final_confidence > 0
                      ? ` (pouzdanost ${formatConfidence(trace.final_confidence)})`
                      : ""}
                    .
                  </div>
                </div>
              ) : trace.final_verdict === copy.emptyVerdictLabel ? (
                <div className="border-l-4 border-slate-400 bg-slate-50 rounded p-3 text-sm">
                  <div className="font-semibold mb-1">{copy.emptyVerdictBanner}</div>
                  <div className="text-xs text-muted-foreground">{copy.emptyVerdictHint}</div>
                </div>
              ) : trace.final_verdict === "error" ? (
                <div className="border-l-4 border-red-500 bg-red-50 rounded p-3 text-sm">
                  <div className="font-semibold mb-1">Istraga je prekinuta zbog greške.</div>
                  <div className="text-xs text-muted-foreground">
                    Pokušajte ponovno; ako greška ostane, provjerite ZAI_API_KEY i FIRECRAWL_API_KEY.
                  </div>
                </div>
              ) : null}

              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm">
                  <span className="font-medium">{copy.matchesLabel}:</span>
                  <Badge variant="secondary">{matches.length}</Badge>
                </div>
                {matches.length === 0 ? (
                  <div className="text-xs text-muted-foreground">
                    {trace.final_verdict === "running"
                      ? "Agent još pretražuje…"
                      : "Nema podudaranja u zadnjem pokretanju."}
                  </div>
                ) : (
                  <ul className="space-y-2">
                    {matches
                      .slice()
                      .sort((a, b) => b.confidence - a.confidence)
                      .map((m) =>
                        m.kind === "candidate" ? (
                          <li
                            key={m.id}
                            className="flex items-center justify-between gap-3 border rounded p-2 text-sm"
                          >
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <Badge variant="outline" className="text-xs uppercase">
                                  {m.platform}
                                </Badge>
                                <span className="truncate font-medium">{m.title}</span>
                              </div>
                              {m.host_name ? (
                                <div className="text-xs text-muted-foreground">Host: {m.host_name}</div>
                              ) : null}
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              <span className="text-xs font-mono">
                                {formatConfidence(m.confidence)}
                              </span>
                              {m.url ? (
                                <a
                                  href={m.url}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="text-primary hover:underline"
                                >
                                  <ArrowSquareOut size={16} />
                                </a>
                              ) : null}
                            </div>
                          </li>
                        ) : (
                          <li
                            key={m.id}
                            className="flex items-center justify-between gap-3 border rounded p-2 text-sm"
                          >
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <CheckCircle size={14} weight="fill" className="text-success shrink-0" />
                                <Link
                                  href={`/dashboard/registrirani/${m.id}`}
                                  className="truncate font-medium hover:underline"
                                >
                                  {m.name ?? "—"}
                                </Link>
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {formatAddress(m) ?? "—"}
                                {m.neighborhood ? ` · ${m.neighborhood}` : ""}
                              </div>
                            </div>
                            <span className="text-xs font-mono shrink-0">
                              {formatConfidence(m.confidence)}
                            </span>
                          </li>
                        ),
                      )}
                  </ul>
                )}
              </div>

              <TraceSummary trace={trace} steps={steps} confidence={trace.final_confidence} />

              {running ? (
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <CircleNotch size={12} className="animate-spin" />
                  Osvježavanje koraka svakih {POLL_MS / 1000}s…
                </div>
              ) : null}
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
