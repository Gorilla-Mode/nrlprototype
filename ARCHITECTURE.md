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

The map error-report controller owns registered-obstacle targeting and position
correction for circle and crosshair input. Crosshair matching uses the measured rendered
width and canvas midpoint in CSS pixels, refreshing on movement and resize. Selection
and position confirmation stop the camera and sample again; neither creates new obstacle
geometry. Disabling crosshair clears ordinary targeting, including a previously placed
circle, until a new hold places one. Active position correction preserves its geographic
candidate and original registered position while switching input methods, but discards
the saved ordinary target when crosshair is disabled. Starting correction in crosshair
mode does not save its midpoint as an ordinary circle. Circle-only correction cancellation
restores the prior circle. The error-report form keeps its own answers and the existing
prototype completion handler.

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
The keypad wrappers reuse ObstacleReportPanel or ObstacleDetails and their routes,
selecting internal height-control options whose defaults remain scrolling and wheel.
HeightKeypad owns temporary input and modal focus. One-step keypad converts confirmed
input to whole metres, bounds it to 0–500 and applies it directly through onheight,
independently of the scrolling controller. Both one-step variants support feet display
and entry; two-step keypad uses metres only.

“One step — keypad” (`one-step-keypad`) is the default when debug is off or the
reporting parameter is missing or invalid. Explicit `reporting` overrides require
`debug=1`, which also exposes the menu selector. It offers `one-step-keypad`,
`one-step` (“One step — scrolling”), `two-step` and `two-step-keypad`.
Combine query parameters with `&` before any route hash.
How to Report an Obstacle is a public page at `#/Help/ReportObstacle`, reachable from
Menu, FAQ drawing instructions and Settings support. It uses the normal history, page
focus and inert-map lifecycle and describes the active placement variant. Legacy `help`
parameters are ignored and do not affect map layout.
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
All views use canonical metres, the same six obstacle types, and original photo files.
Absent-obstacle results omit height and illumination; Other alone includes custom type.

Close and successful Save Draft return to the map with Resume details. Delete discards
the active draft. Finish clears the map selection and opens a shared, session-only result
summary; closing it releases that result. Reload loses drafts and results. These actions
do not write to the mock report lists or provide durable saving or submission. Browser
history cannot restore a report route without its matching in-memory draft or result.

## Placement editing variants

`src/lib/map/placementEditing.ts` resolves the independent `placementEditing` query
parameter only with `debug=1`. Missing or invalid values use `default`. The debug menu
selects `default`, `basic`, `persistent-donut`, or `two-finger`, preserving reporting,
unrelated parameters, deployment paths and hashes. Changes replace the URL and reload;
selecting the current choice does nothing. The value passes through App → HomeMap →
MapCanvas → createMapController and remains fixed for that map instance.

Default placement retains hold/drag/release and immediate Point completion. All three
editing variants allow placed vertices to move while drawing, including crosshair
geometry. Only Basic defers Point completion: its single vertex cannot be appended;
Complete opens the existing report form once. Completing locks every geometry. Editing
does not create another reporting session or restart reporter GPS.

The drawing controller replaces coordinates immutably, validates and measures during
moves, and allows invalid intermediate geometry while disabling Complete. Each changed,
committed move adds one Undo entry; additions and moves undo in chronological order.
Cancelled or unchanged moves add none. Undo never removes the initial vertex.
`createVertexEditingInteraction` resolves nearest projected vertices within CSS-resolved
semantic target diameters: 72 px for touch and 44 px for mouse/pen, with vertex-order ties.
Basic and Persistent activate after 100 ms for touch or 200 ms for mouse/pen; movement
beyond 8 px before activation remains navigation. Two-finger activates vertex editing
immediately. Moves preserve grab offset, stop camera movement, suppress conflicting
gestures and restore their original enabled states. Cancellation restores coordinates.
Pointer cancellation, lost capture, second touch, blur, hidden maps, resize, mode changes,
Delete and teardown cancel gestures. Typed projected handles expose keyboard editing.

Persistent donut ignores its opening release. Subsequent center drags beyond 8 px move
its screen and geographic center together, leaving the map stationary and the donut open.
Center taps cancel; sector and outside taps use the existing angle selection. A focusable
donut wrapper supports keyboard arrows to move the center, Shift for faster movement,
1/2/3 to choose Point/Line/Polygon, and Escape to cancel. There are no separate geometry
buttons, center button or tutorial panels.
Two-finger placement keeps ordinary hold/release selection, but adding a second touch to
an open donut pans the map using touch-centroid deltas and MapLibre `panBy` without
animation. Zoom, bearing and pitch stay unchanged, and placement is sampled under the
fixed donut center. Controller-driven camera events bypass ordinary hold cancellation.
Selection is suspended until the second finger lifts. Lifting the original finger first
cancels. Normal pinch and pan remain available outside this gesture. Error reporting and
registered-obstacle position correction retain their existing gesture paths.

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
