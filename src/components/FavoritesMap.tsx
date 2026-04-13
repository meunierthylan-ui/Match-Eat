"use client";

import { MapContainer, Marker, Popup, TileLayer } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import type { RestaurantRow } from "@/types/database.types";

const icon = L.icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

export default function FavoritesMap({
  restaurants,
  onOpenDrawer,
}: {
  restaurants: RestaurantRow[];
  onOpenDrawer: (restaurant: RestaurantRow) => void;
}) {
  const withCoords = restaurants
    .map((r) => ({ ...r, lat: Number(r.latitude), lng: Number(r.longitude) }))
    .filter((r) => r.lat && r.lng && !Number.isNaN(r.lat) && !Number.isNaN(r.lng));

  if (withCoords.length === 0) return null;

  return (
    <div className="mb-3 h-64 w-full overflow-hidden rounded-2xl border border-white/10">
      <MapContainer
        center={[48.8566, 2.3522]}
        zoom={13}
        style={{ width: "100%", height: "100%" }}
      >
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        {withCoords.map((r) => (
          <Marker
            key={r.id}
            position={[r.lat, r.lng]}
            icon={icon}
            eventHandlers={{ click: () => onOpenDrawer(r) }}
          >
            <Popup>{r.name}</Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}
