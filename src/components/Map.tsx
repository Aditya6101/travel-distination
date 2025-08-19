"use client";

import { useEffect, useRef, useState } from "react";
import { MapContainer, Marker, Popup, TileLayer } from "react-leaflet";
import type { Marker as LeafletMarker } from "leaflet";
import L from "leaflet";

const positionA: [number, number] = [18.5, 73.86];

const Map = () => {
  const ref1 = useRef<LeafletMarker | null>(null);
  const [userPosition, setUserPosition] = useState<[number, number] | null>(
    null
  );
  const [distanceMeters, setDistanceMeters] = useState<number | null>(null);
  const [geoError, setGeoError] = useState<string | null>(null);

  // Subscribe to geolocation updates
  useEffect(() => {
    if (!("geolocation" in navigator)) {
      setGeoError("Geolocation is not supported by this browser.");
      return;
    }

    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        console.log({ pos });

        const { latitude, longitude } = pos.coords;
        alert(`latitude: ${latitude}, longitude: ${longitude}`);
        setUserPosition([latitude, longitude]);
        setGeoError(null);
      },
      (err) => {
        setGeoError(err.message || "Failed to retrieve position");
      },
      { enableHighAccuracy: true, maximumAge: 1000, timeout: 10000 }
    );

    return () => navigator.geolocation.clearWatch(watchId);
  }, []);

  // Recalculate distance whenever the user's position changes
  useEffect(() => {
    if (!userPosition) return;
    const a = L.latLng(positionA[0], positionA[1]);
    const b = L.latLng(userPosition[0], userPosition[1]);
    setDistanceMeters(a.distanceTo(b));
  }, [userPosition]);

  return (
    <>
      {geoError && <div className="mb-3 text-red-600">{geoError}</div>}

      <MapContainer
        center={positionA}
        zoom={13}
        scrollWheelZoom={false}
        style={{ height: "500px", width: "100%" }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <Marker position={positionA} ref={ref1}>
          <Popup>Marker A (fixed)</Popup>
        </Marker>
        {userPosition && (
          <Marker position={userPosition}>
            <Popup>Marker B (your live position)</Popup>
          </Marker>
        )}
      </MapContainer>
      <div className="mt-2">
        Distance:{" "}
        {userPosition && distanceMeters !== null
          ? `${(distanceMeters / 1000).toFixed(2)} km`
          : "waiting for location..."}
      </div>
    </>
  );
};

export default Map;
