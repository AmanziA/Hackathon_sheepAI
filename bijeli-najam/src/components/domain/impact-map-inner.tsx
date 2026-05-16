"use client";

import { useMemo } from "react";
import {
  MapContainer,
  TileLayer,
  CircleMarker,
  Tooltip,
} from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { centerForSlug } from "@/lib/split-neighborhoods";
import type { Neighborhood } from "@/lib/types";

interface Props {
  neighborhoods: Neighborhood[];
  className?: string;
}

function formatEur(n: number): string {
  return n.toLocaleString("hr-HR", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  });
}

export default function ImpactMapInner({ neighborhoods, className }: Props) {
  const points = useMemo(() => {
    const maxLoss = Math.max(...neighborhoods.map((n) => n.estimated_annual_loss_eur), 1);
    return neighborhoods
      .map((n) => {
        const c = centerForSlug(n.slug);
        if (!c) return null;
        return {
          id: n.slug,
          name: n.name,
          lat: c.lat,
          lon: c.lon,
          loss: n.estimated_annual_loss_eur,
          flags: n.flag_count,
          intensity: n.estimated_annual_loss_eur / maxLoss,
        };
      })
      .filter((p): p is NonNullable<typeof p> => p !== null);
  }, [neighborhoods]);

  return (
    <div className={className ?? "h-[460px] w-full rounded-sm border overflow-hidden"}>
      <MapContainer
        center={[43.5081, 16.4402]}
        zoom={13}
        scrollWheelZoom
        style={{ height: "100%", width: "100%" }}
      >
        <TileLayer
          attribution='&copy; <a href="https://stadiamaps.com/">Stadia Maps</a> &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url={`https://tiles.stadiamaps.com/tiles/alidade_smooth/{z}/{x}/{y}{r}.png?api_key=${process.env.NEXT_PUBLIC_STADIA_KEY ?? ""}`}
          maxZoom={20}
        />
        {points.map((p) => {
          const radius = 8 + Math.sqrt(p.intensity) * 28;
          const color =
            p.intensity >= 0.7 ? "#DC2626" : p.intensity >= 0.4 ? "#FB8A2D" : "#F9C59B";
          return (
            <CircleMarker
              key={p.id}
              center={[p.lat, p.lon]}
              radius={radius}
              pathOptions={{
                color,
                fillColor: color,
                fillOpacity: 0.35,
                weight: 2,
              }}
            >
              <Tooltip direction="top" offset={[0, -radius]}>
                <strong>{p.name}</strong>
                <br />
                {formatEur(p.loss)} · {p.flags} nalaza
              </Tooltip>
            </CircleMarker>
          );
        })}
      </MapContainer>
    </div>
  );
}
