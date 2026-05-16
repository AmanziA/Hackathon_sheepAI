"use client";

import { useEffect, useRef, useState } from "react";
import {
  MapContainer,
  TileLayer,
  CircleMarker,
  Marker,
  Tooltip,
  Polyline,
  useMap,
} from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

const addressIcon = L.divIcon({
  className: "lookup-address-pin",
  html: `
    <span style="position:relative;display:inline-flex;align-items:center;justify-content:center;">
      <span style="
        position:absolute;width:34px;height:34px;border-radius:50%;
        background:rgba(37,99,235,0.18);
        animation:lookup-pulse 1.8s cubic-bezier(0.66,0,0,1) infinite;
      "></span>
      <span style="
        position:relative;display:flex;align-items:center;justify-content:center;
        width:18px;height:18px;border-radius:50%;
        background:#2563eb;color:white;
        box-shadow:0 0 0 3px rgba(255,255,255,0.95), 0 4px 10px rgba(0,0,0,0.25);
        border:0;
      "></span>
    </span>
    <style>
      @keyframes lookup-pulse {
        0%   { transform: scale(0.5); opacity: 1; }
        100% { transform: scale(1.4); opacity: 0; }
      }
    </style>`,
  iconSize: [34, 34],
  iconAnchor: [17, 17],
});

interface FlaggedPoint {
  id: string;
  lat: number;
  lon: number;
  title: string;
  distance_m: number;
}

interface RegisteredPoint {
  id: string;
  lat: number;
  lon: number;
  name: string;
  distance_m: number;
}

interface Props {
  searched: { lat: number; lon: number; address: string };
  flagged: FlaggedPoint[];
  registered: RegisteredPoint[];
  osm?: { osm_type: string; osm_id: number } | null;
  className?: string;
}

function Recenter({ lat, lon }: { lat: number; lon: number }) {
  const map = useMap();
  useEffect(() => {
    map.setView([lat, lon], 16, { animate: true });
  }, [lat, lon, map]);
  return null;
}

