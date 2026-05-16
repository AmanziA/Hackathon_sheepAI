"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import { TraceSummary } from "./trace-summary";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { ArrowSquareOut, MagnifyingGlass, CircleNotch } from "@phosphor-icons/react";
import type { AgentTrace, TraceStep, CandidateListing } from "@/lib/types";
import { formatConfidence } from "@/lib/format";

interface Props {
  open: boolean;
  onClose: () => void;
  registeredId: string | null;
  unitName?: string | null;
}

type MatchedListing = Pick<CandidateListing, "id" | "platform" | "title" | "url" | "host_name"> & {
  confidence: number;
};

const POLL_MS = 1500;

export function DiscoveryDrawer({ open, onClose, registeredId, unitName }: Props) {
  const router = useRouter();
  const [trace, setTrace] = useState<AgentTrace | null>(null);
  const [steps, setSteps] = useState<TraceStep[]>([]);
  const [matches, setMatches] = useState<MatchedListing[]>([]);
  const [loading, setLoading] = useState(false);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const pollTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const activeTraceId = useRef<string | null>(null);

  const fetchTrace = useCallback(
    async (traceId: string) => {
      const supabase = createClient();
      const [{ data: traceRow }, { data: stepRows }, { data: linkRows }] = await Promise.all([
        supabase.from("agent_traces").select("*").eq("id", traceId).maybeSingle(),
        supabase.from("trace_steps").select("*").eq("trace_id", traceId).order("step_index"),
        supabase
          .from("entity_links")
          .select(
            "confidence, candidate_id, candidate_listings ( id, platform, title, url, host_name )",
          )
          .eq("trace_id", traceId),
      ]);

      if (!traceRow) return null;
      setTrace(traceRow as AgentTrace);
      setSteps((stepRows ?? []) as TraceStep[]);
      setMatches(
        ((linkRows ?? []) as Array<{
          confidence: number;
          candidate_listings: MatchedListing | null;
        }>)
          .map((row) =>
            row.candidate_listings
              ? { ...row.candidate_listings, confidence: row.confidence }
              : null,
          )
          .filter((m): m is MatchedListing => m !== null),
      );
      return traceRow as AgentTrace;
    },
    [],
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
          setRunning(false);
          // Refresh the parent (Registrirani) page so its status pill picks up
          // the new latest_trace + match_count.
          router.refresh();
        }
      };
      void tick();
    },
    [fetchTrace, router],
  );

  const loadLatestTrace = useCallback(async () => {
    if (!registeredId) return;
    setLoading(true);
    setError(null);
    const supabase = createClient();

    const { data: latest } = await supabase
      .from("agent_traces")
      .select("id, final_verdict")
      .eq("registered_id", registeredId)
      .order("completed_at", { ascending: false })
      .limit(1)
      .maybeSingle();

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
  }, [registeredId, fetchTrace, pollLoop]);

  useEffect(() => {
    if (open && registeredId) {
      loadLatestTrace();
    }
    return () => {
      stopPolling();
      activeTraceId.current = null;
    };
  }, [open, registeredId, loadLatestTrace, stopPolling]);

  const runDiscovery = async () => {
    if (!registeredId) return;
    stopPolling();
    setRunning(true);
    setError(null);
    setTrace(null);
    setSteps([]);
    setMatches([]);
    try {
      const res = await fetch("/api/discover", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ registered_id: registeredId }),
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

  const verdictBadge = (verdict: string) => {
    if (verdict === "running") {
      return (
        <Badge variant="outline" className="text-xs gap-1">
          <CircleNotch size={10} className="animate-spin" /> u tijeku
        </Badge>
      );
    }
    if (verdict === "clear") return <Badge variant="default" className="text-xs">registrirano</Badge>;
    if (verdict === "no_listings_found") return <Badge variant="secondary" className="text-xs">bez oglasa</Badge>;
    if (verdict === "error") return <Badge variant="destructive" className="text-xs">greška</Badge>;
    return <Badge variant="outline" className="text-xs">{verdict}</Badge>;
  };

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="sm:max-w-2xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center justify-between gap-3">
            <span className="truncate">Istraga: {unitName ?? "—"}</span>
            <Button size="sm" onClick={runDiscovery} disabled={running}>
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
              Još nije pretraženo. Pokreni istragu da pronađemo online oglase za ovaj objekt.
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
                    Agent je pronašao {matches.length} {matches.length === 1 ? "podudaran oglas" : "podudarna oglasa"}
                    {trace.final_confidence > 0
                      ? ` (najviša pouzdanost ${formatConfidence(trace.final_confidence)})`
                      : ""}
                    .
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Pogledajte popis ispod i evidencijski lanac za detalje. Najjači signal je
                    najčešće poklapanje adrese i imena (vlasnika ili direktora).
                  </div>
                </div>
              ) : trace.final_verdict === "no_listings_found" ? (
                <div className="border-l-4 border-slate-400 bg-slate-50 rounded p-3 text-sm">
                  <div className="font-semibold mb-1">Agent nije pronašao nijedan oglas.</div>
                  <div className="text-xs text-muted-foreground">
                    Ovaj registrirani objekt vjerojatno nije aktivno oglašen online.
                  </div>
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
                  <span className="font-medium">Pronađeni oglasi:</span>
                  <Badge variant="secondary">{matches.length}</Badge>
                </div>
                {matches.length === 0 ? (
                  <div className="text-xs text-muted-foreground">
                    {trace.final_verdict === "running"
                      ? "Agent još pretražuje…"
                      : "Nema podudarnih oglasa u zadnjem pokretanju."}
                  </div>
                ) : (
                  <ul className="space-y-2">
                    {matches
                      .sort((a, b) => b.confidence - a.confidence)
                      .map((m) => (
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
                              <div className="text-xs text-muted-foreground">
                                Host: {m.host_name}
                              </div>
                            ) : null}
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <span className="text-xs font-mono">
                              {formatConfidence(m.confidence)}
                            </span>
                            <a
                              href={m.url}
                              target="_blank"
                              rel="noreferrer"
                              className="text-primary hover:underline"
                            >
                              <ArrowSquareOut size={16} />
                            </a>
                          </div>
                        </li>
                      ))}
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
