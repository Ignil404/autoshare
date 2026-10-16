import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { CarOut } from "@/lib/api-types";
import { apiErrorMessage } from "@/lib/format";
import { useWebSocket } from "@/hooks/use-websocket";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { MapPin, Car as CarIcon, Layers, ExternalLink } from "lucide-react";
import { useEffect, useRef, useState } from "react";

export const Route = createFileRoute("/client/zones")({
  validateSearch: (search: Record<string, unknown>): { lat?: number; lng?: number } => ({
    lat: search.lat ? Number(search.lat) : undefined,
    lng: search.lng ? Number(search.lng) : undefined,
  }),
  component: ClientZones,
});

interface Zone {
  zone_id: number;
  name: string;
  zone_type: string;
  boundary: string;
  status: string;
}

function parseWKT(wkt: string): [number, number][] | null {
  const match = wkt.match(/POLYGON\(\(([^)]+)\)/);
  if (!match) return null;
  return match[1].split(",").map((pair) => {
    const [lng, lat] = pair.trim().split(/\s+/).map(Number);
    return [lat, lng] as [number, number];
  });
}

const ZONE_COLORS = ["#22c55e", "#3b82f6", "#f59e0b", "#ef4444", "#8b5cf6"];
const STATUS_CAR_COLORS: Record<string, string> = {
  FREE: "#22c55e", BOOKED: "#3b82f6", RENTED: "#f59e0b", MAINTENANCE: "#ef4444", UNAVAILABLE: "#6b7280",
};
const STATUS_LABELS: Record<string, string> = {
  FREE: "Свободна", BOOKED: "Забронирована", RENTED: "В аренде", MAINTENANCE: "ТО", UNAVAILABLE: "Недоступна",
};

