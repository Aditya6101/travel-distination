"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import {
  MapContainer,
  Marker,
  Popup,
  TileLayer,
  Circle,
  useMapEvents,
} from "react-leaflet";
import type { Marker as LeafletMarker } from "leaflet";
import L from "leaflet";

// Custom icons
const createCustomIcon = (color: string, iconType: "user" | "destination") => {
  const iconSize = iconType === "user" ? [32, 32] : [24, 24];
  const iconAnchor = iconType === "user" ? [16, 32] : [12, 24];

  return L.divIcon({
    className: "custom-marker",
    html: `
      <div style="
        width: ${iconSize[0]}px;
        height: ${iconSize[1]}px;
        background: ${color};
        border: 3px solid white;
        border-radius: 50%;
        box-shadow: 0 2px 8px rgba(0,0,0,0.3);
        display: flex;
        align-items: center;
        justify-content: center;
        color: white;
        font-weight: bold;
        font-size: ${iconType === "user" ? "14px" : "12px"};
      ">
        ${iconType === "user" ? "📍" : "🎯"}
      </div>
    `,
    iconSize: iconSize as [number, number],
    iconAnchor: iconAnchor as [number, number],
  });
};

// Map click handler component
const MapClickHandler = ({
  onMapClick,
}: {
  onMapClick: (lat: number, lng: number) => void;
}) => {
  useMapEvents({
    click: (e) => {
      onMapClick(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
};

const Map = () => {
  const ref1 = useRef<LeafletMarker | null>(null);
  const [userPosition, setUserPosition] = useState<[number, number] | null>(
    null
  );
  const [destinationPosition, setDestinationPosition] = useState<
    [number, number] | null
  >(null);
  const [distanceMeters, setDistanceMeters] = useState<number | null>(null);
  const [geoError, setGeoError] = useState<string | null>(null);
  const [selectedDistance, setSelectedDistance] = useState<number>(5); // Default 5km
  const [notificationsEnabled, setNotificationsEnabled] =
    useState<boolean>(true);
  const [notificationInterval, setNotificationInterval] =
    useState<NodeJS.Timeout | null>(null);
  const [lastNotificationTime, setLastNotificationTime] = useState<number>(0);
  const [isNearDestination, setIsNearDestination] = useState<boolean>(false);
  const [countdownSeconds, setCountdownSeconds] = useState<number>(0);

  const distanceOptions = [2, 3, 4, 5, 10, 20];

  // Request notification permission
  useEffect(() => {
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission();
    }
  }, []);

  // Subscribe to geolocation updates
  useEffect(() => {
    if (!("geolocation" in navigator)) {
      setGeoError("Geolocation is not supported by this browser.");
      return;
    }

    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
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

  // Calculate distance and handle notifications
  useEffect(() => {
    if (!userPosition || !destinationPosition) return;

    const user = L.latLng(userPosition[0], userPosition[1]);
    const destination = L.latLng(
      destinationPosition[0],
      destinationPosition[1]
    );
    const distance = user.distanceTo(destination);
    setDistanceMeters(distance);

    const isNear = distance <= selectedDistance * 1000;
    setIsNearDestination(isNear);

    // Handle notifications
    if (notificationsEnabled && isNear) {
      const now = Date.now();
      const timeSinceLastNotification = now - lastNotificationTime;
      const notificationInterval = isNear ? 30000 : 60000; // 30s if near, 1min if far

      if (timeSinceLastNotification >= notificationInterval) {
        sendNotification();
        setLastNotificationTime(now);
      }
    }
  }, [
    userPosition,
    destinationPosition,
    selectedDistance,
    notificationsEnabled,
    lastNotificationTime,
  ]);

  // Set up notification interval
  useEffect(() => {
    if (!notificationsEnabled || !destinationPosition) {
      if (notificationInterval) {
        clearInterval(notificationInterval);
        setNotificationInterval(null);
      }
      return;
    }

    const interval = setInterval(() => {
      if (userPosition && destinationPosition) {
        const user = L.latLng(userPosition[0], userPosition[1]);
        const destination = L.latLng(
          destinationPosition[0],
          destinationPosition[1]
        );
        const distance = user.distanceTo(destination);

        if (distance <= selectedDistance * 1000) {
          sendNotification();
          setLastNotificationTime(Date.now());
        }
      }
    }, 30000); // Check every 30 seconds

    setNotificationInterval(interval);

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [
    notificationsEnabled,
    destinationPosition,
    userPosition,
    selectedDistance,
  ]);

  // Countdown timer effect
  useEffect(() => {
    if (lastNotificationTime > Date.now()) {
      const interval = setInterval(() => {
        const remaining = Math.ceil((lastNotificationTime - Date.now()) / 1000);
        if (remaining > 0) {
          setCountdownSeconds(remaining);
        } else {
          setCountdownSeconds(0);
        }
      }, 1000);

      return () => clearInterval(interval);
    } else {
      setCountdownSeconds(0);
    }
  }, [lastNotificationTime]);

  const sendNotification = useCallback(() => {
    if ("Notification" in window && Notification.permission === "granted") {
      new Notification("Destination Alert!", {
        body: `You&apos;re approaching your destination! You&apos;re within ${selectedDistance}km.`,
        icon: "/globe.svg",
        tag: "destination-alert",
      });
    }
  }, [selectedDistance]);

  const handleMapClick = useCallback((lat: number, lng: number) => {
    setDestinationPosition([lat, lng]);
  }, []);

  const resetDestination = () => {
    setDestinationPosition(null);
    setDistanceMeters(null);
    setIsNearDestination(false);
    setLastNotificationTime(0);
  };

  const toggleNotifications = () => {
    setNotificationsEnabled(!notificationsEnabled);
  };

  const handleDistanceChange = (distance: number) => {
    setSelectedDistance(distance);
    setLastNotificationTime(0); // Reset notification timer when distance changes
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200 px-4 py-3">
        <h1 className="text-lg font-semibold text-gray-900 text-center">
          🗺️ Travel Destination
        </h1>
      </div>

      <div className="p-4 space-y-4">
        {/* Error Display */}
        {geoError && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3">
            <div className="text-red-800 text-sm font-medium">{geoError}</div>
          </div>
        )}

        {/* Search Section */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <div className="space-y-3">
            {/* Set on Map Button */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">
                Set Destination
              </label>
              <div className="text-xs text-gray-500 mb-3">
                Click anywhere on the map below to set your destination
              </div>
              <button
                onClick={() => {
                  // Scroll to map and show a brief message
                  const mapElement =
                    document.querySelector(".leaflet-container");
                  if (mapElement) {
                    mapElement.scrollIntoView({ behavior: "smooth" });
                  }
                }}
                className="w-full px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium text-sm transition-colors"
              >
                🗺️ Set on Map
              </button>
            </div>

            {/* Distance Threshold */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">
                Distance Threshold
              </label>
              <select
                value={selectedDistance}
                onChange={(e) => handleDistanceChange(Number(e.target.value))}
                className="w-full px-3 py-3 border-2 border-gray-400 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm bg-white text-gray-900"
              >
                {distanceOptions.map((distance) => (
                  <option key={distance} value={distance}>
                    {distance} km
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Control Buttons */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={toggleNotifications}
              className={`px-4 py-3 rounded-lg font-medium text-sm transition-colors ${
                notificationsEnabled
                  ? "bg-green-600 hover:bg-green-700 text-white"
                  : "bg-red-600 hover:bg-red-700 text-white"
              }`}
            >
              {notificationsEnabled ? "🔔 ON" : "🔕 OFF"}
            </button>

            {destinationPosition && (
              <button
                onClick={resetDestination}
                className="px-4 py-3 bg-gray-600 hover:bg-gray-700 text-white rounded-lg font-medium text-sm transition-colors"
              >
                🗑️ Reset
              </button>
            )}
          </div>

          {/* I'm up button - full width */}
          {destinationPosition &&
            notificationsEnabled &&
            countdownSeconds === 0 && (
              <button
                onClick={() => {
                  setLastNotificationTime(Date.now() + 300000);
                }}
                className="w-full mt-3 px-4 py-3 bg-yellow-500 hover:bg-yellow-600 text-white rounded-lg font-medium text-sm transition-colors"
              >
                ⏸️ I&apos;m up (5 min)
              </button>
            )}

          {destinationPosition &&
            notificationsEnabled &&
            countdownSeconds > 0 && (
              <button
                disabled
                className="w-full mt-3 px-4 py-3 bg-yellow-400 text-white rounded-lg font-medium text-sm cursor-not-allowed"
              >
                ⏰ I&apos;m up ({countdownSeconds}s)
              </button>
            )}
        </div>

        {/* Status Information */}
        {destinationPosition && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 space-y-3">
            <div className="text-sm text-gray-600">
              <span className="font-medium">Destination:</span>{" "}
              {destinationPosition[0].toFixed(4)},{" "}
              {destinationPosition[1].toFixed(4)}
            </div>

            {notificationsEnabled && (
              <div className="text-sm">
                {countdownSeconds > 0 ? (
                  <span className="text-yellow-600 font-medium">
                    ⏰ Notifications paused. Resuming in {countdownSeconds}{" "}
                    seconds...
                  </span>
                ) : (
                  <span className="text-green-600 font-medium">
                    🔔 Notifications active
                  </span>
                )}
              </div>
            )}
          </div>
        )}

        {/* Map Container */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <MapContainer
            center={userPosition || [18.5, 73.86]}
            zoom={13}
            scrollWheelZoom={false}
            style={{ height: "350px", width: "100%" }}
            className="w-full"
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />

            <MapClickHandler onMapClick={handleMapClick} />

            {/* User position marker */}
            {userPosition && (
              <Marker
                position={userPosition}
                icon={createCustomIcon(
                  isNearDestination ? "#10B981" : "#3B82F6",
                  "user"
                )}
              >
                <Popup>
                  <div className="text-center">
                    <div className="font-bold text-blue-600 text-sm">
                      Your Location
                    </div>
                    <div className="text-xs text-gray-600">
                      {userPosition[0].toFixed(4)}, {userPosition[1].toFixed(4)}
                    </div>
                  </div>
                </Popup>
              </Marker>
            )}

            {/* Destination marker */}
            {destinationPosition && (
              <Marker
                position={destinationPosition}
                icon={createCustomIcon(
                  isNearDestination ? "#EF4444" : "#8B5CF6",
                  "destination"
                )}
              >
                <Popup>
                  <div className="text-center">
                    <div className="font-bold text-purple-600 text-sm">
                      Destination
                    </div>
                    <div className="text-xs text-gray-600">
                      {destinationPosition[0].toFixed(4)},{" "}
                      {destinationPosition[1].toFixed(4)}
                    </div>
                  </div>
                </Popup>
              </Marker>
            )}

            {/* Distance circle */}
            {destinationPosition && (
              <Circle
                center={destinationPosition}
                radius={selectedDistance * 1000}
                pathOptions={{
                  color: isNearDestination ? "#EF4444" : "#8B5CF6",
                  fillColor: isNearDestination ? "#FEE2E2" : "#EDE9FE",
                  fillOpacity: 0.2,
                  weight: 2,
                }}
              />
            )}
          </MapContainer>
        </div>

        {/* Distance Display */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <div className="text-center space-y-2">
            <div className="text-lg font-semibold text-gray-800">
              {destinationPosition ? (
                <>
                  Distance to destination:{" "}
                  {distanceMeters !== null ? (
                    <span
                      className={
                        isNearDestination
                          ? "text-red-600 font-bold"
                          : "text-gray-700"
                      }
                    >
                      {distanceMeters >= 1000
                        ? `${(distanceMeters / 1000).toFixed(2)} km`
                        : `${Math.round(distanceMeters)} meters`}
                    </span>
                  ) : (
                    "Calculating..."
                  )}
                </>
              ) : (
                "Click on the map to set your destination"
              )}
            </div>

            {isNearDestination && (
              <div className="text-red-600 font-medium text-sm">
                🎯 You&apos;re within {selectedDistance}km of your destination!
              </div>
            )}

            {destinationPosition && (
              <div className="text-xs text-gray-500">
                Notifications: {notificationsEnabled ? "ON" : "OFF"} |
                Threshold: {selectedDistance}km
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Map;
