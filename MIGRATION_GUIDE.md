# Travel Destination App - Migration Guide to React Native (Expo)

## 📋 Table of Contents
1. [Project Overview](#project-overview)
2. [Current Architecture](#current-architecture)
3. [Application Flow](#application-flow)
4. [Key Features & Components](#key-features--components)
5. [Dependencies Analysis](#dependencies-analysis)
6. [Migration Strategy](#migration-strategy)
7. [React Native Equivalents](#react-native-equivalents)
8. [Step-by-Step Migration Plan](#step-by-step-migration-plan)
9. [Challenges & Solutions](#challenges--solutions)
10. [Testing Checklist](#testing-checklist)

---

## 📱 Project Overview

**Project Name:** Travel Destination  
**Current Stack:** Next.js 15.4.6 + React 19 + TypeScript + Tailwind CSS  
**Purpose:** A location-based travel app that helps users track their distance to a destination and receive proximity notifications.

### Core Functionality
- Real-time user location tracking using Geolocation API
- Interactive map with destination selection
- Distance calculation between user and destination
- Proximity notifications when within a set threshold
- Customizable distance thresholds (2-20km)
- Notification pause feature ("I'm up" button)

---

## 🏗️ Current Architecture

### Project Structure
```
travel-destintion/
├── src/
│   ├── app/
│   │   ├── layout.tsx          # Root layout with fonts & metadata
│   │   ├── page.tsx            # Home page (entry point)
│   │   ├── globals.css         # Global styles & Tailwind config
│   │   └── favicon.ico
│   └── components/
│       └── Map.tsx             # Main map component (493 lines)
├── public/
│   ├── globe.svg
│   ├── file.svg
│   ├── window.svg
│   ├── next.svg
│   └── vercel.svg
├── package.json
├── tsconfig.json
├── next.config.ts
└── tailwind.config (in globals.css)
```

### Technology Stack
- **Framework:** Next.js 15.4.6 (App Router)
- **UI Library:** React 19.1.0
- **Language:** TypeScript 5
- **Styling:** Tailwind CSS 4
- **Mapping:** Leaflet 1.9.4 + React Leaflet 5.0.0
- **Runtime:** Bun (package manager)

---

## 🔄 Application Flow

### 1. **App Initialization** (`page.tsx`)
```
User opens app
    ↓
Next.js renders Home component
    ↓
Dynamic import of Map component (SSR disabled)
    ↓
Map component mounts
```

### 2. **Location Tracking Flow** (`Map.tsx` - Lines 88-107)
```
Component mounts
    ↓
Check if Geolocation API is available
    ↓
Request notification permission (Lines 81-85)
    ↓
Start watchPosition (continuous tracking)
    ↓
Update userPosition state on each position change
    ↓
Handle errors (set geoError state)
```

**Key Code:**
```typescript
navigator.geolocation.watchPosition(
  (pos) => {
    setUserPosition([latitude, longitude]);
  },
  (err) => setGeoError(err.message),
  { enableHighAccuracy: true, maximumAge: 1000, timeout: 10000 }
);
```

### 3. **Destination Selection Flow** (`Map.tsx` - Lines 46-57, 209-211)
```
User clicks "Set on Map" button
    ↓
Scroll to map view
    ↓
User clicks on map
    ↓
MapClickHandler captures click event
    ↓
handleMapClick sets destinationPosition state
    ↓
Destination marker appears on map
    ↓
Distance calculation triggers
```

**Key Code:**
```typescript
const MapClickHandler = ({ onMapClick }) => {
  useMapEvents({
    click: (e) => onMapClick(e.latlng.lat, e.latlng.lng)
  });
  return null;
};
```

### 4. **Distance Calculation Flow** (`Map.tsx` - Lines 110-141)
```
userPosition OR destinationPosition changes
    ↓
useEffect triggers
    ↓
Calculate distance using Leaflet's distanceTo()
    ↓
Update distanceMeters state
    ↓
Check if distance <= selectedDistance threshold
    ↓
Update isNearDestination state
    ↓
If near + notifications enabled → Send notification
```

**Key Code:**
```typescript
const user = L.latLng(userPosition[0], userPosition[1]);
const destination = L.latLng(destinationPosition[0], destinationPosition[1]);
const distance = user.distanceTo(destination); // Returns meters
setDistanceMeters(distance);
```

### 5. **Notification System Flow** (`Map.tsx` - Lines 144-197, 199-207)
```
Distance calculation completes
    ↓
Check: isNearDestination && notificationsEnabled
    ↓
Check: Time since last notification >= interval (30s)
    ↓
Send browser notification
    ↓
Update lastNotificationTime
    ↓
Set up 30-second interval for recurring checks
```

**Key Code:**
```typescript
if ("Notification" in window && Notification.permission === "granted") {
  new Notification("Destination Alert!", {
    body: `You're approaching your destination! You're within ${selectedDistance}km.`,
    icon: "/globe.svg",
    tag: "destination-alert"
  });
}
```

### 6. **"I'm Up" Feature Flow** (`Map.tsx` - Lines 182-197, 320-339)
```
User clicks "I'm up (5 min)" button
    ↓
Set lastNotificationTime to Date.now() + 300000 (5 min future)
    ↓
Countdown timer starts (1-second intervals)
    ↓
Button shows countdown: "I'm up (300s)"
    ↓
Notifications paused during countdown
    ↓
When countdown reaches 0 → Notifications resume
```

---

## 🧩 Key Features & Components

### Component: `Map.tsx` (Main Component)

#### State Management (Lines 60-76)
| State Variable         | Type                       | Purpose                                       |
| ---------------------- | -------------------------- | --------------------------------------------- |
| `userPosition`         | `[number, number] \| null` | Current user GPS coordinates                  |
| `destinationPosition`  | `[number, number] \| null` | Selected destination coordinates              |
| `distanceMeters`       | `number \| null`           | Distance in meters between user & destination |
| `geoError`             | `string \| null`           | Geolocation error messages                    |
| `selectedDistance`     | `number`                   | Notification threshold in km (default: 5)     |
| `notificationsEnabled` | `boolean`                  | Toggle for notifications (default: true)      |
| `notificationInterval` | `NodeJS.Timeout \| null`   | Interval ID for recurring checks              |
| `lastNotificationTime` | `number`                   | Timestamp of last notification                |
| `isNearDestination`    | `boolean`                  | Whether user is within threshold              |
| `countdownSeconds`     | `number`                   | Remaining seconds for "I'm up" pause          |

#### Custom Functions

**1. `createCustomIcon()` (Lines 16-43)**
- Creates custom Leaflet markers
- Two types: "user" (📍) and "destination" (🎯)
- Dynamic colors based on proximity
- Returns `L.divIcon` with inline styles

**2. `MapClickHandler` (Lines 46-57)**
- React Leaflet component
- Listens for map click events
- Calls `onMapClick` callback with lat/lng

**3. `sendNotification()` (Lines 199-207)**
- Checks browser notification permission
- Sends notification with custom message
- Uses "destination-alert" tag to replace previous notifications

**4. `handleMapClick()` (Line 209-211)**
- Callback for map clicks
- Updates `destinationPosition` state

**5. `resetDestination()` (Lines 213-218)**
- Clears destination
- Resets all related states
- Stops notifications

**6. `toggleNotifications()` (Lines 220-222)**
- Toggles notification on/off

**7. `handleDistanceChange()` (Lines 224-227)**
- Updates distance threshold
- Resets notification timer

#### UI Sections

**1. Header** (Lines 232-236)
- App title with emoji
- Fixed top bar

**2. Error Display** (Lines 240-244)
- Shows geolocation errors
- Red alert styling

**3. Search Section** (Lines 247-290)
- "Set on Map" button (scrolls to map)
- Distance threshold dropdown (2-20km options)

**4. Control Buttons** (Lines 293-340)
- Notifications toggle (🔔 ON / 🔕 OFF)
- Reset button (🗑️)
- "I'm up" button (⏸️) with countdown

**5. Status Information** (Lines 343-366)
- Destination coordinates
- Notification status
- Countdown display

**6. Map Container** (Lines 369-443)
- Leaflet MapContainer (350px height)
- OpenStreetMap tiles
- User marker (blue/green based on proximity)
- Destination marker (purple/red based on proximity)
- Circle overlay showing threshold radius

**7. Distance Display** (Lines 446-486)
- Shows distance in km or meters
- Proximity alert message
- Settings summary

---

## 📦 Dependencies Analysis

### Current Dependencies

| Package         | Version | Purpose                    | React Native Equivalent      |
| --------------- | ------- | -------------------------- | ---------------------------- |
| `next`          | 15.4.6  | Framework                  | **Expo Router**              |
| `react`         | 19.1.0  | UI Library                 | ✅ Same (compatible version)  |
| `react-dom`     | 19.1.0  | Web rendering              | ❌ Not needed (React Native)  |
| `leaflet`       | 1.9.4   | Mapping library            | **react-native-maps**        |
| `react-leaflet` | 5.0.0   | React bindings for Leaflet | **react-native-maps**        |
| `tailwindcss`   | 4       | Styling                    | **NativeWind** or StyleSheet |
| `typescript`    | 5       | Type safety                | ✅ Same                       |

### New Dependencies Needed for React Native

```json
{
  "expo": "~52.0.0",
  "expo-location": "~18.0.0",
  "expo-notifications": "~0.29.0",
  "react-native-maps": "1.18.0",
  "expo-router": "~4.0.0",
  "nativewind": "^4.0.0" // Optional, for Tailwind-like styling
}
```

---

## 🔄 Migration Strategy

### Phase 1: Setup (Day 1)
1. Initialize new Expo project
2. Install dependencies
3. Configure TypeScript
4. Set up folder structure

### Phase 2: Core Features (Days 2-3)
1. Implement location tracking
2. Create map component
3. Add destination selection

### Phase 3: Notifications (Day 4)
1. Set up Expo Notifications
2. Implement proximity alerts
3. Add "I'm up" feature

### Phase 4: UI/UX (Day 5)
1. Style components
2. Add responsive design
3. Test on iOS & Android

### Phase 5: Testing & Polish (Day 6)
1. Test all features
2. Handle edge cases
3. Optimize performance

---

## 🔀 React Native Equivalents

### 1. **Next.js App Router → Expo Router**

**Current (Next.js):**
```typescript
// src/app/layout.tsx
export default function RootLayout({ children }) {
  return <html><body>{children}</body></html>;
}

// src/app/page.tsx
export default function Home() {
  return <Map />;
}
```

**React Native (Expo Router):**
```typescript
// app/_layout.tsx
import { Stack } from 'expo-router';

export default function RootLayout() {
  return <Stack screenOptions={{ headerShown: false }} />;
}

// app/index.tsx
import Map from '@/components/Map';

export default function Home() {
  return <Map />;
}
```

### 2. **Geolocation API → Expo Location**

**Current (Web):**
```typescript
navigator.geolocation.watchPosition(
  (pos) => setUserPosition([pos.coords.latitude, pos.coords.longitude]),
  (err) => setGeoError(err.message),
  { enableHighAccuracy: true, maximumAge: 1000, timeout: 10000 }
);
```

**React Native (Expo Location):**
```typescript
import * as Location from 'expo-location';

// Request permission
const { status } = await Location.requestForegroundPermissionsAsync();

// Watch position
const subscription = await Location.watchPositionAsync(
  {
    accuracy: Location.Accuracy.High,
    timeInterval: 1000,
    distanceInterval: 10
  },
  (location) => {
    setUserPosition([location.coords.latitude, location.coords.longitude]);
  }
);

// Cleanup
return () => subscription.remove();
```

### 3. **Leaflet Maps → React Native Maps**

**Current (Leaflet):**
```typescript
import { MapContainer, Marker, Circle, TileLayer } from 'react-leaflet';

<MapContainer center={[18.5, 73.86]} zoom={13}>
  <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
  <Marker position={userPosition} />
  <Circle center={destinationPosition} radius={5000} />
</MapContainer>
```

**React Native (react-native-maps):**
```typescript
import MapView, { Marker, Circle } from 'react-native-maps';

<MapView
  initialRegion={{
    latitude: 18.5,
    longitude: 73.86,
    latitudeDelta: 0.1,
    longitudeDelta: 0.1
  }}
  onPress={(e) => handleMapClick(e.nativeEvent.coordinate)}
>
  <Marker coordinate={{ latitude: userPosition[0], longitude: userPosition[1] }} />
  <Circle
    center={{ latitude: destinationPosition[0], longitude: destinationPosition[1] }}
    radius={5000}
  />
</MapView>
```

### 4. **Browser Notifications → Expo Notifications**

**Current (Web):**
```typescript
if (Notification.permission === "granted") {
  new Notification("Destination Alert!", {
    body: "You're approaching your destination!",
    icon: "/globe.svg"
  });
}
```

**React Native (Expo Notifications):**
```typescript
import * as Notifications from 'expo-notifications';

// Configure
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false
  })
});

// Request permission
const { status } = await Notifications.requestPermissionsAsync();

// Send notification
await Notifications.scheduleNotificationAsync({
  content: {
    title: "Destination Alert!",
    body: "You're approaching your destination!",
    sound: true
  },
  trigger: null // Immediate
});
```

### 5. **Tailwind CSS → StyleSheet / NativeWind**

**Current (Tailwind):**
```typescript
<div className="w-full h-screen flex justify-center items-center px-5">
  <button className="px-6 py-3 bg-blue-600 rounded-lg">
    Set on Map
  </button>
</div>
```

**React Native (StyleSheet):**
```typescript
import { View, TouchableOpacity, Text, StyleSheet } from 'react-native';

<View style={styles.container}>
  <TouchableOpacity style={styles.button}>
    <Text style={styles.buttonText}>Set on Map</Text>
  </TouchableOpacity>
</View>

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20
  },
  button: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: '#2563EB',
    borderRadius: 8
  },
  buttonText: {
    color: '#FFFFFF',
    fontWeight: '500'
  }
});
```

**React Native (NativeWind - Optional):**
```typescript
<View className="flex-1 justify-center items-center px-5">
  <TouchableOpacity className="px-6 py-3 bg-blue-600 rounded-lg">
    <Text className="text-white font-medium">Set on Map</Text>
  </TouchableOpacity>
</View>
```

### 6. **Distance Calculation**

**Current (Leaflet):**
```typescript
import L from 'leaflet';

const user = L.latLng(userPosition[0], userPosition[1]);
const destination = L.latLng(destinationPosition[0], destinationPosition[1]);
const distance = user.distanceTo(destination); // meters
```

**React Native (Haversine Formula or geolib):**
```typescript
import { getDistance } from 'geolib';

const distance = getDistance(
  { latitude: userPosition[0], longitude: userPosition[1] },
  { latitude: destinationPosition[0], longitude: destinationPosition[1] }
); // meters
```

---

## 📝 Step-by-Step Migration Plan

### Step 1: Initialize Expo Project

```bash
# Create new Expo project with TypeScript
npx create-expo-app@latest travel-destination-native --template tabs

cd travel-destination-native

# Install dependencies
npx expo install expo-location expo-notifications react-native-maps
npx expo install geolib

# Optional: Install NativeWind for Tailwind-like styling
npm install nativewind
npm install --save-dev tailwindcss
```

### Step 2: Configure Project

**app.json:**
```json
{
  "expo": {
    "name": "Travel Destination",
    "slug": "travel-destination",
    "version": "1.0.0",
    "orientation": "portrait",
    "icon": "./assets/icon.png",
    "userInterfaceStyle": "automatic",
    "splash": {
      "image": "./assets/splash.png",
      "resizeMode": "contain",
      "backgroundColor": "#ffffff"
    },
    "ios": {
      "supportsTablet": true,
      "infoPlist": {
        "NSLocationWhenInUseUsageDescription": "This app needs your location to calculate distance to your destination.",
        "NSLocationAlwaysAndWhenInUseUsageDescription": "This app needs your location to send proximity notifications."
      }
    },
    "android": {
      "adaptiveIcon": {
        "foregroundImage": "./assets/adaptive-icon.png",
        "backgroundColor": "#ffffff"
      },
      "permissions": [
        "ACCESS_FINE_LOCATION",
        "ACCESS_COARSE_LOCATION",
        "ACCESS_BACKGROUND_LOCATION"
      ]
    },
    "plugins": [
      [
        "expo-location",
        {
          "locationAlwaysAndWhenInUsePermission": "Allow Travel Destination to use your location."
        }
      ],
      [
        "expo-notifications",
        {
          "icon": "./assets/notification-icon.png",
          "color": "#ffffff"
        }
      ]
    ]
  }
}
```

### Step 3: Create Folder Structure

```
travel-destination-native/
├── app/
│   ├── _layout.tsx          # Root layout
│   └── index.tsx            # Home screen
├── components/
│   └── Map.tsx              # Main map component
├── hooks/
│   ├── useLocation.ts       # Location tracking hook
│   └── useNotifications.ts  # Notification hook
├── utils/
│   └── distance.ts          # Distance calculation utilities
├── constants/
│   └── Colors.ts            # Color palette
└── assets/
    ├── icon.png
    └── splash.png
```

### Step 4: Implement Location Hook

**hooks/useLocation.ts:**
```typescript
import { useState, useEffect } from 'react';
import * as Location from 'expo-location';

export const useLocation = () => {
  const [location, setLocation] = useState<[number, number] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let subscription: Location.LocationSubscription | null = null;

    const startWatching = async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        
        if (status !== 'granted') {
          setError('Location permission denied');
          return;
        }

        subscription = await Location.watchPositionAsync(
          {
            accuracy: Location.Accuracy.High,
            timeInterval: 1000,
            distanceInterval: 10
          },
          (loc) => {
            setLocation([loc.coords.latitude, loc.coords.longitude]);
            setError(null);
          }
        );
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to get location');
      }
    };

    startWatching();

    return () => {
      subscription?.remove();
    };
  }, []);

  return { location, error };
};
```

### Step 5: Implement Notifications Hook

**hooks/useNotifications.ts:**
```typescript
import { useState, useEffect } from 'react';
import * as Notifications from 'expo-notifications';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false
  })
});

export const useNotifications = () => {
  const [permissionGranted, setPermissionGranted] = useState(false);

  useEffect(() => {
    const requestPermission = async () => {
      const { status } = await Notifications.requestPermissionsAsync();
      setPermissionGranted(status === 'granted');
    };

    requestPermission();
  }, []);

  const sendNotification = async (title: string, body: string) => {
    if (!permissionGranted) return;

    await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        sound: true,
        priority: Notifications.AndroidNotificationPriority.HIGH
      },
      trigger: null
    });
  };

  return { sendNotification, permissionGranted };
};
```

### Step 6: Create Map Component

**components/Map.tsx:**
```typescript
import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import MapView, { Marker, Circle, Region } from 'react-native-maps';
import { getDistance } from 'geolib';
import { useLocation } from '@/hooks/useLocation';
import { useNotifications } from '@/hooks/useNotifications';

const DISTANCE_OPTIONS = [2, 3, 4, 5, 10, 20];

export default function Map() {
  const { location: userPosition, error: geoError } = useLocation();
  const { sendNotification, permissionGranted } = useNotifications();
  
  const [destinationPosition, setDestinationPosition] = useState<[number, number] | null>(null);
  const [distanceMeters, setDistanceMeters] = useState<number | null>(null);
  const [selectedDistance, setSelectedDistance] = useState(5);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [lastNotificationTime, setLastNotificationTime] = useState(0);
  const [isNearDestination, setIsNearDestination] = useState(false);
  const [countdownSeconds, setCountdownSeconds] = useState(0);

  // Calculate distance
  useEffect(() => {
    if (!userPosition || !destinationPosition) return;

    const distance = getDistance(
      { latitude: userPosition[0], longitude: userPosition[1] },
      { latitude: destinationPosition[0], longitude: destinationPosition[1] }
    );
    
    setDistanceMeters(distance);
    const isNear = distance <= selectedDistance * 1000;
    setIsNearDestination(isNear);

    // Send notification if near
    if (notificationsEnabled && isNear) {
      const now = Date.now();
      if (now - lastNotificationTime >= 30000) {
        sendNotification(
          'Destination Alert!',
          `You're within ${selectedDistance}km of your destination!`
        );
        setLastNotificationTime(now);
      }
    }
  }, [userPosition, destinationPosition, selectedDistance, notificationsEnabled]);

  // Countdown timer
  useEffect(() => {
    if (lastNotificationTime > Date.now()) {
      const interval = setInterval(() => {
        const remaining = Math.ceil((lastNotificationTime - Date.now()) / 1000);
        setCountdownSeconds(remaining > 0 ? remaining : 0);
      }, 1000);
      return () => clearInterval(interval);
    } else {
      setCountdownSeconds(0);
    }
  }, [lastNotificationTime]);

  const handleMapPress = (event: any) => {
    const { latitude, longitude } = event.nativeEvent.coordinate;
    setDestinationPosition([latitude, longitude]);
  };

  const resetDestination = () => {
    setDestinationPosition(null);
    setDistanceMeters(null);
    setIsNearDestination(false);
    setLastNotificationTime(0);
  };

  const pauseNotifications = () => {
    setLastNotificationTime(Date.now() + 300000); // 5 minutes
  };

  const initialRegion: Region = {
    latitude: userPosition?.[0] || 18.5,
    longitude: userPosition?.[1] || 73.86,
    latitudeDelta: 0.1,
    longitudeDelta: 0.1
  };

  return (
    <ScrollView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerText}>🗺️ Travel Destination</Text>
      </View>

      {/* Error Display */}
      {geoError && (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{geoError}</Text>
        </View>
      )}

      {/* Controls */}
      <View style={styles.card}>
        <Text style={styles.label}>Distance Threshold</Text>
        <View style={styles.distanceButtons}>
          {DISTANCE_OPTIONS.map((distance) => (
            <TouchableOpacity
              key={distance}
              style={[
                styles.distanceButton,
                selectedDistance === distance && styles.distanceButtonActive
              ]}
              onPress={() => setSelectedDistance(distance)}
            >
              <Text style={[
                styles.distanceButtonText,
                selectedDistance === distance && styles.distanceButtonTextActive
              ]}>
                {distance}km
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Action Buttons */}
      <View style={styles.card}>
        <View style={styles.buttonRow}>
          <TouchableOpacity
            style={[
              styles.button,
              notificationsEnabled ? styles.buttonGreen : styles.buttonRed
            ]}
            onPress={() => setNotificationsEnabled(!notificationsEnabled)}
          >
            <Text style={styles.buttonText}>
              {notificationsEnabled ? '🔔 ON' : '🔕 OFF'}
            </Text>
          </TouchableOpacity>

          {destinationPosition && (
            <TouchableOpacity
              style={[styles.button, styles.buttonGray]}
              onPress={resetDestination}
            >
              <Text style={styles.buttonText}>🗑️ Reset</Text>
            </TouchableOpacity>
          )}
        </View>

        {destinationPosition && notificationsEnabled && countdownSeconds === 0 && (
          <TouchableOpacity
            style={[styles.button, styles.buttonYellow, styles.fullWidth]}
            onPress={pauseNotifications}
          >
            <Text style={styles.buttonText}>⏸️ I'm up (5 min)</Text>
          </TouchableOpacity>
        )}

        {countdownSeconds > 0 && (
          <View style={[styles.button, styles.buttonYellowLight, styles.fullWidth]}>
            <Text style={styles.buttonText}>⏰ I'm up ({countdownSeconds}s)</Text>
          </View>
        )}
      </View>

      {/* Map */}
      <View style={styles.mapContainer}>
        <MapView
          style={styles.map}
          initialRegion={initialRegion}
          onPress={handleMapPress}
          showsUserLocation
          showsMyLocationButton
        >
          {userPosition && (
            <Marker
              coordinate={{
                latitude: userPosition[0],
                longitude: userPosition[1]
              }}
              title="Your Location"
              pinColor={isNearDestination ? '#10B981' : '#3B82F6'}
            />
          )}

          {destinationPosition && (
            <>
              <Marker
                coordinate={{
                  latitude: destinationPosition[0],
                  longitude: destinationPosition[1]
                }}
                title="Destination"
                pinColor={isNearDestination ? '#EF4444' : '#8B5CF6'}
              />
              <Circle
                center={{
                  latitude: destinationPosition[0],
                  longitude: destinationPosition[1]
                }}
                radius={selectedDistance * 1000}
                strokeColor={isNearDestination ? '#EF4444' : '#8B5CF6'}
                fillColor={isNearDestination ? 'rgba(239, 68, 68, 0.2)' : 'rgba(139, 92, 246, 0.2)'}
              />
            </>
          )}
        </MapView>
      </View>

      {/* Distance Display */}
      <View style={styles.card}>
        <Text style={styles.distanceText}>
          {destinationPosition ? (
            distanceMeters !== null ? (
              <>
                Distance: {' '}
                <Text style={isNearDestination ? styles.distanceNear : styles.distanceFar}>
                  {distanceMeters >= 1000
                    ? `${(distanceMeters / 1000).toFixed(2)} km`
                    : `${Math.round(distanceMeters)} meters`}
                </Text>
              </>
            ) : (
              'Calculating...'
            )
          ) : (
            'Tap on the map to set your destination'
          )}
        </Text>

        {isNearDestination && (
          <Text style={styles.alertText}>
            🎯 You're within {selectedDistance}km of your destination!
          </Text>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB'
  },
  header: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    alignItems: 'center'
  },
  headerText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827'
  },
  errorBox: {
    margin: 16,
    padding: 12,
    backgroundColor: '#FEF2F2',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FCA5A5'
  },
  errorText: {
    color: '#991B1B',
    fontSize: 14
  },
  card: {
    margin: 16,
    marginTop: 0,
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 12
  },
  distanceButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8
  },
  distanceButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    borderWidth: 2,
    borderColor: 'transparent'
  },
  distanceButtonActive: {
    backgroundColor: '#DBEAFE',
    borderColor: '#3B82F6'
  },
  distanceButtonText: {
    color: '#6B7280',
    fontWeight: '500'
  },
  distanceButtonTextActive: {
    color: '#1D4ED8'
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12
  },
  button: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center'
  },
  fullWidth: {
    flex: undefined,
    width: '100%'
  },
  buttonGreen: {
    backgroundColor: '#059669'
  },
  buttonRed: {
    backgroundColor: '#DC2626'
  },
  buttonGray: {
    backgroundColor: '#4B5563'
  },
  buttonYellow: {
    backgroundColor: '#EAB308'
  },
  buttonYellowLight: {
    backgroundColor: '#FCD34D'
  },
  buttonText: {
    color: '#FFFFFF',
    fontWeight: '500',
    fontSize: 14
  },
  mapContainer: {
    margin: 16,
    marginTop: 0,
    height: 350,
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2
  },
  map: {
    flex: 1
  },
  distanceText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    textAlign: 'center',
    marginBottom: 8
  },
  distanceNear: {
    color: '#DC2626',
    fontWeight: '700'
  },
  distanceFar: {
    color: '#374151'
  },
  alertText: {
    color: '#DC2626',
    fontWeight: '500',
    fontSize: 14,
    textAlign: 'center'
  }
});
```

### Step 7: Update Root Layout

**app/_layout.tsx:**
```typescript
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

