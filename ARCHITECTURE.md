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

## Reporting variants

`src/lib/reporting/reportingVariants.ts` registers each reporting view with its ID,
label, component and ordered step routes. Views implement `ReportingVariantProps` and
share `createDetailsController` for metadata, validation, draft actions and completion.
To add another flow, add its view and registry entry; keep map drawing and GPS separate.

One-step is the default. `?reporting=one-step` and `?reporting=two-step` select a flow;
`?debug=1` exposes the menu selector. Combine them with `&` before any route hash.
Changing the debug selector replaces the current URL and reloads the application,
clearing the drawing, draft, map view and other session state. Selecting the current
variant does nothing. The URL keeps its deployment path, unrelated query parameters
and hash; report routes without an in-memory draft or result fall back to the map.
The active variant is captured when drawing starts. Reloading starts a fresh session
using the selected variant, including if geometry or reporter GPS was pending.

Completing geometry opens details immediately, independently of reporter GPS. The
original high-accuracy location request continues in the background and updates only
its matching session draft without changing edits or navigation. Save Draft, dismissal
and Continue use the GPS available when invoked; previously delivered payloads stay
unchanged. Only Finish waits for pending GPS before assembling its payload. Failure or
timeout permits finishing with null reporter GPS. Deletion and replacement invalidate
late callbacks, and leaving details during the GPS wait cancels that Finish attempt.

App supplies session-only Save Draft and Finish handlers, awaiting optional external
`onSaveDraft(payload, reason)` and `onFinish(report, { variantId })` hooks. Existing
one-argument Finish callbacks remain compatible. `onContinue` is an intermediate hook.
Both views use canonical metres, the same six obstacle types, and original photo files.
Absent-obstacle results omit height and illumination; Other alone includes custom type.

Close and successful Save Draft return to the map with Resume details. Delete discards
the active draft. Finish clears the map selection and opens a shared, session-only result
summary; closing it releases that result. Reload loses drafts and results. These actions
do not write to the mock report lists or provide durable saving or submission. Browser
history cannot restore a report route without its matching in-memory draft or result.

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
