# Architecture and data

## Current boundaries

This is a static Svelte 5/TypeScript/Vite frontend. MapLibre renders raster maps;
there is no application backend, database, authentication or submission endpoint.
`src/main.ts` imports MapLibre CSS before the central stylesheet and mounts App.
App keeps HomeMap mounted without a report-registration consumer and owns the
native hash routes for FAQ (`#/FAQ`) and Settings (`#/Settings/<section>`). Entering
a page pushes history; Settings section changes replace the current entry. Closing
returns to the map/drawer; direct entries fall back to the map. No routing library is used.
App owns shared satellite opacity, grayscale, location feedback and session-only language.

- **HomeMap / MapToolbar / controls:** Svelte rune state, layout and user actions.
  MapCanvas owns mounting/teardown and forwards typed commands to the map controller.
- **Menu / FAQ / Settings:** App owns page and drawer state. HomeMap binds drawer state.
  MenuDrawer uses a native modal dialog with explicit focus and scroll restoration.
  FaqPage owns its query and expanded answer; faq.ts supplies static content and
  case-insensitive substring filtering. No requests or storage are involved.
  Missing guide/support destinations are disabled rather than linked to invented pages.
  SettingsPage owns layout and delegates profile, account, map and language presentation
  to focused views. Map bindings and synchronous location commands use the same
  HomeMap / MapCanvas / controller path as floating controls. Account/security/offline/
  notification controls are disabled. There is no standalone Drawing Guide; its future
  content belongs to the reporting guide.
- **createMapController:** coordinates map lifecycle, search camera movement,
  geolocation, drawing, drawing display and report registration. Controls must use
  its interface rather than acquire the MapLibre instance themselves.
  Grayscale changes saturation on the three raster layers, not the canvas; raster
  settings are reapplied after style loading.
- **Drawing:** createMapHoldController handles pointer capture and cancellation;
  createMapDrawingInteraction translates hold/radial selection and map taps into vertices.
  createDrawingController validates geometry, measures with Turf, and owns
  idle/drawing/completed states. createDrawingDisplay resolves CSS tokens for WebGL,
  watches theme changes, and restores layers after a map-style load.
- **Reporting:** createReportController combines completed GeoJSON with optional
  reporter GPS and generates an ID/timestamp. Description and height are placeholders,
  not collected report metadata. Registration currently ends at an optional callback.
- **Search:** createLocationSearchController owns debounce, cancellation and result
  selection. locationSearch parses/ranks Geonorge address/place responses. SearchBar
  implements the combobox; selecting a result moves the camera and releases GPS following.
- **Geolocation:** controller and display are separate. Preserve iOS permission,
  cancellation and camera-following behaviour and its regression tests.

During FAQ or Settings, HomeMap is visually hidden and inert, retaining geometry, camera and
layer state. Browser validation demonstrated that inertia/camera animations and GPS
recentring could still move the hidden map. A narrow stopCamera command stops an
in-flight animation on hiding, and the GPS recenter callback skips inert map ancestors.
Location observations continue updating normally; no page-suspension controller,
map serialization or automatic permission request is introduced.

MetricScaleControl is a small MapLibre IControl registered bottom-right. It samples
map-centre ground distance through public unproject/project/distanceTo APIs and picks
a fitting 1/2/5 distance. Labels retain 1000 m and use kilometres from 2 km. Movement,
resize and projection changes update the width; teardown removes its listeners.

## Security and data handling

- Geometry and reports live in memory. Refresh loses them. No localStorage, autosave,
  durable draft or server submission exists; UI/documentation must not imply otherwise.
- Search text goes to Geonorge's address and place APIs. Raster requests go to
  Kartverket, OpenStreetMap and Esri, revealing requested map areas to those providers.
- Browser geolocation requires a secure context and user permission. Reporter GPS is
  distinct from obstacle coordinates and may be null. Location failure must not invent
  coordinates or silently turn reporter position into obstacle position.
- Treat search responses as untrusted input: retain validation, text rendering and
  stale-response cancellation. Never render provider content as raw HTML.
- Never commit credentials, tokens or .env files. Do not add precise-location logging.
  Secrets cannot be protected inside this static frontend.
- Before adding storage/submission, decide retention, access control, deletion,
  authentication and error/retry behaviour. That future work warrants a separate
  security/data document and reviewed API design; it is not implied by this prototype.

## Development boundaries

Use existing typed controller interfaces, Svelte 5 runes and tests. No new dependencies
without permission. Do not introduce routing, global state frameworks or service layers
for styling work. Deployment remains GitHub Pages; deployment/workflow changes are
separate tasks. For verification commands and task-based reading, start with AGENTS.md.