export default function RootLayout() {
  return (
    <>
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: '#F9FAFB' }
        }}
      />
      <StatusBar style="auto" />
    </>
  );
}
```

### Step 8: Update Home Screen

**app/index.tsx:**
```typescript
import { SafeAreaView } from 'react-native';
import Map from '@/components/Map';

export default function Home() {
  return (
    <SafeAreaView style={{ flex: 1 }}>
      <Map />
    </SafeAreaView>
  );
}
```

---

## ⚠️ Challenges & Solutions

### Challenge 1: Background Location Tracking
**Problem:** iOS and Android restrict background location access.  
**Solution:**
- Request `ACCESS_BACKGROUND_LOCATION` permission on Android
- Use `expo-task-manager` for background tasks
- Implement geofencing with `expo-location`

### Challenge 2: Notification Permissions
**Problem:** Different permission models on iOS vs Android.  
**Solution:**
- Request permissions on app launch
- Show explanatory UI before requesting
- Handle denied permissions gracefully

### Challenge 3: Map Performance
**Problem:** React Native Maps can be slow with many markers.  
**Solution:**
- Limit markers to user + destination only
- Use `tracksViewChanges={false}` on markers
- Optimize circle rendering

### Challenge 4: Distance Calculation
**Problem:** Leaflet's `distanceTo()` not available.  
**Solution:**
- Use `geolib` library
- Implement Haversine formula manually if needed

### Challenge 5: Styling Differences
**Problem:** Tailwind classes don't work in React Native.  
**Solution:**
- Use StyleSheet API
- Or install NativeWind for Tailwind-like syntax
- Create a design system with constants

### Challenge 6: No SSR/Dynamic Imports
**Problem:** Next.js dynamic imports not needed in React Native.  
**Solution:**
- Remove `dynamic()` imports
- All components render natively

---

## ✅ Testing Checklist

### Functionality Tests
- [ ] Location permission request works on first launch
- [ ] User location updates in real-time
- [ ] Tapping map sets destination marker
- [ ] Distance calculation is accurate
- [ ] Notifications trigger when within threshold
- [ ] "I'm up" button pauses notifications for 5 minutes
- [ ] Countdown timer displays correctly
- [ ] Reset button clears destination
- [ ] Notification toggle works
- [ ] Distance threshold selector updates correctly

### Platform-Specific Tests
- [ ] **iOS:** Location permission dialog appears
- [ ] **iOS:** Notifications work in foreground/background
- [ ] **Android:** Location permission dialog appears
- [ ] **Android:** Notifications work with proper priority
- [ ] **Both:** App works on different screen sizes

### Edge Cases
- [ ] App handles location permission denial
- [ ] App handles notification permission denial
- [ ] App works without internet (map tiles may fail)
- [ ] App handles rapid destination changes
- [ ] App handles very short distances (<10m)
- [ ] App handles very long distances (>100km)

### Performance Tests
- [ ] Map renders smoothly
- [ ] No memory leaks from location watching
- [ ] Notification intervals work correctly
- [ ] App doesn't drain battery excessively

---

## 📚 Additional Resources

### Documentation
- [Expo Location](https://docs.expo.dev/versions/latest/sdk/location/)
- [Expo Notifications](https://docs.expo.dev/versions/latest/sdk/notifications/)
- [React Native Maps](https://github.com/react-native-maps/react-native-maps)
- [Expo Router](https://docs.expo.dev/router/introduction/)
- [Geolib](https://www.npmjs.com/package/geolib)

### Tutorials
- [Expo Location Tutorial](https://docs.expo.dev/tutorial/eas/introduction/)
- [React Native Maps Setup](https://github.com/react-native-maps/react-native-maps/blob/master/docs/installation.md)

---

## 🎯 Migration Summary

### What Stays the Same
- ✅ React hooks and state management
- ✅ TypeScript types
- ✅ Core business logic (distance calculation, notifications)
- ✅ Component structure

### What Changes
- ❌ Next.js → Expo Router
- ❌ Leaflet → React Native Maps
- ❌ Web Geolocation API → Expo Location
- ❌ Browser Notifications → Expo Notifications
- ❌ Tailwind CSS → StyleSheet/NativeWind
- ❌ HTML elements → React Native components

### Estimated Migration Time
- **Setup & Configuration:** 2-4 hours
- **Core Features:** 8-12 hours
- **UI/Styling:** 4-6 hours
- **Testing & Debugging:** 4-8 hours
- **Total:** 18-30 hours (2-4 days)

---

## 🚀 Next Steps

1. **Create new Expo project** following Step 1
2. **Set up permissions** in app.json
3. **Implement hooks** for location and notifications
4. **Build Map component** with React Native Maps
5. **Style with StyleSheet** or NativeWind
6. **Test on physical devices** (iOS & Android)
7. **Submit to app stores** (optional)

Good luck with your migration! 🎉
