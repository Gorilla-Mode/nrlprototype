# NRL visual baseline

This document records visual decisions that are not obvious from the implementation.
`src/styles/stylesheet.css` is the source for actual tokens, values, themes, component
aliases and breakpoints; inspect it instead of copying those details here.

## Non-negotiable rules

- The map is the work area. Overlay controls and panels remain opaque, legible and
  visually stable over topographic, aerial and grayscale backgrounds.
- Components consume semantic or component tokens. Add reusable values to the
  stylesheet rather than hardcoding them locally or branching styles by theme.
- Green communicates affirmative action, blue focus/selection/information, amber
  warning and red error/destruction. Always pair meaning with text, shape, icon or ARIA
  state; colour alone is insufficient.
- Normal text targets 4.5:1 contrast and meaningful control graphics 3:1 against their
  surface. Verify overlays on real map imagery, not only a neutral test page.
- Every supported interaction exposes visible focus and distinct hover, pressed,
  selected, disabled, loading, error, empty and completed states where applicable.
  Unsupported actions must be explicitly unavailable.
- Interactive targets are at least 44 × 44 px. Content must wrap or scroll rather than
  clip, and controls respect safe-area insets and MapLibre attribution.
- Respect reduced motion while preserving state feedback. Dialogs manage initial and
  return focus and make their background inert.

## Map-specific decisions

MapLibre paint values come through the typed CSS-to-drawing-display bridge. Geometry UI
uses names and distinct Point/Line/Polygon shapes as well as colour. Geographic drawing
paint remains contrast-oriented and independent of the UI theme; grayscale affects
raster basemaps only. Keep boundaries and editing vertices visible on varied imagery.

Preserve the radial selector's choice arrangement, original press coordinate, central
cancellation zone and generous sectors. Expanded SVG paths must stay inside the viewport
for Safari. Geometry starts through the established hold/radial interaction unless a
feature explicitly replaces it.

Expanding map controls overlay rather than reflow neighbouring buttons. Covered controls
become hidden and inert; dismissal restores focus. Preserve ordinary MapLibre keyboard
interaction and return focus deliberately after destructive actions.

Inline custom properties are reserved for documented runtime data such as pointer or
sector positions, slider percentage, measured geographic scale width and CSS-token
aliases. Presentation constants belong in the stylesheet.

Selection completion must not claim that a report was submitted or saved. This is a
workflow prototype, not an operational navigation product.

## Visual validation

Inspect 390 × 844, portrait iPad 834 × 1194 and 1440 × 1024 in light and dark themes.
Exercise topographic, aerial and grayscale maps; keyboard focus and interaction states;
loading/error/empty/completed states; clipping, safe areas, attribution, overlay overlap,
geometry visibility and virtual-keyboard changes. Report the actual environment because
browser emulation is not physical iPad/Safari verification.
