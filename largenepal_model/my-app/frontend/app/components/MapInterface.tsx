// This component is responsible for rendering the Leaflet map, handling user location tracking, toggling between street and satellite views, and flying to search results. It uses React hooks to manage the map lifecycle and updates based on props changes.
// my-app/frontend/app/components/MapInterface.tsx
"use client";
import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

interface MapInterfaceProps {
  isSatellite: boolean;
  searchResult: { lat: number, lon: number, name: string } | null;
  onLocationReady: (latlng: L.LatLng) => void;
}

export default function MapInterface({ isSatellite, searchResult, onLocationReady }: MapInterfaceProps) {
  const mapRef = useRef<L.Map | null>(null);
  const streetLayer = useRef<L.TileLayer>(L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", { noWrap: true, keepBuffer: 8 }));
  const satelliteLayer = useRef<L.TileLayer>(L.tileLayer("https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}", { noWrap: true, keepBuffer: 8 }));
  const userMarker = useRef<L.CircleMarker | null>(null);

  useEffect(() => {
    const map = L.map("map", { center: [27.669, 85.324], zoom: 16, zoomControl: false, minZoom: 3 });
    mapRef.current = map;
    streetLayer.current.addTo(map);

    map.locate({ watch: true, enableHighAccuracy: true });
    map.on("locationfound", (e) => {
      onLocationReady(e.latlng);
      if (!userMarker.current) {
        userMarker.current = L.circleMarker(e.latlng, { radius: 8, fillColor: "#4285F4", color: "white", weight: 2, fillOpacity: 1 }).addTo(map);
      } else {
        userMarker.current.setLatLng(e.latlng);
      }
    });

    return () => { map.remove(); };
  }, []);

  // Handle Satellite Toggle
  useEffect(() => {
    if (!mapRef.current) return;
    if (isSatellite) {
      mapRef.current.removeLayer(streetLayer.current);
      satelliteLayer.current.addTo(mapRef.current);
    } else {
      mapRef.current.removeLayer(satelliteLayer.current);
      streetLayer.current.addTo(mapRef.current);
    }
  }, [isSatellite]);

  // Handle Search Flying
  useEffect(() => {
    if (searchResult && mapRef.current) {
      const target = L.latLng(searchResult.lat, searchResult.lon);
      mapRef.current.flyTo(target, 16, { duration: 1.5 });
      L.marker(target).addTo(mapRef.current).bindPopup(searchResult.name).openPopup();
    }
  }, [searchResult]);

  return <div id="map" style={{ height: "100%", width: "100%", filter: "saturate(1.2)" }} />;
}