"use client";

import { useEffect, useRef, useState } from "react";
import { formatEur, formatCount } from "@/lib/format";
import { cn } from "@/lib/utils";

interface Props {
  value: number;
  label: string;
  format?: "eur" | "count";
  delta?: number;
  className?: string;
}

function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

export function StatNumber({ value, label, format = "count", delta, className }: Props) {
  const [current, setCurrent] = useState(0);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    const start = performance.now();
    const duration = Math.min(1500, 600 + Math.log10(Math.max(value, 1)) * 240);
    const startValue = 0;
    const tick = (now: number) => {
      const elapsed = now - start;
      const t = Math.min(1, elapsed / duration);
      const eased = easeOutCubic(t);
      setCurrent(Math.round(startValue + (value - startValue) * eased));
      if (t < 1) {
        rafRef.current = requestAnimationFrame(tick);
      }
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [value]);

  const display = format === "eur" ? formatEur(current) : formatCount(current);

  return (
    <div className={cn("space-y-1 fade-up", className)}>
      <p className="text-5xl font-bold tracking-tight tabular-nums-tight">{display}</p>
      {delta !== undefined && (
        <p className={cn("text-sm font-medium", delta >= 0 ? "text-destructive" : "text-success")}>
          {delta >= 0 ? "+" : ""}
          {format === "eur" ? formatEur(delta) : formatCount(delta)}
        </p>
      )}
      <p className="text-sm text-muted-foreground">{label}</p>
    </div>
  );
}