export function LookupMap({ searched, flagged, registered, osm, className }: Props) {
  const [streetGeometry, setStreetGeometry] = useState<[number, number][] | null>(null);
  const lastFetched = useRef<string | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Hard cleanup: in dev StrictMode / HMR, react-leaflet's MapContainer will
  // double-mount onto the same DOM node and throw "Map container is being
  // reused". Explicitly tearing down the Leaflet instance on unmount and
  // scrubbing the container's leaflet metadata prevents the next mount from
  // seeing a tainted node.
  useEffect(() => {
    return () => {
      const map = mapRef.current;
      if (map) {
        try {
          map.remove();
        } catch {
          // ignore
        }
        mapRef.current = null;
      }
      const node = containerRef.current;
      if (node) {
        // Leaflet stores its instance pointer on the DOM node as _leaflet_id
        // and the container element; clearing both lets a remount succeed.
        const el = node.querySelector(".leaflet-container") as HTMLElement | null;
        const target = el ?? node;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (target as any)._leaflet_id = undefined;
      }
    };
  }, []);

  useEffect(() => {
    if (!osm || (osm.osm_type !== "way" && osm.osm_type !== "relation")) {
      setStreetGeometry(null);
      return;
    }
    const key = `${osm.osm_type}-${osm.osm_id}`;
    if (lastFetched.current === key) return;
    lastFetched.current = key;

    const ctrl = new AbortController();
    (async () => {
      try {
        const query =
          osm.osm_type === "way"
            ? `[out:json][timeout:8];way(${osm.osm_id});(._;>;);out;`
            : `[out:json][timeout:8];relation(${osm.osm_id});(._;>;);out;`;
        const res = await fetch("https://overpass-api.de/api/interpreter", {
          method: "POST",
          body: "data=" + encodeURIComponent(query),
          signal: ctrl.signal,
        });
        if (!res.ok) throw new Error("overpass");
        const data = (await res.json()) as {
          elements: Array<
            | { type: "node"; id: number; lat: number; lon: number }
            | { type: "way"; id: number; nodes: number[] }
            | { type: "relation"; id: number }
          >;
        };
        const nodes = new Map<number, [number, number]>();
        for (const el of data.elements) {
          if (el.type === "node") nodes.set(el.id, [el.lat, el.lon]);
        }
        const ways = data.elements.filter(
          (e): e is { type: "way"; id: number; nodes: number[] } => e.type === "way"
        );
        if (ways.length === 0) {
          setStreetGeometry(null);
          return;
        }
        // Concatenate all ways into a single highlight set; pick the longest if relation
        const merged: [number, number][] = [];
        for (const w of ways) {
          const coords = w.nodes
            .map((n) => nodes.get(n))
            .filter((c): c is [number, number] => !!c);
          if (coords.length > 1) merged.push(...coords);
        }
        setStreetGeometry(merged.length > 1 ? merged : null);
      } catch {
        setStreetGeometry(null);
      }
    })();

    return () => ctrl.abort();
  }, [osm]);

  return (
    <div
      ref={containerRef}
      className={className ?? "h-[460px] w-full rounded-lg border overflow-hidden relative"}
    >
      <MapContainer
        ref={(m) => {
          mapRef.current = m ?? null;
        }}
        center={[searched.lat, searched.lon]}
        zoom={16}
        scrollWheelZoom
        style={{ height: "100%", width: "100%" }}
      >
        <TileLayer
          attribution='&copy; <a href="https://stadiamaps.com/">Stadia Maps</a> &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url={`https://tiles.stadiamaps.com/tiles/alidade_smooth/{z}/{x}/{y}{r}.png?api_key=${process.env.NEXT_PUBLIC_STADIA_KEY ?? ""}`}
          maxZoom={20}
          // @ts-expect-error retina detection — leaflet maps {r} to "" or "@2x"
          detectRetina
        />
        <Recenter lat={searched.lat} lon={searched.lon} />

        {streetGeometry && (
          <>
            <Polyline
              positions={streetGeometry}
              pathOptions={{ color: "#2563eb", weight: 10, opacity: 0.18 }}
            />
            <Polyline
              positions={streetGeometry}
              pathOptions={{ color: "#2563eb", weight: 4, opacity: 0.95 }}
            />
          </>
        )}

        {registered.map((r) => (
          <CircleMarker
            key={r.id}
            center={[r.lat, r.lon]}
            radius={8}
            pathOptions={{ color: "#16a34a", fillColor: "#16a34a", fillOpacity: 0.85, weight: 2 }}
          >
            <Tooltip>
              <strong>{r.name}</strong>
              <br />
              {r.distance_m}m · registriran
            </Tooltip>
          </CircleMarker>
        ))}

        {flagged.map((f) => (
          <CircleMarker
            key={f.id}
            center={[f.lat, f.lon]}
            radius={9}
            pathOptions={{ color: "#dc2626", fillColor: "#dc2626", fillOpacity: 0.85, weight: 2 }}
          >
            <Tooltip>
              <strong>{f.title}</strong>
              <br />
              {f.distance_m}m
            </Tooltip>
          </CircleMarker>
        ))}

        <Marker position={[searched.lat, searched.lon]} icon={addressIcon}>
          <Tooltip permanent direction="top" offset={[0, -18]} opacity={0.95}>
            {searched.address}
          </Tooltip>
        </Marker>
      </MapContainer>

      <div className="absolute top-3 left-3 z-[400] bg-background/90 backdrop-blur border rounded-md px-2.5 py-1.5 text-[11px] space-y-1 shadow">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-blue-600 border border-white shadow-sm" />
          <span className="text-muted-foreground">Vaša adresa{streetGeometry ? " + ulica" : ""}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-red-600 border border-white shadow-sm" />
          <span className="text-muted-foreground">Sumnjivi oglas</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-green-600 border border-white shadow-sm" />
          <span className="text-muted-foreground">Registrirani</span>
        </div>
      </div>
    </div>
  );
}
