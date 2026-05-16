"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/utils/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MagnifyingGlass, CircleNotch } from "@phosphor-icons/react";
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
  match_count: number;
};

export function DiscoveryTrigger({ registeredId, unitName }: Props) {
  const [open, setOpen] = useState(false);
  const [latest, setLatest] = useState<LatestTrace | null>(null);
  const [loaded, setLoaded] = useState(false);

  const load = useCallback(async () => {
    const supabase = createClient();
    const { data: trace } = await supabase
      .from("agent_traces")
      .select("id, final_verdict, final_confidence, completed_at")
      .eq("registered_id", registeredId)
      .order("completed_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (!trace) {
      setLatest(null);
      setLoaded(true);
      return;
    }
    const { count } = await supabase
      .from("entity_links")
      .select("id", { count: "exact", head: true })
      .eq("trace_id", trace.id);
    setLatest({ ...(trace as LatestTrace), match_count: count ?? 0 });
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
    if (latest.final_verdict === "clear" || latest.match_count > 0) {
      return (
        <Badge variant="default" className="text-xs">
          Pronađeno {latest.match_count} {latest.match_count === 1 ? "oglas" : "oglasa"} ·{" "}
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

  return (
    <>
      <div className="rounded-lg border p-4 space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1">
            <h3 className="text-sm font-semibold">AI istraga online oglasa</h3>
            <p className="text-xs text-muted-foreground">
              Agent pretražuje Booking, Airbnb i druge platforme za podudarne oglase ovog objekta.
            </p>
          </div>
          {badge()}
        </div>
        <Button size="sm" variant="outline" onClick={() => setOpen(true)}>
          <MagnifyingGlass size={14} className="mr-1" />
          {latest ? "Pogledaj / pokreni ponovno" : "Pokreni istragu"}
        </Button>
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
