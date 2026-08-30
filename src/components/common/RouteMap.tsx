import { useState } from "react";
import {
  Compass,
  ExternalLink,
  Info,
  Layers,
  MapPin,
  Maximize2,
  Navigation,
  Route as RouteIcon,
  Sparkles,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DISTANCE_MATRIX } from "@/data/mockData";
import { LOCATION_COORDINATES, formatDuration } from "@/services";

interface RouteMapProps {
  pickup: string;
  stops: string[];
  batchId: string;
  distanceKm: number;
  etaMinutes: number;
}

export function RouteMap({ pickup, stops, batchId, distanceKm, etaMinutes }: RouteMapProps) {
  const [viewMode, setViewMode] = useState<"corridor" | "osm">("corridor");

  const allWaypoints = [pickup, ...stops];

  // Bounding box calculations for GIS projection
  const coords = allWaypoints.map((name) => {
    const loc = LOCATION_COORDINATES[name] || { lat: 30.0, lng: 76.5, label: name };
    return { name, ...loc };
  });

  const minLat = Math.min(...coords.map((c) => c.lat)) - 0.18;
  const maxLat = Math.max(...coords.map((c) => c.lat)) + 0.18;
  const minLng = Math.min(...coords.map((c) => c.lng)) - 0.25;
  const maxLng = Math.max(...coords.map((c) => c.lng)) + 0.25;

  // Transform coordinates to SVG viewBox (820x440)
  const mapWidth = 820;
  const mapHeight = 440;
  const padding = 65;

  const project = (lat: number, lng: number) => {
    const x = padding + ((lng - minLng) / (maxLng - minLng)) * (mapWidth - 2 * padding);
    // Invert Y because SVG coordinates increase downwards
    const y = padding + ((maxLat - lat) / (maxLat - minLat)) * (mapHeight - 2 * padding);
    return { x, y };
  };

  const points = coords.map((c) => ({
    name: c.name,
    label: c.label,
    lat: c.lat,
    lng: c.lng,
    ...project(c.lat, c.lng),
  }));

  // Build SVG path data
  const pathD = points.reduce((acc, p, idx) => {
    return idx === 0 ? `M ${p.x} ${p.y}` : `${acc} L ${p.x} ${p.y}`;
  }, "");

  // OpenStreetMap live directions URL
  const osmRouteQuery = coords.map((c) => `${c.lat}%2C${c.lng}`).join("%3B");
  const osmUrl = `https://www.openstreetmap.org/directions?engine=fossgis_osrm_car&route=${osmRouteQuery}`;

  // Center coordinate for interactive map view
  const centerLat = (minLat + maxLat) / 2;
  const centerLng = (minLng + maxLng) / 2;
  const osmEmbedUrl = `https://www.openstreetmap.org/export/embed.html?bbox=${minLng}%2C${minLat}%2C${maxLng}%2C${maxLat}&layer=mapnik&marker=${points[0]?.lat}%2C${points[0]?.lng}`;

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
      {/* Map Header */}
      <div className="flex flex-col gap-3 border-b border-border bg-slate-50/90 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2.5">
          <span className="grid size-9 place-items-center rounded-lg bg-primary/10 text-primary">
            <RouteIcon className="size-4.5" />
          </span>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-foreground text-base">Multi-Stop Route Map & GIS Visualizer</h3>
              <Badge variant="secondary" className="text-[10px] font-mono">
                {batchId}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground">
              Optimized route corridor — prototype visualization ({pickup} → {stops.join(" → ")})
            </p>
          </div>
        </div>

        {/* View mode switcher & OSM link */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex rounded-lg border border-border bg-white p-0.5 text-xs font-medium shadow-2xs">
            <button
              type="button"
              onClick={() => setViewMode("corridor")}
              className={`rounded-md px-2.5 py-1 transition-colors ${
                viewMode === "corridor"
                  ? "bg-primary text-white shadow-2xs font-semibold"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Corridor Visualizer
            </button>
            <button
              type="button"
              onClick={() => setViewMode("osm")}
              className={`rounded-md px-2.5 py-1 transition-colors ${
                viewMode === "osm"
                  ? "bg-primary text-white shadow-2xs font-semibold"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Interactive Map
            </button>
          </div>

          <Badge variant="outline" className="text-xs font-mono bg-white hidden md:inline-flex">
            {distanceKm} km • {formatDuration(etaMinutes)}
          </Badge>

          <a
            href={osmUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 rounded-md border border-border bg-white px-2.5 py-1.5 text-xs font-medium text-foreground hover:bg-slate-50 transition-colors shadow-2xs"
          >
            <ExternalLink className="size-3 text-muted-foreground" />
            Open in OpenStreetMap
          </a>
        </div>
      </div>

      {/* Main Map View Area */}
      {viewMode === "corridor" ? (
        <div className="relative w-full bg-slate-950 overflow-hidden select-none">
          {/* Subtle regional coordinate grid */}
          <div
            className="absolute inset-0 opacity-20 pointer-events-none"
            style={{
              backgroundImage: "radial-gradient(#94a3b8 1px, transparent 1px)",
              backgroundSize: "28px 28px",
            }}
          />

          {/* Map Legend Overlay */}
          <div className="absolute top-3 left-3 z-10 rounded-lg bg-slate-900/90 p-3 backdrop-blur border border-slate-800 text-slate-200 text-xs space-y-1.5 shadow-md">
            <div className="flex items-center gap-2">
              <span className="size-3 rounded-full bg-emerald-500 ring-2 ring-emerald-300/40" />
              <span className="font-medium text-emerald-300">Pickup Base Mandi (Patiala)</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="size-3 rounded-full bg-sky-400 ring-2 ring-sky-300/40" />
              <span>Consolidated Delivery Stops</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="h-0.5 w-4 bg-amber-400" />
              <span>NH-7 / NH-44 Transit Highway</span>
            </div>
          </div>

          {/* Top Right Distance / ETA Callout */}
          <div className="absolute top-3 right-3 z-10 hidden sm:flex items-center gap-2 rounded-lg bg-slate-900/90 px-3 py-2 backdrop-blur border border-slate-800 text-xs text-slate-200">
            <span className="text-slate-400">Total Distance:</span>
            <strong className="text-white font-mono">{distanceKm} km</strong>
            <span className="text-slate-600">|</span>
            <span className="text-slate-400">Est. Transit:</span>
            <strong className="text-amber-400 font-mono">{formatDuration(etaMinutes)}</strong>
          </div>

          {/* Dynamic Route SVG */}
          <svg
            viewBox={`0 0 ${mapWidth} ${mapHeight}`}
            className="w-full h-auto max-h-[460px] min-h-[340px]"
            preserveAspectRatio="xMidYMid meet"
          >
            <defs>
              <linearGradient id="routeGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#10b981" />
                <stop offset="50%" stopColor="#38bdf8" />
                <stop offset="100%" stopColor="#f59e0b" />
              </linearGradient>
              <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="3.5" result="blur" />
                <feComposite in="SourceGraphic" in2="blur" operator="over" />
              </filter>
            </defs>

            {/* Background route ambient glow */}
            <path
              d={pathD}
              fill="none"
              stroke="rgba(56, 189, 248, 0.2)"
              strokeWidth="14"
              strokeLinecap="round"
              strokeLinejoin="round"
            />

            {/* Highway Corridor Line */}
            <path
              d={pathD}
              fill="none"
              stroke="url(#routeGradient)"
              strokeWidth="4.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              filter="url(#glow)"
              strokeDasharray="9 4"
            />

            {/* Leg distance callout pills */}
            {points.map((p, idx) => {
              if (idx === points.length - 1) return null;
              const next = points[idx + 1];
              const midX = (p.x + next.x) / 2;
              const midY = (p.y + next.y) / 2 - 12;
              const legKm = DISTANCE_MATRIX[p.name]?.[next.name] ?? 60;

              return (
                <g key={`leg-${idx}`}>
                  <rect
                    x={midX - 42}
                    y={midY - 12}
                    width="84"
                    height="24"
                    rx="6"
                    fill="#0f172a"
                    stroke="#334155"
                    strokeWidth="1.2"
                  />
                  <text
                    x={midX}
                    y={midY + 4}
                    textAnchor="middle"
                    fill="#f1f5f9"
                    fontSize="10"
                    fontWeight="600"
                  >
                    Leg {idx + 1}: {legKm} km
                  </text>
                </g>
              );
            })}

            {/* Waypoint nodes */}
            {points.map((p, idx) => {
              const isPickup = idx === 0;
              const isLast = idx === points.length - 1;

              return (
                <g key={p.name} className="cursor-pointer transition-transform hover:scale-110">
                  {/* Pulse ring for active location */}
                  <circle
                    cx={p.x}
                    cy={p.y}
                    r={isPickup ? "20" : "15"}
                    fill={isPickup ? "rgba(16, 185, 129, 0.25)" : "rgba(56, 189, 248, 0.2)"}
                  />

                  {/* Node pin circle */}
                  <circle
                    cx={p.x}
                    cy={p.y}
                    r={isPickup ? "13" : "11"}
                    fill={isPickup ? "#10b981" : isLast ? "#f59e0b" : "#38bdf8"}
                    stroke="#ffffff"
                    strokeWidth="2.5"
                  />

                  {/* Node label/number */}
                  <text
                    x={p.x}
                    y={p.y + 4}
                    textAnchor="middle"
                    fill="#ffffff"
                    fontSize={isPickup ? "11" : "10"}
                    fontWeight="bold"
                  >
                    {isPickup ? "★" : idx}
                  </text>

                  {/* City name banner */}
                  <g transform={`translate(${p.x}, ${p.y + (p.y > mapHeight - 60 ? -32 : 28)})`}>
                    <rect
                      x="-65"
                      y="-11"
                      width="130"
                      height="22"
                      rx="6"
                      fill="rgba(15, 23, 42, 0.92)"
                      stroke={isPickup ? "#10b981" : isLast ? "#f59e0b" : "#475569"}
                      strokeWidth="1.2"
                    />
                    <text
                      x="0"
                      y="4"
                      textAnchor="middle"
                      fill="#f8fafc"
                      fontSize="10.5"
                      fontWeight="600"
                    >
                      {p.name} {isPickup ? "(Base)" : isLast ? "(End)" : `#${idx}`}
                    </text>
                  </g>
                </g>
              );
            })}
          </svg>

          {/* GIS Attribution & Notice */}
          <div className="absolute bottom-2 right-3 z-10 text-[10px] text-slate-400 bg-slate-900/80 px-2.5 py-1 rounded-md border border-slate-800 backdrop-blur flex items-center gap-1.5">
            <Info className="size-3 text-slate-400" />
            <span>Optimized route corridor — prototype visualization | Base map © OpenStreetMap</span>
          </div>
        </div>
      ) : (
        /* OpenStreetMap Free Interactive Tile Embed */
        <div className="relative w-full h-[400px] bg-slate-100">
          <iframe
            title="OpenStreetMap Route Area"
            width="100%"
            height="100%"
            className="border-0"
            src={osmEmbedUrl}
          />
          <div className="absolute bottom-2 left-3 z-10 rounded-md bg-white/95 px-3 py-1.5 text-xs text-foreground shadow-md border border-border">
            <span className="font-semibold">Punjab & Haryana Corridor:</span> Patiala → Chandigarh → Ambala → Kurukshetra
          </div>
        </div>
      )}

      {/* Sequential Stop Timeline Bar */}
      <div className="bg-slate-50 p-4 border-t border-border">
        <div className="flex items-center justify-between text-xs font-semibold text-muted-foreground uppercase mb-3">
          <span>Sequential Dispatch Itinerary</span>
          <span className="text-primary font-bold">{distanceKm} km Cumulative · {formatDuration(etaMinutes)} Estimated Transit</span>
        </div>

        <div className="grid gap-3 sm:grid-cols-4">
          {points.map((p, idx) => (
            <div
              key={p.name}
              className="flex items-center gap-3 rounded-lg border border-border bg-white p-3 shadow-xs"
            >
              <div
                className={`flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white ${
                  idx === 0 ? "bg-emerald-600" : idx === points.length - 1 ? "bg-amber-600" : "bg-sky-600"
                }`}
              >
                {idx === 0 ? "★" : idx}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-foreground">{p.name}</p>
                <p className="text-[11px] text-muted-foreground">
                  {idx === 0 ? "Pickup Mandi Base" : idx === points.length - 1 ? `Final Delivery Stop #${idx}` : `Delivery Stop #${idx}`}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

