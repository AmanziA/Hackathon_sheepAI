"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import { createClient } from "@/utils/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  ArrowSquareOut,
  CircleNotch,
  MagnifyingGlass,
  Globe,
  CheckCircle,
} from "@phosphor-icons/react";
import { DiscoveryDrawer } from "./discovery-drawer";
import { formatConfidence } from "@/lib/format";

interface Props {
  registeredId: string;
  unitName: string | null;
}

type LatestTrace = {
  id: string;
  final_verdict: string;
  final_confidence: number;
  completed_at: string;
  step_count: number;
};

type TraceStep = {
  step_index: number;
  tool_called: string;
  why: string;
  updated_hypothesis: string;
  duration_ms: number | null;
};

type MatchedListing = {
  id: string;
  platform: string | null;
  title: string | null;
  url: string | null;
  host_name: string | null;
  confidence: number;
};

const TOOL_LABEL: Record<string, string> = {
  search_web: "Pretraga weba",
  fetch_url: "Otvaranje oglasa",
  search_sudski_registar: "Sudski registar",
  search_htz_registry: "HTZ registar",
  get_htz_listing: "HTZ detalji",
  normalize_croatian: "Normalizacija imena",
  record_match: "Bilježi pronađen oglas",
  update_candidate: "Spremam podatke oglasa",
  record_decision: "Bilježi zaključak",
  zai_error: "Greška agenta",
};

const POLL_MS = 1500;

