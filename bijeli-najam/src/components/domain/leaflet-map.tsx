"use client";

import { useEffect } from "react";
import { MapContainer, TileLayer, CircleMarker, Tooltip } from "react-leaflet";
import { SPLIT_CENTER } from "@/lib/geo";
import { formatConfidence } from "@/lib/format";
import "leaflet/dist/leaflet.css";

interface Marker {
  id: string;
  lat: number;
  lon: number;
  confidence: number;
  title?: string;
}

interface Props {
  markers: Marker[];
  onMarkerClick?: (id: string) => void;
  className?: string;
}

function markerColor(confidence: number): string {
  if (confidence >= 0.7) return "#dc2626";
  if (confidence >= 0.4) return "#f59e0b";
  return "#6b7280";
}

export default function LeafletMap({ markers, onMarkerClick, className }: Props) {
  useEffect(() => {
    // Fix leaflet default icon path in Next.js
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const L = require("leaflet");
    delete L.Icon.Default.prototype._getIconUrl;
    L.Icon.Default.mergeOptions({
      iconRetinaUrl: "/leaflet/marker-icon-2x.png",
      iconUrl: "/leaflet/marker-icon.png",
      shadowUrl: "/leaflet/marker-shadow.png",
    });
  }, []);

  return (
    <MapContainer
      center={[SPLIT_CENTER.lat, SPLIT_CENTER.lon]}
      zoom={13}
      className={className ?? "h-full w-full"}
      scrollWheelZoom={false}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {markers.map((m) => (
        <CircleMarker
          key={m.id}
          center={[m.lat, m.lon]}
          radius={7}
          pathOptions={{
            color: markerColor(m.confidence),
            fillColor: markerColor(m.confidence),
            fillOpacity: 0.8,
            weight: 1.5,
          }}
          eventHandlers={{
            click: () => onMarkerClick?.(m.id),
          }}
        >
          {m.title && (
            <Tooltip>
              <span className="text-xs">{m.title}</span>
              <br />
              <span className="text-xs text-muted-foreground">
                {formatConfidence(m.confidence)}
              </span>
            </Tooltip>
          )}
        </CircleMarker>
      ))}
    </MapContainer>
  );
}
