# Architecture and data

This document records project-specific boundaries and safety decisions. Infer ordinary
Svelte structure from the code rather than expanding this into a component inventory.

## Boundaries

This is a static Svelte 5/TypeScript/Vite frontend using MapLibre. It has no production
backend, database, authentication or submission endpoint.

- App owns hash navigation, page/drawer state and settings shared with the map. HomeMap
  stays mounted behind full-screen pages so its camera and transient work survive.
- MapCanvas alone owns the MapLibre instance. UI controls send typed commands through
  createMapController; map sources and layers belong in `mapConfig.ts`.
- Drawing and reporting controllers own geometry state, validation, Turf measurements
  and report assembly. Components present state and issue commands; display adapters
  translate state into MapLibre layers and CSS-derived paint values.
- Live map settings follow the existing App → HomeMap → MapCanvas → controller path.
  Do not create a parallel store or let controls reach into MapLibre directly.

## Navigation and map lifecycle

Routing uses browser history and hashes without a routing dependency. A hidden HomeMap
is inert but remains alive. When leaving it, stop active camera movement and prevent GPS
callbacks from recentering an inert map; location observation itself may continue.
Unsupported routes must fall back safely without inventing pages or persisted state.

## External data and geolocation

Raster tiles come from Kartverket, OpenStreetMap and Esri; search uses Geonorge address
and place APIs. Retain search response validation, stale-request cancellation and
explicit loading/empty/error states. Render provider strings as text, never raw HTML.

Preserve geolocation's secure-context, permission, cancellation, camera-following and
iOS paths with their regression tests. Reporter GPS and obstacle geometry are distinct;
either may be unavailable. Never invent coordinates, derive them from UI placement or
substitute reporter position for an obstacle. Geographic measurements come from runtime
map/data APIs.

## Security and persistence

Treat state as transient unless the implementation explicitly proves otherwise.
Selection completion is not durable saving or production submission. Search and tile
requests disclose queries or viewed areas to their providers, and geolocation requires
browser permission. Never log precise locations or place secrets in this frontend.

Storage or submission work must first define authentication, authorization, retention,
deletion, validation, retry/error handling and the user-visible lifecycle. It requires a
reviewed backend design rather than frontend mocks.
