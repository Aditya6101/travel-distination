# 🗺️ Travel Destination

A minimal, real-time proximity alert app built with **Next.js 16** and **shadcn/ui**. Set a destination on the map, and get notified when you're within a chosen radius.

![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=next.js)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?logo=typescript)
![shadcn/ui](https://img.shields.io/badge/shadcn%2Fui-zinc-black)
![Leaflet](https://img.shields.io/badge/Leaflet-1.9-green?logo=leaflet)

---

## Features

- **📍 Live location tracking** — uses the browser Geolocation API with `watchPosition` for continuous updates
- **🗺️ Interactive map** — click anywhere to drop a destination pin
- **📏 Proximity alerts** — browser push notifications when you enter the alert radius (2–20 km)
- **🔔 Notification controls** — toggle alerts on/off or snooze for 5 minutes
- **🎨 Map style switcher** — switch between three CartoDB tile styles:
  - **Light** (Positron) — ultra-minimal, matches the app theme
  - **Dark** (Dark Matter) — jet black, great for night use
  - **Voyager** — road-focused, clean modern style
- **📱 Responsive layout** — sidebar + map split on desktop; full-screen map with a Controls toggle on mobile

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | [Next.js 16](https://nextjs.org) (App Router) |
| Language | TypeScript 5 |
| UI Components | [shadcn/ui](https://ui.shadcn.com) (zinc / Vercel theme) |
| Styling | Tailwind CSS v4 |
| Map | [React Leaflet](https://react-leaflet.js.org) + [Leaflet.js](https://leafletjs.com) |
| Map Tiles | [CartoDB](https://carto.com) (Positron, Dark Matter, Voyager) |
| Icons | [Lucide React](https://lucide.dev) |
| Font | [Geist](https://vercel.com/font) (via `next/font`) |

---

## Getting Started

### Prerequisites

- Node.js 18+
- npm

### Install & Run

```bash
# Clone the repo
git clone https://github.com/Aditya6101/travel-distination.git
cd travel-distination

# Install dependencies
npm install

# Start the dev server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

> **Note:** The app will request Geolocation and Notification permissions on first load. Both are required for full functionality.

---

## Usage

1. **Allow location access** when prompted
2. **Click on the map** to set your destination pin
3. **Set the alert radius** using the dropdown (2–20 km)
4. **Toggle notifications** on/off with the switch
5. **Switch map style** with the Light / Dark / Voyager segmented control
6. **Snooze** alerts for 5 minutes using the snooze button

---

## Project Structure

```
src/
├── app/
│   ├── globals.css        # shadcn CSS variables (zinc theme)
│   ├── layout.tsx         # Root layout with Geist font
│   └── page.tsx           # Entry page
├── components/
│   ├── Map.tsx            # Main map component (all logic + UI)
│   └── ui/                # shadcn/ui components
│       ├── badge.tsx
│       ├── button.tsx
│       ├── card.tsx
│       ├── select.tsx
│       ├── separator.tsx
│       └── switch.tsx
└── lib/
    └── utils.ts           # cn() utility helper
```

---

## License

MIT
