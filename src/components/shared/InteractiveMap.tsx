"use client";

import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "./InteractiveMap.css";

// Fix for default marker icon in Leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

interface InteractiveMapProps {
  center: { lat: number; lng: number };
  onMarkerDrag: (lat: number, lng: number) => void;
}

export default function InteractiveMap({ center, onMarkerDrag }: InteractiveMapProps) {
  const mapRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    // Initialize map only once
    if (!mapRef.current) {
      mapRef.current = L.map(containerRef.current, {
        center: [center.lat, center.lng],
        zoom: 13,
        zoomControl: true,
      });

      // Add OpenStreetMap tiles
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 19,
      }).addTo(mapRef.current);

      // Create custom purple marker icon
      const purpleIcon = L.divIcon({
        className: "custom-marker",
        html: `
          <div style="position: relative; width: 32px; height: 32px;">
            <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#a855f7" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/>
              <circle cx="12" cy="10" r="3" fill="#a855f7"/>
            </svg>
          </div>
        `,
        iconSize: [32, 32],
        iconAnchor: [16, 32],
      });

      // Add draggable marker
      markerRef.current = L.marker([center.lat, center.lng], {
        draggable: true,
        icon: purpleIcon,
      }).addTo(mapRef.current);

      // Handle marker drag
      markerRef.current.on("dragend", () => {
        if (markerRef.current) {
          const position = markerRef.current.getLatLng();
          onMarkerDrag(position.lat, position.lng);
        }
      });
    } else {
      // Update map center and marker position when center prop changes
      mapRef.current.setView([center.lat, center.lng], 15);
      if (markerRef.current) {
        markerRef.current.setLatLng([center.lat, center.lng]);
      }
    }

    // Cleanup
    return () => {
      // Don't destroy the map on every render, only on unmount
    };
  }, [center, onMarkerDrag]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className="w-full h-80 rounded-xl overflow-hidden border border-white/10 bg-[#1a0a2e]"
      style={{ zIndex: 0 }}
    />
  );
}
