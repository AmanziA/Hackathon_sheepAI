"use client";

import { useRef } from "react";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { FilePdf, WarningCircle, CheckCircle, Eye } from "@phosphor-icons/react";
import { ListingPreview } from "./listing-preview";
import { AgentTrace } from "./agent-trace";
import { ScoreBreakdown } from "./score-breakdown";
import { ConfidenceBadge } from "./confidence-badge";
import { cn } from "@/lib/utils";
import type { Flag, AgentTrace as AgentTraceType, TraceStep, EntityLink } from "@/lib/types";

interface Props {
  flag: Flag;
  trace: AgentTraceType | null;
  steps: TraceStep[];
  entityLink: EntityLink | null;
  className?: string;
}

export function EvidenceCard({ flag, trace, steps, entityLink, className }: Props) {
  const traceRef = useRef<HTMLDivElement>(null);
  const listing = flag.candidate_listings;

  const isFlag = flag.confidence_unregistered >= 0.5;

  function scrollToStep(stepIndex: number) {
    const el = traceRef.current?.querySelector(`[data-step="${stepIndex}"]`);
    el?.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  async function generateReport() {
    const res = await fetch(`/api/generate-report?flag_id=${flag.id}`);
    if (!res.ok) return;
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `prijava-${flag.id.slice(0, 8)}.pdf`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className={cn("space-y-6", className)}>
      {/* Panel 1: Kandidatski oglas */}
      <section className="space-y-3">
        <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground uppercase tracking-wide">
          <Eye size={14} />
          Oglas kandidata
        </div>
        {listing ? (
          <ListingPreview listing={listing} screenshotUrl={flag.screenshot_url} />
        ) : (
          <p className="text-sm text-muted-foreground">Oglas nije dostupan.</p>
        )}
      </section>

      <Separator />

      {/* Panel 2: Agent reasoning trace — the centerpiece */}
      <section className="space-y-3" ref={traceRef}>
        <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground uppercase tracking-wide">
          <Eye size={14} />
          Trag istrage agenta
        </div>
        {trace ? (
          <AgentTrace trace={trace} steps={steps} onEvidenceClick={scrollToStep} />
        ) : (
          <p className="text-sm text-muted-foreground">Trag istrage nije dostupan.</p>
        )}
      </section>

      <Separator />

      {/* Panel 3: Verdict + actions */}
      <section className="space-y-4">
        <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground uppercase tracking-wide">
          {isFlag ? (
            <WarningCircle size={14} className="text-destructive" />
          ) : (
            <CheckCircle size={14} className="text-success" />
          )}
          Zaključak
        </div>

        <div className="flex items-center gap-3">
          <ConfidenceBadge score={flag.confidence_unregistered} />
          <span className={cn("text-sm font-semibold", isFlag ? "text-destructive" : "text-success")}>
            {isFlag ? "Vjerojatno neregistrirano" : "Vjerojatno registrirano"}
          </span>
        </div>

        {entityLink && (
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">
              Doprinos signala
            </p>
            <ScoreBreakdown signals={entityLink.match_signals} />
          </div>
        )}

        <Button onClick={generateReport} className="gap-2" aria-label="Generiraj prijavu u PDF formatu">
          <FilePdf size={16} />
          Generiraj prijavu
        </Button>
      </section>
    </div>
  );
}