export function DiscoveryTrigger({ registeredId, unitName }: Props) {
  const router = useRouter();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [latest, setLatest] = useState<LatestTrace | null>(null);
  const [matches, setMatches] = useState<MatchedListing[]>([]);
  const [steps, setSteps] = useState<TraceStep[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const pollTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const activeTraceId = useRef<string | null>(null);

  const fetchAll = useCallback(
    async (traceId: string) => {
      const supabase = createClient();
      const [{ data: traceRows }, { data: stepRows }, { data: linkRows }] = await Promise.all([
        supabase
          .from("agent_traces")
          .select("id, final_verdict, final_confidence, completed_at, step_count")
          .eq("id", traceId)
          .limit(1),
        supabase
          .from("trace_steps")
          .select("step_index, tool_called, why, updated_hypothesis, duration_ms")
          .eq("trace_id", traceId)
          .order("step_index"),
        supabase
          .from("entity_links")
          .select(
            "confidence, candidate_id, candidate_listings ( id, platform, title, url, host_name )",
          )
          .eq("trace_id", traceId),
      ]);

      const trace = ((traceRows ?? []) as LatestTrace[])[0] ?? null;
      if (!trace) return null;
      setLatest(trace);
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
          .filter((m): m is MatchedListing => m !== null)
          .sort((a, b) => b.confidence - a.confidence),
      );
      return trace;
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
        const t = await fetchAll(traceId);
        if (!t) {
          pollTimer.current = setTimeout(tick, POLL_MS);
          return;
        }
        if (t.final_verdict === "running") {
          pollTimer.current = setTimeout(tick, POLL_MS);
        } else {
          // Catch any late entity_links commits.
          setTimeout(() => {
            if (activeTraceId.current === traceId) void fetchAll(traceId);
          }, 800);
          setRunning(false);
          // Revalidate server data so list pages (oglasi, registrirani) pick
          // up new matches without a manual refresh.
          router.refresh();
        }
      };
      void tick();
    },
    [fetchAll, router],
  );

  const loadInitial = useCallback(async () => {
    const supabase = createClient();
    const { data: list } = await supabase
      .from("agent_traces")
      .select("id, final_verdict, final_confidence, completed_at, step_count")
      .eq("registered_id", registeredId)
      .order("completed_at", { ascending: false })
      .limit(1);
    const trace = ((list ?? []) as LatestTrace[])[0] ?? null;
    if (!trace) {
      setLatest(null);
      setSteps([]);
      setMatches([]);
      setLoaded(true);
      return;
    }
    activeTraceId.current = trace.id;
    await fetchAll(trace.id);
    setLoaded(true);
    if (trace.final_verdict === "running") {
      setRunning(true);
      pollLoop(trace.id);
    }
  }, [registeredId, fetchAll, pollLoop]);

  useEffect(() => {
    void loadInitial();
    return () => {
      stopPolling();
      activeTraceId.current = null;
    };
  }, [loadInitial, stopPolling]);

  async function runAgent() {
    stopPolling();
    setRunning(true);
    setError(null);
    setLatest(null);
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
  }

  function badge() {
    if (!loaded) {
      return <Badge variant="outline" className="text-xs">Učitavanje…</Badge>;
    }
    if (!latest) {
      return <Badge variant="outline" className="text-xs">Nije pretraženo</Badge>;
    }
    if (latest.final_verdict === "running") {
      return (
        <Badge variant="outline" className="text-xs gap-1">
          <CircleNotch size={10} className="animate-spin" /> u tijeku
        </Badge>
      );
    }
    if (latest.final_verdict === "clear" || matches.length > 0) {
      return (
        <Badge variant="default" className="text-xs">
          Pronađeno {matches.length} {matches.length === 1 ? "oglas" : "oglasa"} ·{" "}
          {formatConfidence(latest.final_confidence)}
        </Badge>
      );
    }
    if (latest.final_verdict === "no_listings_found") {
      return <Badge variant="secondary" className="text-xs">Bez oglasa</Badge>;
    }
    if (latest.final_verdict === "error") {
      return <Badge variant="destructive" className="text-xs">Greška</Badge>;
    }
    return <Badge variant="outline" className="text-xs">Neodlučno</Badge>;
  }

  const hasResults = latest && latest.final_verdict !== "running" && matches.length > 0;
  const isEmpty = !latest && loaded && !running;
  const finishedNoMatches =
    latest != null && latest.final_verdict !== "running" && matches.length === 0 && !running;
  const showCenteredEmpty = (isEmpty || finishedNoMatches) && !running;
  const currentStep = steps.length > 0 ? steps[steps.length - 1] : null;
  const noMatchCopy: { title: string; sub: string; button: string } =
    latest?.final_verdict === "no_listings_found"
      ? {
          title: "Bez online oglasa",
          sub: "Agent nije našao podudarne oglase. Objekt vjerojatno nije aktivno oglašen online.",
          button: "Pokreni ponovno",
        }
      : latest?.final_verdict === "error"
        ? {
            title: "Greška agenta",
            sub: "Istraga je prekinuta zbog greške. Pokušaj ponovno ili otvori detalje.",
            button: "Pokreni ponovno",
          }
        : {
            title: "Neodlučno",
            sub: "Agent nije pronašao siguran oglas. Pogledaj rezoniranje ili pokreni ponovno.",
            button: "Pokreni ponovno",
          };

  return (
    <>
      <div className="rounded-md border h-full flex flex-col overflow-hidden">
        {!showCenteredEmpty ? (
          <div className="px-3 py-2 flex items-center justify-between gap-3 border-b">
            <div className="flex items-center gap-2 min-w-0">
              {badge()}
              <span className="text-xs text-muted-foreground truncate">
                {running
                  ? `Korak ${steps.length}/~6 — agent pretražuje Booking, Airbnb, sudski registar…`
                  : "Agent traži oglase na Bookingu/Airbnbu za ovaj objekt."}
              </span>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setDrawerOpen(true)}
              className="shrink-0"
              disabled={!latest}
            >
              <MagnifyingGlass size={14} className="mr-1" />
              Detalji
            </Button>
          </div>
        ) : null}

        {running ? (
          <div className="flex-1 px-3 py-4 flex items-center justify-center">
            <AnimatePresence mode="popLayout" initial={false}>
              {currentStep ? (
                <motion.div
                  key={currentStep.step_index}
                  initial={{ opacity: 0, y: 14, filter: "blur(8px)" }}
                  animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                  exit={{ opacity: 0, y: -18, filter: "blur(8px)" }}
                  transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
                  className="text-center space-y-2 max-w-[36ch]"
                >
                  <div className="text-[10px] uppercase tracking-wide text-muted-foreground">
                    {TOOL_LABEL[currentStep.tool_called] ?? currentStep.tool_called}
                  </div>
                  <div className="text-sm font-medium leading-snug">
                    {currentStep.why || currentStep.updated_hypothesis || "…"}
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  key="agent-thinking"
                  initial={{ opacity: 0, filter: "blur(8px)" }}
                  animate={{ opacity: 1, filter: "blur(0px)" }}
                  exit={{ opacity: 0, filter: "blur(8px)" }}
                  transition={{ duration: 0.4 }}
                  className="flex items-center gap-2 text-xs text-muted-foreground"
                >
                  <CircleNotch size={14} className="animate-spin" />
                  Pokrećem agenta…
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        ) : hasResults ? (
          <ul className="px-3 py-2 space-y-1 text-xs flex-1">
            {matches.map((m) => (
              <motion.li
                key={m.id}
                initial={{ opacity: 0, y: 6, filter: "blur(6px)" }}
                animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                transition={{ duration: 0.35 }}
                className="flex items-center justify-between gap-2 min-w-0"
              >
                <div className="flex items-center gap-2 min-w-0">
                  {m.platform ? (
                    <Badge variant="outline" className="text-[10px] uppercase shrink-0">
                      {m.platform}
                    </Badge>
                  ) : null}
                  <span className="font-medium truncate">{m.title ?? "—"}</span>
                  {m.host_name ? (
                    <span className="text-muted-foreground truncate">· {m.host_name}</span>
                  ) : null}
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <span className="font-mono tabular-nums text-muted-foreground">
                    {formatConfidence(m.confidence)}
                  </span>
                  {m.url ? (
                    <a
                      href={m.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-muted-foreground hover:text-primary"
                      aria-label="Otvori oglas"
                    >
                      <ArrowSquareOut size={12} />
                    </a>
                  ) : null}
                </div>
              </motion.li>
            ))}
          </ul>
        ) : showCenteredEmpty ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-3 px-4 py-6 text-center">
            <div className="rounded-full bg-muted p-3">
              <Globe size={20} className="text-muted-foreground" />
            </div>
            {isEmpty ? (
              <>
                <p className="text-sm font-medium">Još nije pretraženo</p>
                <p className="text-xs text-muted-foreground max-w-[28ch] leading-snug">
                  Pokreni AI istragu da pronađemo oglase ovog objekta na Bookingu, Airbnbu i drugim platformama.
                </p>
                <Button size="sm" onClick={runAgent} className="mt-1" disabled={running}>
                  <MagnifyingGlass size={14} className="mr-1" />
                  Pokreni istragu
                </Button>
              </>
            ) : (
              <>
                <p className="text-sm font-medium">{noMatchCopy.title}</p>
                <p className="text-xs text-muted-foreground max-w-[28ch] leading-snug">
                  {noMatchCopy.sub}
                </p>
              </>
            )}
            {error ? <p className="text-xs text-destructive mt-2">{error}</p> : null}
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center px-4 py-6 text-xs text-muted-foreground">
            Učitavanje…
          </div>
        )}

        {/* Footer actions for any finished run (with or without matches) */}
        {latest && !running ? (
          <div className="border-t px-3 py-1.5 flex items-center justify-between gap-2">
            <span className="text-[11px] text-muted-foreground flex items-center gap-1">
              {hasResults ? (
                <>
                  <CheckCircle size={11} weight="fill" className="text-success" />
                  Završeno · {latest.step_count} {latest.step_count === 1 ? "korak" : "koraka"}
                </>
              ) : (
                <>
                  Pretraga završena · {latest.step_count} {latest.step_count === 1 ? "korak" : "koraka"}
                </>
              )}
            </span>
            <div className="flex items-center gap-1">
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setDrawerOpen(true)}
                className="h-6 text-xs"
              >
                Detalji rezoniranja
              </Button>
              <Button size="sm" variant="ghost" onClick={runAgent} className="h-6 text-xs">
                {hasResults ? "Pokreni ponovno" : noMatchCopy.button}
              </Button>
            </div>
          </div>
        ) : null}
      </div>

      <DiscoveryDrawer
        open={drawerOpen}
        onClose={() => {
          setDrawerOpen(false);
          void loadInitial();
        }}
        mode="discovery"
        id={registeredId}
        title={unitName}
      />
    </>
  );
}
