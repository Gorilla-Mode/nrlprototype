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
- Dialog actions put the primary action right of the secondary one, right-aligned with
  label-based widths; below 30rem they stack full width with the primary on top.
  DialogActions keeps DOM and Tab order equal to the visual order; focus starts on the
  primary action. The secondary action is a borderless text button of the same height.
  Report dialogs use the shared Dialog: left-aligned title on the X's line, an optional
  small status icon before it and a muted subtitle indented under the title text.

## Map-specific decisions

MapLibre paint values come through the typed CSS-to-drawing-display bridge. Geometry UI
uses names and distinct Point/Line/Polygon shapes as well as colour. Geographic drawing
paint remains contrast-oriented and independent of the UI theme; grayscale affects
raster basemaps only. Keep boundaries and editing vertices visible on varied imagery.

Preserve the radial selector's choice arrangement, original press coordinate, central
cancellation zone and generous sectors. Expanded SVG paths must stay inside the viewport
for Safari. Geometry starts through the established hold/radial interaction when
crosshair mode is off. The right-side crosshair toggle starts off and retains its state
for the map session. When on, a bottom geometry picker and Report obstacle button start
a selection at the visible crosshair; Line and Polygon add vertices through Add point.
Map taps and holds navigate without placing geometry in this mode. Every placement variant
shows Edit beside Add point in a full-width footer row: Edit/Cancel keeps its natural width,
and Add point/Place point fills the remainder. Edit identifies the nearest point in its
accessible label. Editing announces “Editing point N”, focuses Place point, disables Undo
and Complete, and preserves Delete. Cancel or Escape returns focus to Edit; confirmation
returns to Add point (Complete for Basic Point). Basic Point has Edit without Add point.
Lighter red candidate points and affected edges preview placement without replacing
committed vertices, edges or fill. Preview segments match the placed black lines: 6 px
long, 3 px thick, with a 1 px white outline, using shared size and thickness tokens.
Foreground and casing segments share their positions along the path and their lengths. The white casing
extends only sideways, perpendicular to the path, leaving black connector gaps visible.
Before editing, a 2 px solid black connector with
1 px white casing and a distinct target ring identify the nearest vertex. Render the
connector below the dotted preview so overlapping paths alternate black and red. Editing retains
the ring at the locked original vertex and replaces the connector with a movement arrow
toward the candidate marker's outer edge. Its head is 10 × 10 CSS px, shrinking for short
moves and hidden for overlapping endpoints. No new polygon fill is previewed. Preview
paint stays independent of theme.
Switching modes keeps the current selection and restores the corresponding input method.

The independent debug Placement editing selector offers the unchanged default and three
editing modes. Placed geometry keeps its existing map rendering. Editing targets use
semantic diameters of 72 px for touch and 44 px for mouse/pen, resolved to CSS pixels for
hit testing. They are keyboard focusable and labeled by point order; their opaque numbered
handle appears on focus. Arrow keys move by 16 CSS px, Shift multiplies movement by four, and
Escape cancels an unfinished move. Basic and Persistent use hold-then-drag after 100 ms
for touch or 200 ms for mouse/pen; Two-finger uses immediate dragging. Complete locks
placement, with Point confirmation exposed only in Basic. Add point is unavailable for
its single Point vertex. Undo follows additions and moves, including moves of the initial vertex.

Persistent donut allows sector hover and geometry selection on the opening hold's release.
Releasing within the 96 px center radius, including its boundary, keeps it open. Later
center drags beyond 8 px pan the map beneath the fixed donut; drag releases keep it open
without selecting geometry. Later center taps cancel, and sector/outside taps choose by
angle. Its wrapper is keyboard focusable and shows focus only for keyboard input: arrows
pan map content in the arrow direction by 16 CSS px (64 with Shift), 1/2/3 select geometry,
and Escape cancels. Placement uses the updated geographic coordinate beneath the donut.
No separate center button or tutorial panel is displayed.
Guidance lives in the public How to report an obstacle page, built from the Figma
reporting-tutorial frame (five steps, its copy verbatim). Its form examples are static
pictures without controls; its example map is real but never creates a report.
Drawing footers retain labels, counts, measurements, completion and validation feedback.
The crosshair geometry picker uses one equal-width three-column row with icons above
labels and native radios. Report obstacle has its own row on phones and portrait tablets.
Drawing and error-report footers share the attribution/scale safe-area inset plus 40 px
clearance, with no Help-specific offset, height cap or internal scrolling. Position correction
stays bottom-anchored and retains coordinates, distances and validation without prompts.

Error reporting also supports crosshair input: its toolbar replaces geometry choices
with Report error, enabled for the nearest registered obstacle within half the measured
crosshair width. Its toolbar width stays stable as obstacle guidance changes, using the
form-width token within the map gutters. The selected obstacle is highlighted.
Wrong-position correction uses the visible midpoint when crosshair mode is on and the
draggable circle when it is off; switching input methods preserves the geographic
candidate and form answers.
Outside correction, turning crosshair off clears targeting, including any previously
placed circle, and returns to a no-selection status with selection disabled. After
correction has switched from crosshair to circle input, ending it also requires a new
hold for ordinary targeting. Circle-only correction cancellation restores its prior circle.

Expanding map controls overlay rather than reflow neighbouring buttons. Covered controls
become hidden and inert; dismissal restores focus. Preserve ordinary MapLibre keyboard
interaction and return focus deliberately after destructive actions.

Inline custom properties are reserved for documented runtime data such as pointer or
sector positions, slider percentage, measured geographic scale width and CSS-token
aliases. Presentation constants belong in the stylesheet.

Selection completion must not claim that a report was submitted or saved. This is a
workflow prototype, not an operational navigation product.

The two-step reporting-details dialog follows a 684 × 1064 portrait reference and scales
uniformly to fit the viewport in either orientation. Only its height wheel and the
step-2 description textarea scroll; the dialog itself does not. The “Two steps — keypad”
variant replaces the step-1 wheel with a full-width metres button using the footer
button-height token, while keeping the same dialog dimensions and flex layout.
This requested exception to the usual minimum target size also scales text and controls
down in narrow Split View and phone viewports. Type selection never changes typography.

The default “One step — keypad” reporting dialog keeps the one-step fluid width and
scrolling body. Its full-width height button starts at 30 m, shares the footer button
height token and is disabled while busy or Not present. Both one-step variants retain
the metres/feet toggle, initially metres. “One step — scrolling” keeps its horizontal
height picker and optional numeric keypad. All variants collect the
same metadata and use the same session-only completion summary. Their layouts and picker
styles remain distinct for user testing. The one-step views and two-step keypad view share
a numeric modal with a temporary entry; only confirmation updates the draft. Cancel,
Escape and backdrop dismissal discard edits. The modal traps focus, makes the form
inert, restores trigger focus on close and scrolls if the available viewport shrinks. Closing
the form discards any pending edit. The reporting selector and explicit URL overrides
require `debug=1`; otherwise the keypad default is used. Missing or invalid reporting
parameters also select that default. All four variants remain available in the debug menu.

## Visual validation

Inspect 390 × 844, portrait iPad 834 × 1194 and 1440 × 1024 in light and dark themes.
Exercise topographic, aerial and grayscale maps; keyboard focus and interaction states;
loading/error/empty/completed states; clipping, safe areas, attribution, overlay overlap,
geometry visibility and virtual-keyboard changes. Report the actual environment because
browser emulation is not physical iPad/Safari verification.
