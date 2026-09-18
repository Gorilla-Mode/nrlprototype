# NRL visual baseline

The map is the work area. Controls must remain readable over topographic detail,
water, urban areas and aerial imagery. Prioritise portrait iPad use and outdoor
readability. This is a prototype, not an operational navigation product.

## Source of truth

`src/styles/stylesheet.css` owns design values: base palette/scales, semantic roles,
then component aliases. Components consume semantic tokens, not base palette values.
Add a missing value centrally before using it. Light, dark and system themes rebind
the same roles; components must not branch their colours by theme.

No component-local literal colours, spacing, padding, radii, shadows, font sizes,
control/icon sizes, opacity, layers or motion. Functional CSS, percentages, SVG
coordinates, map data and runtime-derived values are exceptions. Keep responsive
thresholds few and explain component-specific exceptions. Dynamic inline properties
are limited to pointer/sector positions (`--hold-x/y`, `--radial-item-x/y`), slider percentage
(`--map-slider-position`), measured scale width (`--map-scale-width`) and geometry token aliases (`--geometry-color`,
`--radial-color`). Drawing paint values are resolved from CSS in `createDrawingDisplay`.

## Surfaces and interaction

| Role | Treatment |
| --- | --- |
| Search, results, notices, geometry picker, drawing toolbar | Opaque raised surface, shared border and control shadow |
| Floating map buttons | Opaque raised background; fully opaque foreground; circular shape retained |
| Radial sectors | Opaque neutral surface, geometry-coloured icons; hover adds a 12% colour tint, outline and expansion |
| Map polygon fill | 15% dark neutral; boundary and vertices remain visible |
| Primary action | Green fill with paired action text token; one dominant action per task |
| Secondary action | Neutral surface and border; coloured hover/pressed surface |
| Selected toggle/result | Blue foreground, tinted surface and border/inset indicator; use ARIA state |
| Destructive action | Red text and labelled action, error-surface hover/press; press also adds a red border |
| Disabled | Native disabled attribute, muted text, stable opaque surface; no enabled hover styling |
| Focus | Shared blue 2 px outline with 4 px offset; never remove without an equivalent visible indicator |
| Status | Green success, blue information, amber warning, red error; always add text/icon |

Use the existing subtle shadows; do not compensate for unreadable transparency with
blur or text shadows. Background opacity must not fade the contents. Contrast targets:
4.5:1 for normal text and 3:1 for meaningful control graphics against their surface.
Check translucent buttons over actual maps, not just a white test page.

## Kartverket alignment

