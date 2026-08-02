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
import { MapPin, Bell, BellOff, Trash2, Navigation, Clock, Map as MapIcon } from "lucide-react";

// Tile style config
const TILE_STYLES = {
  light: {
    label: "Light",
    url: "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png",
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
  },
  dark: {
    label: "Dark",
    url: "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
  },
  road: {
    label: "Voyager",
    url: "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png",
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
  },
} as const;

type TileStyleKey = keyof typeof TILE_STYLES;
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

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
        border: 2px solid white;
        border-radius: 50%;
        box-shadow: 0 1px 4px rgba(0,0,0,0.25);
        display: flex;
        align-items: center;
        justify-content: center;
        color: white;
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
  const [userPosition, setUserPosition] = useState<[number, number] | null>(null);
  const [destinationPosition, setDestinationPosition] = useState<[number, number] | null>(null);
  const [distanceMeters, setDistanceMeters] = useState<number | null>(null);
  const [geoError, setGeoError] = useState<string | null>(null);
  const [selectedDistance, setSelectedDistance] = useState<number>(5);
  const [notificationsEnabled, setNotificationsEnabled] = useState<boolean>(true);
  const [notificationInterval, setNotificationInterval] = useState<NodeJS.Timeout | null>(null);
  const [lastNotificationTime, setLastNotificationTime] = useState<number>(0);
  const [isNearDestination, setIsNearDestination] = useState<boolean>(false);
  const [countdownSeconds, setCountdownSeconds] = useState<number>(0);
  const [isMobilePanelOpen, setIsMobilePanelOpen] = useState<boolean>(false);
  const [tileStyle, setTileStyle] = useState<TileStyleKey>("light");

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
    const destination = L.latLng(destinationPosition[0], destinationPosition[1]);
    const distance = user.distanceTo(destination);
    setDistanceMeters(distance);

    const isNear = distance <= selectedDistance * 1000;
    setIsNearDestination(isNear);

    if (notificationsEnabled && isNear) {
      const now = Date.now();
      const timeSinceLastNotification = now - lastNotificationTime;
      const notifInterval = isNear ? 30000 : 60000;

      if (timeSinceLastNotification >= notifInterval) {
        sendNotification();
        setLastNotificationTime(now);
      }
    }
  }, [userPosition, destinationPosition, selectedDistance, notificationsEnabled, lastNotificationTime]);

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
        const destination = L.latLng(destinationPosition[0], destinationPosition[1]);
        const distance = user.distanceTo(destination);

        if (distance <= selectedDistance * 1000) {
          sendNotification();
          setLastNotificationTime(Date.now());
        }
      }
    }, 30000);

    setNotificationInterval(interval);

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [notificationsEnabled, destinationPosition, userPosition, selectedDistance]);

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
        body: `You're approaching your destination! You're within ${selectedDistance}km.`,
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

  const formatDistance = (meters: number) => {
    if (meters >= 1000) {
      return `${(meters / 1000).toFixed(2)} km`;
    }
    return `${Math.round(meters)} m`;
  };

  // Sidebar content (shared between desktop and mobile)
  const SidebarContent = () => (
    <div className="flex flex-col gap-4 p-4 h-full overflow-y-auto">
      {/* Header */}
      <div className="flex items-center gap-2">
        <MapPin className="h-5 w-5 text-foreground" />
        <span className="font-semibold text-base tracking-tight">Travel Destination</span>
      </div>

      <Separator />

      {/* Geo Error */}
      {geoError && (
        <div className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-destructive">
          {geoError}
        </div>
      )}

      {/* Status Card */}
      <Card className="shadow-none">
        <CardHeader className="pb-2 pt-4 px-4">
          <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            Status
          </CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-4 space-y-3">
          {/* Location status */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Navigation className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Your location</span>
            </div>
            {userPosition ? (
              <Badge variant="secondary" className="text-xs font-normal">
                {userPosition[0].toFixed(3)}, {userPosition[1].toFixed(3)}
              </Badge>
            ) : (
              <Badge variant="outline" className="text-xs font-normal text-muted-foreground">
                Locating…
              </Badge>
            )}
          </div>

          {/* Destination status */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Destination</span>
            </div>
            {destinationPosition ? (
              <Badge variant="secondary" className="text-xs font-normal">
                {destinationPosition[0].toFixed(3)}, {destinationPosition[1].toFixed(3)}
              </Badge>
            ) : (
              <Badge variant="outline" className="text-xs font-normal text-muted-foreground">
                Not set
              </Badge>
            )}
          </div>

          {/* Distance */}
          {destinationPosition && (
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Distance</span>
              {distanceMeters !== null ? (
                <span className={`text-sm font-semibold ${isNearDestination ? "text-destructive" : "text-foreground"}`}>
                  {formatDistance(distanceMeters)}
                </span>
              ) : (
                <span className="text-sm text-muted-foreground">Calculating…</span>
              )}
            </div>
          )}

          {/* Near destination alert */}
          {isNearDestination && (
            <div className="rounded-md bg-destructive/10 border border-destructive/20 px-3 py-2 text-xs text-destructive font-medium">
              🎯 Within {selectedDistance}km of destination
            </div>
          )}
        </CardContent>
      </Card>

      {/* Controls Card */}
      <Card className="shadow-none">
        <CardHeader className="pb-2 pt-4 px-4">
          <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            Controls
          </CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-4 space-y-4">
          {/* Distance threshold */}
          <div className="space-y-1.5">
            <label className="text-sm text-muted-foreground">Alert radius</label>
            <Select
              value={String(selectedDistance)}
              onValueChange={(val) => {
                setSelectedDistance(Number(val));
                setLastNotificationTime(0);
              }}
            >
              <SelectTrigger className="h-9 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {distanceOptions.map((d) => (
                  <SelectItem key={d} value={String(d)}>
                    {d} km
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Notifications toggle */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {notificationsEnabled ? (
                <Bell className="h-4 w-4 text-muted-foreground" />
              ) : (
                <BellOff className="h-4 w-4 text-muted-foreground" />
              )}
              <span className="text-sm text-muted-foreground">Notifications</span>
            </div>
            <Switch
              checked={notificationsEnabled}
              onCheckedChange={setNotificationsEnabled}
            />
          </div>

          {/* Notification countdown status */}
          {destinationPosition && notificationsEnabled && (
            <div className="text-xs text-muted-foreground">
              {countdownSeconds > 0 ? (
                <div className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400">
                  <Clock className="h-3 w-3" />
                  Paused — resumes in {countdownSeconds}s
                </div>
              ) : (
                <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
                  <Bell className="h-3 w-3" />
                  Notifications active
                </div>
              )}
            </div>
          )}

          {/* Map style switcher */}
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <MapIcon className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Map style</span>
            </div>
            <div className="flex rounded-md border border-input overflow-hidden">
              {(Object.keys(TILE_STYLES) as TileStyleKey[]).map((key) => (
                <button
                  key={key}
                  onClick={() => setTileStyle(key)}
                  className={`flex-1 py-1.5 text-xs font-medium transition-colors ${
                    tileStyle === key
                      ? "bg-primary text-primary-foreground"
                      : "bg-transparent text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                  }`}
                >
                  {TILE_STYLES[key].label}
                </button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      {destinationPosition && (
        <div className="flex flex-col gap-2">
          {/* Snooze button */}
          {notificationsEnabled && countdownSeconds === 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setLastNotificationTime(Date.now() + 300000)}
              className="w-full justify-start gap-2 text-sm"
            >
              <Clock className="h-3.5 w-3.5" />
              Snooze 5 minutes
            </Button>
          )}
          {notificationsEnabled && countdownSeconds > 0 && (
            <Button variant="outline" size="sm" disabled className="w-full justify-start gap-2 text-sm">
              <Clock className="h-3.5 w-3.5" />
              Snoozed ({countdownSeconds}s remaining)
            </Button>
          )}

          {/* Reset */}
          <Button
            variant="ghost"
            size="sm"
            onClick={resetDestination}
            className="w-full justify-start gap-2 text-sm text-muted-foreground hover:text-destructive hover:bg-destructive/10"
          >
            <Trash2 className="h-3.5 w-3.5" />
            Clear destination
          </Button>
        </div>
      )}

      {/* Help text */}
      {!destinationPosition && (
        <p className="text-xs text-muted-foreground text-center pt-2">
          Tap anywhere on the map to set your destination
        </p>
      )}
    </div>
  );

  return (
    <div className="h-screen flex flex-col bg-background">
      {/* Top header bar — mobile only */}
      <header className="md:hidden flex items-center justify-between px-4 py-3 border-b border-border bg-background">
        <div className="flex items-center gap-2">
          <MapPin className="h-4 w-4" />
          <span className="font-semibold text-sm">Travel Destination</span>
        </div>
        <div className="flex items-center gap-2">
          {destinationPosition && distanceMeters !== null && (
            <Badge variant={isNearDestination ? "destructive" : "secondary"} className="text-xs">
              {formatDistance(distanceMeters)}
            </Badge>
          )}
          <Button
            variant="outline"
            size="sm"
            className="text-xs h-7 px-2"
            onClick={() => setIsMobilePanelOpen(!isMobilePanelOpen)}
          >
            {isMobilePanelOpen ? "Map" : "Controls"}
          </Button>
        </div>
      </header>

      {/* Desktop layout — sidebar + map */}
      <div className="hidden md:flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <aside className="w-72 xl:w-80 border-r border-border bg-background flex-shrink-0 overflow-y-auto">
          <SidebarContent />
        </aside>

        {/* Map */}
        <div className="flex-1 relative">
          <MapContainer
            center={userPosition || [18.5, 73.86]}
            zoom={13}
            scrollWheelZoom={true}
            style={{ height: "100%", width: "100%" }}
          >
            <TileLayer
              url={TILE_STYLES[tileStyle].url}
              attribution={TILE_STYLES[tileStyle].attribution}
            />
            <MapClickHandler onMapClick={handleMapClick} />

            {userPosition && (
              <Marker
                position={userPosition}
                icon={createCustomIcon(isNearDestination ? "#10B981" : "#09090b", "user")}
                ref={ref1}
              >
                <Popup>
                  <div className="text-center text-xs">
                    <div className="font-semibold">Your Location</div>
                    <div className="text-gray-500">{userPosition[0].toFixed(4)}, {userPosition[1].toFixed(4)}</div>
                  </div>
                </Popup>
              </Marker>
            )}

            {destinationPosition && (
              <Marker
                position={destinationPosition}
                icon={createCustomIcon(isNearDestination ? "#ef4444" : "#71717a", "destination")}
              >
                <Popup>
                  <div className="text-center text-xs">
                    <div className="font-semibold">Destination</div>
                    <div className="text-gray-500">{destinationPosition[0].toFixed(4)}, {destinationPosition[1].toFixed(4)}</div>
                  </div>
                </Popup>
              </Marker>
            )}

            {destinationPosition && (
              <Circle
                center={destinationPosition}
                radius={selectedDistance * 1000}
                pathOptions={{
                  color: isNearDestination ? "#ef4444" : "#09090b",
                  fillColor: isNearDestination ? "#fee2e2" : "#f4f4f5",
                  fillOpacity: 0.15,
                  weight: 1.5,
                  dashArray: "4 4",
                }}
              />
            )}
          </MapContainer>

          {/* Map overlay hint */}
          {!destinationPosition && (
            <div className="absolute top-3 left-1/2 -translate-x-1/2 z-[999] pointer-events-none">
              <div className="bg-background/90 backdrop-blur-sm border border-border rounded-full px-4 py-2 text-xs text-muted-foreground shadow-sm">
                Click on the map to set your destination
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Mobile layout */}
      <div className="md:hidden flex flex-col flex-1 overflow-hidden">
        {isMobilePanelOpen ? (
          /* Controls panel */
          <div className="flex-1 overflow-y-auto">
            <SidebarContent />
          </div>
        ) : (
          /* Map */
          <div className="flex-1 relative">
            <MapContainer
              center={userPosition || [18.5, 73.86]}
              zoom={13}
              scrollWheelZoom={false}
              style={{ height: "100%", width: "100%" }}
            >
              <TileLayer
                attribution={TILE_STYLES[tileStyle].attribution}
                url={TILE_STYLES[tileStyle].url}
              />
              <MapClickHandler onMapClick={handleMapClick} />

              {userPosition && (
                <Marker
                  position={userPosition}
                  icon={createCustomIcon(isNearDestination ? "#10B981" : "#09090b", "user")}
                >
                  <Popup>
                    <div className="text-center text-xs">
                      <div className="font-semibold">Your Location</div>
                    </div>
                  </Popup>
                </Marker>
              )}

              {destinationPosition && (
                <Marker
                  position={destinationPosition}
                  icon={createCustomIcon(isNearDestination ? "#ef4444" : "#71717a", "destination")}
                >
                  <Popup>
                    <div className="text-center text-xs">
                      <div className="font-semibold">Destination</div>
                    </div>
                  </Popup>
                </Marker>
              )}

              {destinationPosition && (
                <Circle
                  center={destinationPosition}
                  radius={selectedDistance * 1000}
                  pathOptions={{
                    color: isNearDestination ? "#ef4444" : "#09090b",
                    fillColor: isNearDestination ? "#fee2e2" : "#f4f4f5",
                    fillOpacity: 0.15,
                    weight: 1.5,
                    dashArray: "4 4",
                  }}
                />
              )}
            </MapContainer>

            {/* Mobile hint overlay */}
            {!destinationPosition && (
              <div className="absolute top-3 left-1/2 -translate-x-1/2 z-[999] pointer-events-none">
                <div className="bg-background/90 backdrop-blur-sm border border-border rounded-full px-4 py-2 text-xs text-muted-foreground shadow-sm">
                  Tap on the map to set destination
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default Map;
