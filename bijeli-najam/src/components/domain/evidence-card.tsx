"use client";

import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { FilePdf, WarningCircle, CheckCircle, Eye, Buildings } from "@phosphor-icons/react";
import { ListingPreview } from "./listing-preview";
import { TraceSummary } from "./trace-summary";
import { ScoreBreakdown } from "./score-breakdown";
import { ConfidenceBadge } from "./confidence-badge";
import { EvisitorPanel } from "./evisitor-panel";
import { evisitorLookupForCandidate } from "@/lib/evisitor-mock";
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
  const listing = flag.candidate_listings;
  const isFlag = flag.confidence_unregistered >= 0.5;

  const evisitor = listing
    ? evisitorLookupForCandidate(
        {
          id: listing.id,
          title: listing.title,
          neighborhood: listing.neighborhood,
        },
        { confidenceUnregistered: flag.confidence_unregistered }
      )
    : null;

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

      <section className="space-y-3">
        <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground uppercase tracking-wide">
          <Buildings size={14} />
          Provjera u eVisitor sustavu
        </div>
        {evisitor ? (
          <EvisitorPanel lookup={evisitor} expectedBeds={listing?.beds} />
        ) : (
          <p className="text-sm text-muted-foreground">Nema podataka.</p>
        )}
      </section>

      <Separator />

      <section className="space-y-3">
        <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground uppercase tracking-wide">
          <Eye size={14} />
          Trag istrage agenta
        </div>
        {trace ? (
          <TraceSummary trace={trace} steps={steps} confidence={flag.confidence_unregistered} />
        ) : (
          <p className="text-sm text-muted-foreground">Trag istrage nije dostupan.</p>
        )}
      </section>

      <Separator />

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
