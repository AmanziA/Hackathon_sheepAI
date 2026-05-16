"use client";

import { useState } from "react";
import {
  MagnifyingGlass,
  FileText,
  Briefcase,
  Image,
  MapPin,
  TextAa,
  CaretDown,
  CaretUp,
} from "@phosphor-icons/react";
import { cn } from "@/lib/utils";
import type { TraceStep } from "@/lib/types";

const TOOL_ICONS: Record<string, React.ReactNode> = {
  search_htz_registry: <MagnifyingGlass size={16} />,
  get_htz_listing: <FileText size={16} />,
  search_sudski_registar: <Briefcase size={16} />,
  phash_compare: <Image size={16} />,
  geocode: <MapPin size={16} />,
  normalize_croatian: <TextAa size={16} />,
};

interface Props {
  step: TraceStep;
  defaultExpanded?: boolean;
}

export function ToolCallStep({ step, defaultExpanded = false }: Props) {
  const [expanded, setExpanded] = useState(defaultExpanded);

  const deltaPositive = step.confidence_delta >= 0;

  return (
    <div className="relative pl-6">
      <div className="absolute left-0 top-1.5 flex items-center justify-center w-5 h-5 rounded-full bg-muted border text-muted-foreground">
        {TOOL_ICONS[step.tool_called] ?? <MagnifyingGlass size={12} />}
      </div>

      <div className="space-y-1 pb-4">
        <div className="flex items-center gap-2 flex-wrap">
          <code className="text-xs font-mono bg-muted px-1.5 py-0.5 rounded">
            {step.tool_called}
          </code>
          <span
            className={cn(
              "text-xs font-mono font-semibold",
              deltaPositive ? "text-success" : "text-destructive"
            )}
            aria-label={`Promjena pouzdanosti: ${deltaPositive ? "+" : ""}${(step.confidence_delta * 100).toFixed(0)}%`}
          >
            {deltaPositive ? "+" : ""}
            {(step.confidence_delta * 100).toFixed(0)}%
          </span>
          {step.duration_ms && (
            <span className="text-xs text-muted-foreground">{step.duration_ms}ms</span>
          )}
        </div>

        <p className="text-sm text-muted-foreground italic">{step.why}</p>
        <p className="text-sm">{step.updated_hypothesis}</p>

        <button
          onClick={() => setExpanded((v) => !v)}
          className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground mt-1"
          aria-expanded={expanded}
        >
          {expanded ? <CaretUp size={12} /> : <CaretDown size={12} />}
          {expanded ? "Sakrij" : "Prikaži"} ulaz/izlaz
        </button>

        {expanded && (
          <div className="grid grid-cols-2 gap-2 mt-2">
            <div>
              <p className="text-xs text-muted-foreground mb-1 font-medium">Ulaz</p>
              <pre className="text-xs bg-muted rounded p-2 overflow-auto max-h-40">
                {JSON.stringify(step.tool_input, null, 2)}
              </pre>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1 font-medium">Izlaz</p>
              <pre className="text-xs bg-muted rounded p-2 overflow-auto max-h-40">
                {JSON.stringify(step.tool_output, null, 2)}
              </pre>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
