"use client";

import { CheckCircle } from "@phosphor-icons/react";
import type { EvidenceItem } from "@/lib/types";

interface Props {
  evidence: EvidenceItem[];
  onItemClick?: (stepIndex: number) => void;
}

export function EvidenceChain({ evidence, onItemClick }: Props) {
  if (evidence.length === 0) {
    return <p className="text-sm text-muted-foreground">Nema dokaza u lancu.</p>;
  }

  return (
    <ol className="space-y-2">
      {evidence.map((item, i) => (
        <li key={i} className="flex items-start gap-2 text-sm">
          <CheckCircle size={16} className="text-success mt-0.5 shrink-0" weight="fill" />
          <span className="flex-1">{item.fact}</span>
          {onItemClick && (
            <button
              onClick={() => onItemClick(item.step_index)}
              className="text-xs text-muted-foreground hover:text-foreground underline-offset-2 hover:underline shrink-0"
              aria-label={`Skoči na korak ${item.step_index + 1}`}
            >
              korak {item.step_index + 1}
            </button>
          )}
        </li>
      ))}
    </ol>
  );
}
