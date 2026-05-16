"use client";

import { useEffect, useState } from "react";
import { formatEur, formatCount } from "@/lib/format";
import type { Neighborhood } from "@/lib/types";

interface Props {
  neighborhood: Neighborhood;
  maxLoss: number;
  rank?: number;
}

export function NeighborhoodBar({ neighborhood, maxLoss, rank }: Props) {
  const pct = maxLoss > 0 ? (neighborhood.estimated_annual_loss_eur / maxLoss) * 100 : 0;
  const [width, setWidth] = useState(0);

  useEffect(() => {
    const t = setTimeout(() => setWidth(pct), 80);
    return () => clearTimeout(t);
  }, [pct]);

  const tier = pct >= 70 ? "high" : pct >= 35 ? "mid" : "low";

  return (
    <div className="group space-y-1.5 fade-up">
      <div className="flex items-baseline justify-between gap-4 text-sm">
        <div className="flex items-baseline gap-2 min-w-0">
          {rank != null && (
            <span className="text-[10px] font-mono text-muted-foreground tabular-nums w-5 text-right">
              {String(rank).padStart(2, "0")}
            </span>
          )}
          <span className="font-medium truncate">{neighborhood.name}</span>
          <span className="text-xs text-muted-foreground tabular-nums shrink-0">
            {formatCount(neighborhood.flag_count)} nalaza
          </span>
        </div>
        <span className="font-semibold tabular-nums-tight shrink-0">
          {formatEur(neighborhood.estimated_annual_loss_eur)}
        </span>
      </div>

      <div className="relative h-2 rounded-sm bg-muted/60 overflow-hidden">
        <div
          className="absolute inset-y-0 left-0 rounded-sm transition-[width] duration-[1200ms] ease-[cubic-bezier(0.22,1,0.36,1)]"
          style={{
            width: `${width}%`,
            background:
              tier === "high"
                ? "linear-gradient(90deg, hsl(0 72% 45%) 0%, #FB8A2D 100%)"
                : tier === "mid"
                  ? "linear-gradient(90deg, #FB8A2D 0%, #F9C59B 100%)"
                  : "linear-gradient(90deg, #F9C59B 0%, #FFE7D5 100%)",
          }}
        />
        <div
          className="absolute inset-0 opacity-0 group-hover:opacity-30 transition-opacity duration-300"
          style={{
            background:
              "linear-gradient(110deg, transparent 30%, hsl(0 0% 100% / 0.6) 50%, transparent 70%)",
            backgroundSize: "200% 100%",
            animation: "shimmer 1.6s linear infinite",
          }}
        />
      </div>
    </div>
  );
}