The [official colour manual](https://www.kartverket.no/om-kartverket/kartverkets-identitet/farger)
is the source for green `#1A833B`, dark blue `#1A589F` and red `#D72800`.
In the light theme these identify primary actions, selection/focus/information, and
errors/destructive actions respectively. Green hover `#156630`, pressed `#1A532A`,
and success text `#156630` are NRL semantic choices; the darker success foreground
maintains text contrast on the pale success surface. Do not use brand green for
small success text on that tinted surface. Keep destructive pressed surfaces in
the error role: official red on the generic blue pressed surface falls below 4.5:1.

Dark-theme foregrounds, neutral surfaces, tints and geometry colours remain
NRL-specific. The brand colours are not interchangeable with accessible foreground
colours in every theme. Do not add unused brand colours just to reproduce a palette.

The [current digital guidance](https://design.kartverket.no/) describes an alpha
design system. Follow its clear action hierarchy, labelled controls and consistent
typography without importing its React library. Retain NRL's map-control circles,
larger touch targets, existing radii, solid panels and subtle shadows; a general
website's component dimensions and decorative identity elements are not requirements
for a map overlay.

## Geometry and icons

Geometry controls use amber (`--color-map-point`), blue (`--color-map-line`) and teal
(`--color-map-area`) foregrounds with light/dark variants. Map paint is separate:
Point is red (`--color-drawing-point`), Line/Polygon outlines are dark neutral
(`--color-drawing-outline`), and editing vertices are light with dark borders.
Dashed boundaries are 3 px with a 1 px light casing on each side at 70% opacity;
matching absolute dash lengths keep the gaps transparent. This casing addresses
lost dashes over lakes and shaded aerial terrain observed in browser comparisons.
Map paint does not invert with the UI theme. Grayscale affects only raster basemaps.
Geometry names
and shapes accompany colour. `GeometryIcon` supplies a dot/ring, connected angular
route and closed polygon; reuse these in geometry choices. Other map icons retain
their existing meanings. Use 24-unit SVG viewports, 24 px primary icons and the shared
1.75 stroke; no icon dependency is needed.

The literal brand alternative (orange `#FA782D`, dark blue `#1A589F`, purple
`#8C4799`) is not adopted. Orange has only 2.70:1 contrast on the white radial
surface, while dark blue and purple have 2.09:1 and 2.47:1 on the dark radial
surface. Keep the existing theme-aware geometry roles, labels and shapes rather
than applying these brand values indiscriminately to both map paint and UI text.
Map-background visibility still needs visual checks; surface contrast alone cannot
establish readability over changing cartography or aerial imagery.

Keep the radial menu's Point-top/Line-right/Polygon-left arrangement, original press
coordinate, central cancellation zone and generous outer selection sectors. Keep
expanded paths inside its SVG viewport for Safari. Near screen edges the gesture
menu can still be clipped; geometry starts only through the hold/radial interaction.

## Sizing and layout

- Use the 4 px spacing scale: 4, 8, 12, 16, 20, 24, 32, 48, 64. Default controls are
  48 px; practical targets must be at least 44 × 44 px, with an 8 px control gap.
- Shared inline gutters: 16 px mobile, 24 px from 48rem, 32 px from 75rem. Map
  controls use shared safe-area/edge tokens; normal content uses the content maximum.
- Radius set: 8 px small elements, 12 px controls/search, 16 px panels/cards,
  24 px dialogs. Retain circles for existing floating map buttons and point symbols.
- Use self-hosted Inter with the existing system fallbacks. Search input is 16 px,
  supporting text 14 px, secondary captions 12 px. Regular/medium/semibold weights
  are 400/500/600; preserve the existing line-height scale.
- Search is capped at 38rem on desktop. Results scroll within the viewport. Keep
  navigation at the right; the map remains edge to edge.
- Place the layer slider beside its trigger, never over the next control. Drawing
  guidance and actions use natural height and wrap on portrait tablets/phones.
  Reserve attribution and bottom safe-area space.
- Dialog header/body/footer, when added, share `--dialog-padding-inline`.

### Font delivery

[Kartverket's digital typeface is Inter](https://www.kartverket.no/om-kartverket/kartverkets-identitet/typografi).
`src/assets/fonts/InterVariable.woff2` is the unmodified normal variable font from
[Inter v4.1](https://github.com/rsms/inter/tree/v4.1), with its upstream licence in
`src/assets/fonts/OFL.txt`. One local `@font-face` covers weights 100–900, using
`font-display: swap`, automatic optical sizing and the `cv05` lowercase-l tail
recommended by the digital guidance. No font package or runtime CDN is required.
Check both loaded Inter and blocked-font fallback rendering for clipping and wrapping.

## Behaviour and verification

The menu is a solid right-side native dialog, capped at 400 px. It uses 48 px minimum
rows, 18 px icons inside 34 px bordered containers and explicit unavailable labels.
My Profile and Settings use the same Settings profile view. MAP AND VIEW and
standalone Drawing Guide are absent. HELP contains reporting guide, FAQ, Help & Contact.

FAQ is a separate opaque scrolling page with a sticky header, 680 px content column,
grouped accordion cards and no surface shadows. It uses the app's Inter font and
semantic light/dark colours, as approved instead of the supplied IBM Plex/fixed-light
palette. FAQ-specific dimensions live in central component tokens. Its gutters are
16 px on phones, 24 px from 768 px, and 32 px from 832 px for portrait iPad alignment.
Body/answer text is 16 px; the supplied safety/note treatment is 15 px. Touch targets
are at least 44 px and question rows at least 56 px. Text containers grow naturally.
The prototype notice and disabled guide/support actions explain absent workflows;
the conditional offline-map question is omitted. Do not force an exact page height.
Answers reveal over 170 ms, with animation disabled for reduced motion. Focused
questions scroll below the sticky header. Back restores the drawer's scroll/focus.

All application surfaces use the shared neutral gray palette in light, dark and system
themes. Search and utility controls are opaque. Blue marks focus, selection, interaction
and information; green marks affirmative actions, success and safety. Geometry paint
keeps its fixed contrast-oriented colours.

Settings uses one rounded neutral shell, a 220 px sidebar from 768 px, and content
capped at 680 px. Mobile uses a native section selector above independently scrolling
content. Forms use 16 px text and 44 px minimum labelled touch targets. Unsupported
account/auth/notification/offline controls stay explicitly unavailable; no example
identity data is displayed. The native language select offers only Norsk and English.

The metric scale is a thin line with end caps and a centred label above attribution.
Its light halo keeps dark ink readable across basemaps without a decorative card.
Drawing controls reserve footer clearance. Scale width is geographic runtime data;
all other visual values remain in stylesheet tokens.

Search exposes loading, empty and error states. Geometry completion says selection
is complete; it must not claim a report was submitted or saved. Geometry starts only
through mouse/touch hold and the radial selector. Map taps append vertices. Preserve
Undo/Delete/Complete and ordinary MapLibre keyboard panning; Delete returns focus
to the map canvas. There is no centre-entry workflow.
All actions need keyboard access and visible focus. Respect reduced motion; retain
textual status when animation stops.

Check light and dark at 390 × 844, 834 × 1194 and 1440 × 1024. Include topographic,
aerial and grayscale maps; keyboard focus, hover, pressed, selected, disabled,
loading/error/empty/completed states; clipping, attribution, slider overlap and
virtual-keyboard viewport changes. Desktop emulation is not a physical iPad/Safari
test: state explicitly which was performed.

## Why this baseline

On 2026-09-11, `d930574` migrated component styles; `5a021ba` removed App.css;
`027b129` established tokens and tests. `c5c8143` reverted the Svelte migration,
leaving undefined old tokens. Later reporting/search merges inherited those names.
Computed backgrounds became transparent and radial fills black. The reason for
the revert is not recorded in its commit message.

The repair keeps the new semantic system. Historical `3edec27` used amber Point,
purple Line and teal Polygon; the current standard keeps amber/teal and uses the
newer blue Line role. Preserve the Safari viewport fix from `fc49eb6`. Repository
inspection found starter SVG/image assets and historical CSS, but no NRL mockups,
Figma exports, Base44 references or identifiable Claude design artifacts.
