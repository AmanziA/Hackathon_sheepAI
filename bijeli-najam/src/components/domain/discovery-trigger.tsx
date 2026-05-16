"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/utils/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowSquareOut, CircleNotch, MagnifyingGlass, Globe } from "@phosphor-icons/react";
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
  evidence_chain: Array<{ step_index: number; fact: string; tool_called: string }> | null;
};

type MatchedListing = {
  id: string;
  platform: string | null;
  title: string | null;
  url: string | null;
  host_name: string | null;
  confidence: number;
};

export function DiscoveryTrigger({ registeredId, unitName }: Props) {
  const [open, setOpen] = useState(false);
  const [latest, setLatest] = useState<LatestTrace | null>(null);
  const [matches, setMatches] = useState<MatchedListing[]>([]);
  const [loaded, setLoaded] = useState(false);

  const load = useCallback(async () => {
    const supabase = createClient();
    const { data: traceRows } = await supabase
      .from("agent_traces")
      .select("id, final_verdict, final_confidence, completed_at, evidence_chain")
      .eq("registered_id", registeredId)
      .order("completed_at", { ascending: false })
      .limit(1);
    const trace = (traceRows ?? [])[0] as LatestTrace | undefined;

    if (!trace) {
      setLatest(null);
      setMatches([]);
      setLoaded(true);
      return;
    }

    const { data: linkRows } = await supabase
      .from("entity_links")
      .select(
        "confidence, candidate_id, candidate_listings ( id, platform, title, url, host_name )",
      )
      .eq("trace_id", trace.id);

    const mapped: MatchedListing[] = (
      (linkRows ?? []) as Array<{
        confidence: number;
        candidate_listings: MatchedListing | null;
      }>
    )
      .map((row) =>
        row.candidate_listings
          ? { ...row.candidate_listings, confidence: row.confidence }
          : null,
      )
      .filter((m): m is MatchedListing => m !== null)
      .sort((a, b) => b.confidence - a.confidence);

    setLatest(trace);
    setMatches(mapped);
    setLoaded(true);
  }, [registeredId]);

  useEffect(() => {
    void load();
  }, [load]);

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

  const hasResults =
    latest && latest.final_verdict !== "running" && matches.length > 0;

  const isEmpty = !latest && loaded;
  const isNoListings = latest?.final_verdict === "no_listings_found";
  const showCenteredEmpty = isEmpty || isNoListings;

  return (
    <>
      <div className="rounded-md border h-full flex flex-col">
        {!showCenteredEmpty ? (
          <div className="px-3 py-2 flex items-center justify-between gap-3 border-b">
            <div className="flex items-center gap-2 min-w-0">
              {badge()}
              <span className="text-xs text-muted-foreground truncate">
                Agent traži oglase na Bookingu/Airbnbu za ovaj objekt.
              </span>
            </div>
            <Button size="sm" variant="outline" onClick={() => setOpen(true)} className="shrink-0">
              <MagnifyingGlass size={14} className="mr-1" />
              {latest ? "Detalji" : "Pokreni"}
            </Button>
          </div>
        ) : null}

        {hasResults ? (
          <ul className="px-3 py-2 space-y-1 text-xs flex-1">
            {matches.map((m) => (
              <li
                key={m.id}
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
              </li>
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
                <Button size="sm" onClick={() => setOpen(true)} className="mt-1">
                  <MagnifyingGlass size={14} className="mr-1" />
                  Pokreni istragu
                </Button>
              </>
            ) : (
              <>
                <p className="text-sm font-medium">Bez online oglasa</p>
                <p className="text-xs text-muted-foreground max-w-[28ch] leading-snug">
                  Agent nije našao oglase. Objekt vjerojatno nije aktivno oglašen online.
                </p>
                <Button size="sm" variant="outline" onClick={() => setOpen(true)} className="mt-1">
                  <MagnifyingGlass size={14} className="mr-1" />
                  Pokreni ponovno
                </Button>
              </>
            )}
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center px-4 py-6 text-xs text-muted-foreground">
            Učitavanje…
          </div>
        )}
      </div>

      <DiscoveryDrawer
        open={open}
        onClose={() => {
          setOpen(false);
          void load();
        }}
        mode="discovery"
        id={registeredId}
        title={unitName}
      />
    </>
  );
}