function ClientZones() {
  const { lat, lng } = Route.useSearch();
  const zonesQ = useQuery({ queryKey: ["zones"], queryFn: () => api.get<Zone[]>("/api/v1/tariffs/zones") });
  const carsQ = useQuery({ queryKey: ["all-cars"], queryFn: () => api.get<CarOut[]>("/api/v1/cars/") });
  const qc = useQueryClient();

  useWebSocket((msg) => {
    if (msg.type === "car_status_changed") {
      qc.invalidateQueries({ queryKey: ["all-cars"] });
    }
  });
  const navigate = useNavigate();
  const mapRef = useRef<HTMLDivElement>(null);
  const [mapReady, setMapReady] = useState(false);

  useEffect(() => {
    if (!mapRef.current || mapReady || !zonesQ.data) return;

    const loadMap = async () => {
      const L = await import("leaflet");
      await import("leaflet/dist/leaflet.css");

      const map = L.map(mapRef.current!).setView([53.9, 27.56], 12);
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "© OpenStreetMap",
      }).addTo(map);

      (zonesQ.data ?? []).forEach((z, i) => {
        const coords = parseWKT(z.boundary);
        if (!coords) return;
        const color = ZONE_COLORS[i % ZONE_COLORS.length];
        L.polygon(coords, { color, fillColor: color, fillOpacity: 0.15, weight: 2 })
          .addTo(map)
          .bindPopup(`<b>${z.name}</b><br/>${z.zone_type}<br/>Статус: ${z.status}`);
      });

      (carsQ.data ?? []).forEach((c) => {
        if (!c.lat || !c.lng) return;
        const color = STATUS_CAR_COLORS[c.status] ?? "#6b7280";
        const icon = L.divIcon({
          className: "custom-car-marker",
          html: `<div style="background:${color};width:28px;height:28px;border-radius:50%;display:flex;align-items:center;justify-content:center;border:2px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.3);cursor:pointer;">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="white" stroke="white" stroke-width="2"><path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9A3.7 3.7 0 0 0 2 12v4c0 .6.4 1 1 1h2"/><circle cx="7" cy="17" r="2"/><path d="M9 17h6"/><circle cx="17" cy="17" r="2"/></svg>
          </div>`,
          iconSize: [28, 28],
          iconAnchor: [14, 14],
        });
        const marker = L.marker([c.lat, c.lng], { icon }).addTo(map);
        marker.bindPopup(`
          <div style="min-width:140px">
            <b>${c.brand} ${c.model}</b><br/>
            <span style="font-family:monospace">${c.plate_number}</span> · ${c.year}<br/>
            <span style="color:${color};font-weight:600">${STATUS_LABELS[c.status] ?? c.status}</span>
            <div style="margin-top:6px">
              <a href="/client/cars?car_id=${c.car_id}" onclick="event.preventDefault();window.__navigateToCar(${c.car_id})" style="color:#22c55e;font-weight:500;text-decoration:underline;cursor:pointer">
                Забронировать →
              </a>
            </div>
          </div>
        `);
      });

      const allCoords = [
        ...(zonesQ.data ?? []).flatMap((z) => parseWKT(z.boundary) ?? []),
        ...(carsQ.data ?? []).filter((c) => c.lat && c.lng).map((c) => [c.lat!, c.lng!] as [number, number]),
      ];
      if (lat && lng) {
        map.setView([lat, lng], 15);
      } else if (allCoords.length) {
        map.fitBounds(allCoords, { padding: [30, 30] });
      }
      setMapReady(true);
    };
    loadMap();
  }, [zonesQ.data, carsQ.data, mapReady]);

  useEffect(() => {
    (window as any).__navigateToCar = (carId: number) => {
      navigate({ to: "/client/cars", search: { car_id: carId } });
    };
    return () => { delete (window as any).__navigateToCar; };
  }, [navigate]);

  return (
    <div className="space-y-5 page-enter">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Карта и зоны</h1>
          <p className="text-sm text-muted-foreground mt-1">Интерактивная карта зон и расположения автомобилей.</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => navigate({ to: "/client/cars" })}>
          <CarIcon className="h-4 w-4 mr-1.5" /> К списку машин
        </Button>
      </div>

      <div className="rounded-2xl border overflow-hidden bg-card">
        {(zonesQ.isLoading || carsQ.isLoading) ? (
          <Skeleton className="h-[500px] w-full" />
        ) : zonesQ.error || carsQ.error ? (
          <CardContent className="py-10 text-center text-destructive">{apiErrorMessage(zonesQ.error || carsQ.error)}</CardContent>
        ) : (
          <>
            <div ref={mapRef} className="h-[500px] w-full z-0" />
            <div className="p-4 border-t space-y-3">
              <div className="flex items-center gap-2"><Layers className="h-4 w-4 text-muted-foreground" /><span className="text-sm font-medium">Легенда</span></div>
              <div className="flex flex-wrap gap-3">
                <div className="text-xs text-muted-foreground font-medium">Зоны:</div>
                {(zonesQ.data ?? []).map((z, i) => (
                  <div key={z.zone_id} className="flex items-center gap-1.5 text-xs">
                    <span className="h-3 w-3 rounded-full border" style={{ backgroundColor: ZONE_COLORS[i % ZONE_COLORS.length] + "40", borderColor: ZONE_COLORS[i % ZONE_COLORS.length] }} />
                    <span>{z.name}</span>
                  </div>
                ))}
              </div>
              <div className="flex flex-wrap gap-3">
                <div className="text-xs text-muted-foreground font-medium">Машины:</div>
                {Object.entries(STATUS_CAR_COLORS).map(([status, color]) => (
                  <div key={status} className="flex items-center gap-1.5 text-xs">
                    <span className="h-3 w-3 rounded-full" style={{ backgroundColor: color }} />
                    <span>{STATUS_LABELS[status] ?? status}</span>
                  </div>
                ))}
              </div>
              <div className="text-xs text-muted-foreground">Всего машин на карте: {(carsQ.data ?? []).filter((c) => c.lat && c.lng).length}</div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
