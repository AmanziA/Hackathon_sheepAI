import { Gavel, ShieldCheck, ShieldWarning } from "@phosphor-icons/react";
import { ToolCallStep } from "./tool-call-step";
import { EvidenceChain } from "./evidence-chain";
import { cn } from "@/lib/utils";
import { formatConfidence, formatDateTime } from "@/lib/format";
import type { AgentTrace as AgentTraceType, TraceStep } from "@/lib/types";

interface Props {
  trace: AgentTraceType;
  steps: TraceStep[];
  onEvidenceClick?: (stepIndex: number) => void;
}

export function AgentTrace({ trace, steps, onEvidenceClick }: Props) {
  const verdictColor =
    trace.final_verdict === "flagged"
      ? "text-destructive"
      : trace.final_verdict === "clear"
      ? "text-success"
      : "text-warning";

  const verdictLabel =
    trace.final_verdict === "flagged"
      ? "Označeno"
      : trace.final_verdict === "clear"
      ? "Registrirano"
      : "Neodlučno";

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 pb-2 border-b">
        <div className="flex items-center gap-2">
          {trace.final_confidence >= 0.5 ? (
            <ShieldWarning size={20} className="text-destructive" />
          ) : (
            <ShieldCheck size={20} className="text-success" />
          )}
          <span className="font-semibold">Istraga agenta</span>
        </div>
        <span className="text-xs text-muted-foreground font-mono">{trace.model}</span>
        <span className="text-xs text-muted-foreground">{trace.step_count} koraka</span>
        <span className="text-xs text-muted-foreground ml-auto">
          {formatDateTime(trace.started_at)}
        </span>
      </div>

      <div className="relative border-l pl-2 space-y-0">
        {steps
          .sort((a, b) => a.step_index - b.step_index)
          .map((step) => (
            <ToolCallStep key={step.id} step={step} />
          ))}
      </div>

      <div className="border rounded-lg p-4 space-y-3">
        <div className="flex items-center gap-2">
          <Gavel size={18} />
          <span className="font-semibold">Zaključak</span>
          <span className={cn("text-sm font-semibold ml-auto", verdictColor)}>
            {verdictLabel} · {formatConfidence(trace.final_confidence)}
          </span>
        </div>
        <EvidenceChain evidence={trace.evidence_chain} onItemClick={onEvidenceClick} />
      </div>
    </div>
  );
}
