"use client";

import { useEffect, useState } from "react";
import { formatEur, formatCount } from "@/lib/format";
import type { Neighborhood } from "@/lib/types";

interface Props {
  neighborhood: Neighborhood;
  maxFlagCount: number;
  maxRegisteredCount: number;
  cityTotalLoss: number;
  rank?: number;
}

export function NeighborhoodBar({
  neighborhood,
  maxFlagCount,
  maxRegisteredCount,
  cityTotalLoss,
  rank,
}: Props) {
  const maxUnit = Math.max(maxFlagCount, maxRegisteredCount, 1);
  const flaggedPct = (neighborhood.flag_count / maxUnit) * 100;
  const registeredPct = (neighborhood.registered_count / maxUnit) * 100;
  const cityShare = cityTotalLoss > 0
    ? (neighborhood.estimated_annual_loss_eur / cityTotalLoss) * 100
    : 0;

  const [animFlagged, setAnimFlagged] = useState(0);
  const [animRegistered, setAnimRegistered] = useState(0);

  useEffect(() => {
    const t = setTimeout(() => {
      setAnimFlagged(flaggedPct);
      setAnimRegistered(registeredPct);
    }, 80);
    return () => clearTimeout(t);
  }, [flaggedPct, registeredPct]);

  const totalUnits = neighborhood.flag_count + neighborhood.registered_count;
  const illegalShare = totalUnits > 0
    ? Math.round((neighborhood.flag_count / totalUnits) * 100)
    : 0;

  return (
    <div className="group fade-up grid grid-cols-[1fr_auto] gap-x-6 items-center py-2.5">
      {/* Left: name + dual bars */}
      <div className="space-y-2 min-w-0">
        <div className="flex items-baseline gap-2 min-w-0">
          {rank != null && (
            <span className="text-[10px] font-mono text-muted-foreground tabular-nums w-5 text-right shrink-0">
              {String(rank).padStart(2, "0")}
            </span>
          )}
          <span className="font-medium truncate">{neighborhood.name}</span>
          <span className="text-xs text-muted-foreground shrink-0">
            {illegalShare}% nelegalnih
          </span>
        </div>

        {/* Dual mini bars: registered (green) + flagged (red) on the same axis */}
        <div className="space-y-1 pl-7">
          <Row
            label="Registriranih"
            count={neighborhood.registered_count}
            pct={animRegistered}
            color="var(--success)"
          />
          <Row
            label="Nelegalnih"
            count={neighborhood.flag_count}
            pct={animFlagged}
            color="var(--destructive)"
          />
        </div>
      </div>

      {/* Right: loss + share of city */}
      <div className="text-right space-y-0.5 shrink-0">
        <p className="font-semibold tabular-nums-tight text-base">
          {formatEur(neighborhood.estimated_annual_loss_eur)}
        </p>
        <p className="text-[10px] uppercase tracking-widest text-muted-foreground">
          {cityShare.toFixed(1)}% grada
        </p>
      </div>
    </div>
  );
}

function Row({
  label,
  count,
  pct,
  color,
}: {
  label: string;
  count: number;
  pct: number;
  color: string;
}) {
  return (
    <div className="flex items-center gap-2.5">
      <span className="text-[10px] text-muted-foreground w-[88px] shrink-0 uppercase tracking-wider">
        {label}
      </span>
      <div className="relative flex-1 h-1.5 bg-muted/60 rounded-sm overflow-hidden">
        <div
          className="absolute inset-y-0 left-0 rounded-sm transition-[width] duration-[900ms] ease-[cubic-bezier(0.22,1,0.36,1)]"
          style={{ width: `${pct}%`, background: color }}
        />
      </div>
      <span
        className="text-xs font-medium tabular-nums w-6 text-right"
        style={{ color }}
      >
        {formatCount(count)}
      </span>
    </div>
  );
}
