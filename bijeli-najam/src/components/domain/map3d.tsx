"use client";

import { useState, useCallback } from "react";
import DeckGL from "@deck.gl/react";
import { MapView } from "@deck.gl/core";
import type { PickingInfo, MapViewState } from "@deck.gl/core";
import { ColumnLayer, ScatterplotLayer, BitmapLayer } from "@deck.gl/layers";
import { TileLayer } from "@deck.gl/geo-layers";

const INITIAL_VIEW: MapViewState = {
  longitude: 16.4402,
  latitude: 43.5081,
  zoom: 13,
  pitch: 50,
  bearing: -15,
};

interface Marker {
  id: string;
  lat: number;
  lon: number;
  confidence: number;
  title?: string;
  color?: [number, number, number, number];
}

interface Props {
  markers: Marker[];
  onMarkerClick?: (id: string) => void;
  className?: string;
}

function confidenceColor(c: number): [number, number, number, number] {
  if (c >= 0.7) return [220, 38, 38, 220];
  if (c >= 0.4) return [245, 158, 11, 200];
  return [107, 114, 128, 160];
}

export default function Map3D({ markers, onMarkerClick, className }: Props) {
  const [viewState, setViewState] = useState<MapViewState>(INITIAL_VIEW);
  const [tooltip, setTooltip] = useState<{
    x: number; y: number; title: string; confidence: number;
  } | null>(null);

  const layers = [
    new TileLayer({
      id: "stadia",
      data: `https://tiles.stadiamaps.com/tiles/alidade_smooth/{z}/{x}/{y}.png?api_key=${process.env.NEXT_PUBLIC_STADIA_KEY ?? ""}`,
      minZoom: 0,
      maxZoom: 20,
      tileSize: 256,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      renderSubLayers: (props: any) => {
        const [[west, south], [east, north]] = props.tile.boundingBox;
        return new BitmapLayer({ ...props, data: null, image: props.data, bounds: [west, south, east, north] });
      },
    }),

    new ScatterplotLayer<Marker>({
      id: "glow",
      data: markers,
      getPosition: (d) => [d.lon, d.lat],
      getRadius: (d) => 28 + d.confidence * 18,
      getFillColor: (d) => {
        const [r, g, b] = d.color ?? confidenceColor(d.confidence);
        return [r, g, b, 35];
      },
      radiusUnits: "meters",
      pickable: false,
    }),

    new ColumnLayer<Marker>({
      id: "columns",
      data: markers,
      getPosition: (d) => [d.lon, d.lat],
      getElevation: (d) => d.confidence * 180,
      getFillColor: (d) => d.color ?? confidenceColor(d.confidence),
      getLineColor: [255, 255, 255, 50],
      radius: 22,
      extruded: true,
      diskResolution: 20,
      pickable: true,
    }),
  ];

  const onHover = useCallback((info: PickingInfo) => {
    const m = info.object as Marker | undefined;
    if (m) setTooltip({ x: info.x, y: info.y, title: m.title ?? "Oglas", confidence: m.confidence });
    else setTooltip(null);
  }, []);

  const onClick = useCallback((info: PickingInfo) => {
    const m = info.object as Marker | undefined;
    if (m && onMarkerClick) onMarkerClick(m.id);
  }, [onMarkerClick]);

  return (
    <div className={`relative overflow-hidden ${className ?? "h-full w-full"}`}>
      <DeckGL
        views={new MapView({ repeat: false })}
        viewState={viewState}
        onViewStateChange={({ viewState: vs }) => setViewState(vs as MapViewState)}
        controller
        layers={layers}
        onHover={onHover}
        onClick={onClick}
        style={{ position: "absolute", top: "0", left: "0", right: "0", bottom: "0" }}
      />

      {tooltip && (
        <div
          className="absolute z-10 pointer-events-none bg-background border rounded-lg shadow-lg px-3 py-2 text-sm max-w-[260px]"
          style={{ left: tooltip.x + 14, top: tooltip.y - 52 }}
        >
          <p className="font-medium leading-snug">{tooltip.title}</p>
        </div>
      )}

      <div className="absolute bottom-4 left-4 z-10 bg-background/90 backdrop-blur border rounded-lg px-3 py-2 text-xs space-y-1 shadow">
        <p className="font-semibold mb-1">Intenzitet</p>
        {[
          { label: "visok", color: "bg-red-600" },
          { label: "srednji", color: "bg-amber-500" },
          { label: "nizak", color: "bg-gray-500" },
        ].map((item) => (
          <div key={item.label} className="flex items-center gap-2">
            <div className={`w-2.5 h-2.5 rounded-sm ${item.color}`} />
            <span className="text-muted-foreground">{item.label}</span>
          </div>
        ))}
      </div>

      <div className="absolute top-3 right-3 z-10 bg-background/80 backdrop-blur border rounded-md px-2 py-1 text-xs text-muted-foreground select-none shadow">
        3D · Povuci za rotaciju
      </div>
    </div>
  );
}
