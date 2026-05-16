"use client";

import dynamic from "next/dynamic";
import { useMemo } from "react";
import { centerForSlug } from "@/lib/split-neighborhoods";
import type { Neighborhood } from "@/lib/types";

const Map3D = dynamic(() => import("./map3d"), { ssr: false });

interface Props {
  neighborhoods: Neighborhood[];
  className?: string;
}

export function ImpactMap({ neighborhoods, className }: Props) {
  const markers = useMemo(() => {
    const maxLoss = Math.max(...neighborhoods.map((n) => n.estimated_annual_loss_eur), 1);
    return neighborhoods
      .map((n) => {
        const center = centerForSlug(n.slug);
        if (!center) return null;
        const intensity = n.estimated_annual_loss_eur / maxLoss;
        return {
          id: n.slug,
          lat: center.lat,
          lon: center.lon,
          confidence: intensity,
          title: `${n.name} · ${formatEur(n.estimated_annual_loss_eur)} · ${n.flag_count} nalaza`,
        };
      })
      .filter((m): m is NonNullable<typeof m> => m !== null);
  }, [neighborhoods]);

  return (
    <div className={className ?? "h-[460px] w-full rounded-lg border overflow-hidden"}>
      <Map3D markers={markers} className="h-full w-full" />
    </div>
  );
}

function formatEur(n: number): string {
  return n.toLocaleString("hr-HR", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  });
}
