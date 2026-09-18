# Implementation status

This records capabilities, not a production-readiness claim. Update relevant rows
when behaviour changes; do not turn it into a chronological work log.

| Capability | Current state / next step |
| --- | --- |
| Map | Topographic/aerial fade, raster-only grayscale, search and geolocation implemented; geometry retains its colours in grayscale |
| Geometry | Point/Line/Polygon, hold-and-drag selection, Undo/Delete, validation and measurements |
| Reporting | Geometry registration callback and optional GPS exist; metadata form, submission, report list and confirmation receipt do not |
| Visual system | Central semantic tokens, stable map surfaces, fixed contrast-oriented map geometry paint, theme-aware controls; follow DESIGN_SYSTEM.md |
| Themes | System theme and root data-theme light/dark supported; user-facing preference/persistence postponed |
| Language | Session-only Norsk/English preference in Settings; interface remains English; no translation framework or persistence |
| Units | Metric map scale derived from geographic distance, with 1000 m formatting; approximate drawing metres and square metres; aviation-related feet preference postponed; retain canonical geometry and explicit unit labels |
| Help/FAQ | Full-screen static FAQ at #/FAQ, immediate local search and single-answer accordion; prototype notice distinguishes intended reporting from implemented features; guide/support actions are disabled |
| Loading/empty/error | Search and geolocation feedback exist; general map loading/error UI remains future work |
| Success | Geometry selection completion is visible; it is not saved/submitted success |
| Drafts/autosave | In-memory geometry only; durable recovery has value, but retention and lifecycle must be decided before storage |
| Shared components | Existing MapButton, shared button styles and geometry symbols; no new framework needed |
| Responsive | Mobile, portrait tablet and desktop tokens; physical-device validation remains distinct from browser emulation |
| Menu / Reports buttons | High-level drawer links to shared Settings profile, Settings, Language and FAQ; the toolbar Reports button opens the report list page at #/Reports; Notifications/support/Log Out remain unavailable |
| Reports | Full-screen list at #/Reports with 10 mock reports, status badges and computed tab counts; search, Filter, Select and My drafts are shown but not wired, and there is no detail page yet |
| Settings | Responsive shell with seven views; map blend/grayscale and location actions share live map state; profile, security, notification and offline features are unavailable placeholders |

## Deliberately deferred

Backend/database, authentication, offline downloading, persistent drafts, autosave,
translations, unit preferences and production NRL integration remain unimplemented.
Reporting guide (including drawing instructions) and Help and contact remain unavailable.
Avoid speculative infrastructure. README is the current product brief; create a
separate PROJECT_SPEC only when a larger feature needs a decision-complete specification.

## Known limits

- Live search for Oslo exposed duplicate Geonorge place IDs and a Svelte keyed-list
  error. The existing parser does not deduplicate these records. This predates the
  styling repair and requires a separate search-data fix.
- A radial gesture near the screen boundary can be clipped. The SVG viewport fix
  prevents internal Safari hover cropping; the hold/radial workflow remains the only entry.
- Browser-emulated portrait dimensions do not establish physical iPad/Safari behaviour.
- External map/search services remain network dependencies. MapLibre accounts for much
  of the application bundle; splitting is outside this task.
