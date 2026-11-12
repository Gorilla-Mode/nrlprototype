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
  state; colour alone is insufficient. See Colour rules and statuses below.
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
  label-based widths; below 30rem they stack full width with the primary on top. The
  report summary always stacks its large-target actions.
  DialogActions keeps DOM and Tab order equal to the visual order; focus starts on the
  primary (green) action. The secondary action is a tertiary text button of the same height.
  Report dialogs use the shared Dialog: left-aligned title on the X's line, an optional
  small status icon before it and a muted subtitle indented under the title text.

## Colour rules and statuses

Only the Kartverket palette in `stylesheet.css` is used; no new colours are added. If a
needed colour is missing, ask Kartverket rather than inventing one.

- Green (`--color-action-primary`) is for primary buttons only. As a status, green means
  approved or successfully completed, never "not done yet".
- Blue (`--color-action-secondary`) is for links, text buttons and selected or active
  states: a chosen filter chip such as All, a selected option, a following location button.
- Report statuses have fixed colours (`--color-status-*` with a `-surface` pair) and the
  same name everywhere, in the Reports filter, cards, detail pages and Notifications:

| Status (code)            | Name          | Colour token              | Colour         |
|--------------------------|---------------|---------------------------|----------------|
| `draft`                  | Draft         | `--color-status-draft`    | neutral grey   |
| `ready`                  | Ready to send | `--color-status-ready`    | blue           |
| `pending`                | Sent          | `--color-status-sent`     | green          |
| `under-review` (notice)  | Under review  | `--color-status-review`   | amber          |
| `approved`               | Approved      | `--color-status-approved` | green          |
| `declined`               | Declined      | `--color-status-rejected` | red            |

The notification status Completed keeps the information blue until its meaning is decided.
`StatusBadge` is the one status tag on cards, edit and detail pages. Draft has a pencil,
Ready to send a clock and Sent a check: they are decorative (`aria-hidden`), and the text
is at least 4.5:1 on its surface. Sent is green because the report was delivered.

Report cards show the heading and status tag first. Next comes the place (a pin, then the
stored place name or the coordinates), then the geometry; a draft adds "Missing: …" from
`missingDraftFields`. The footer says "Edited today 13:16" (a date on other days) and holds
the action link. The list's subtitle is "Sorted by last edited". The count is in the tabs
and announced through a hidden live region.

## Designsystemet

Shared components build on Designsystemet (`@digdir/designsystemet-css` and
`-theme`), used as CSS classes because the app is Svelte. `src/styles/designsystemet.css`
maps its tokens onto the NRL tokens, so the app keeps its colours, Inter, radii and dark
theme; never set `data-color-scheme`. Colour roles are set per component with
`data-color`: none (accent) for green primary actions, `neutral` for secondary buttons,
cards and fields, and `brand1` for blue text actions and selected chips. Status tags take
their colours from the `--color-status-*` tokens. Element resets sit in the `app-reset` layer
below `ds`, so they never undo a Designsystemet component.

- Buttons: `ds-button` with `data-variant` primary, secondary (`neutral`) or tertiary
  (`brand1`). Search fields: `SearchField` (`ds-search`), raised with a shadow only on
  the map. Filter chips: `ds-chip` radios without the radio dot. Cards: `ds-card`.
  Status: `StatusBadge` (`ds-tag`), coloured per status as in the table above. Dialogs: `Dialog`
  and `Lightbox` (`ds-dialog`).
- Confirmations: `ConfirmationToast` confirms a finished action without interrupting.
  - Content: `title`, an optional grey `description`, an `icon` and an optional `action`.
    The `icon` is `success`, a green check in a circle (`--confirmation-toast-success`),
    only for a report that was actually sent. Otherwise it is `pending`, a clock
    (`ClockIcon`) in the Ready to send tag's grey (`--color-status-ready` on its
    `-surface`), for a report that was saved but not sent. `draft` is a pencil
    (`PencilIcon`) in the same grey, for Save draft. While the draft confirmation shows,
    the Reports map button pulses a blue ring for `--reports-highlight-duration`. Under
    reduced motion the ring stays static instead.
    The action is a blue link-style button under the text (`--color-action-secondary`).
    `description` may be a snippet when part of it is styled. For example, Report saved
    names the status with its `StatusBadge`, so the status looks the same as in Reports.
  - Layout: a raised, rounded card with a shadow at the bottom centre over the map,
    with X at the top right. There is no green background and no green title.
  - Behaviour: the live region (`role="status"`, `aria-live="polite"`) is always present.
    Nothing moves focus into it. It closes after `confirmationDurationMs`: 5 s plus 1 s
    per started 10 words of title and text. It pauses only while a mouse moves over it
    or the user has tabbed into it, and resumes with the time left. X or a press on the
    map closes it. It slides in and out over
    `--confirmation-toast-motion` (instant with reduced motion).
  - Use: Send report and Save and continue use the card, for new obstacles and error
    reports alike, and so does Save draft for an error report. A failed action uses an
    alert `Dialog`, never this confirmation.
- Report summaries: `ReportSummaryDialog` has a row table with a blue pencil per editable
  row, the fixed saved-not-sent text, and stacked Save and continue (primary) over Send
  report. The new-obstacle and error-report summaries differ only in title and rows.
- The error-report form shares the new-obstacle form's field styles, height button with
  m/ft toggle and keypad, selected blue, and Save draft beside the green Finish report.
  Reports labels error reports `Error report · <obstacle>` on cards and detail pages, with
  the same statuses as other reports.
- A card just saved from the reporting flow (`reports-card-just-saved`) holds the selected
  blue with a blue inset ring, then fades over `--report-saved-highlight-duration` (3 s).
  Under reduced motion it holds, then ends in one step.
- The map toolbars and the reporting forms keep their own controls: they are fixed
  user-test layouts over the map.

Full-screen pages (Reports, report and draft details, FAQ, Settings, Notifications, the
reporting guide) share `PageHeader`: ← and the page title on the left as one back button
(at least 48 px tall, hover and press over both, named by its back label while the title
stays the page's h1), optional actions on the right, on one width, gutter and type scale (`--page-*` tokens). A page never has
both ← and X; X belongs only to dialogs, drawers and popups over a page. In the guide,
← goes to the previous step and, from the first step, back to the previous page.

The report edit page keeps its card layout, with no subtitle and no geometry caption
under Type.
- The header is the same `PageHeader` as the Reports list, with no page overrides: ←, title
  and status tag only.
- At the top of the content, above the first cards and lined up with them, one muted 14 px
  line: "Reported by name, organisation · Last edited today 18:10" (a date on other days),
  in a `<time>` element.
- Three cards come first: Obstacle type, Height above ground and Lighting, a labelled list of
  Yes, lit / No, not lit / Unknown. They stack on phones.
  - Labels are sentence-case `<label>`s, body size, semibold, primary colour.
  - The fields share height (`--control-height-default`), frame, radius and padding, with
    body-size regular text.
  - The lists use our own chevron, inset like the height field's "m".
  - Help text is body-small, secondary, under the field.
  - A missing required value turns the field's own frame red and adds "Required to
    send" with a warning icon, linked with `aria-describedby` and `aria-invalid`.
- Next comes Description and photo (optional): a framed description (`--border-strong`)
  about three lines tall that grows as it fills, with Add photo below it.
- Last is Location in full width, with the shared report map and Edit location.
- Section headings ("Description and photo (optional)", "Location") are `h2`s in sentence
  case, semibold and dark, one size above the field labels.
- When required fields are missing, the summary names them as links that focus each
  field ("1 field still needed before you can send: Height above ground"), never by
  colour.
- Send for Review is then `aria-disabled` (still focusable, sends nothing), and its note
  names what is missing ("Add height above ground to send").
- Every control on the page is at least 44 px tall.

The Ready to send page (`ReportViewPage`) is the edit page read-only. Its three values
are a description list (Obstacle type, Height above ground with "Above ground, at the
highest point", Lighting). "Description and photo" shows the text and thumbnails, or one
muted "No description or photo added". Location has Show on map beside Edit location. The bottom bar has
Edit report beside the same Send group.

A Ready to send error report uses the same page (`ReportViewPage` with its record); only the
cards' content differs.
- Top row: What is wrong and Registered obstacle, then cards for a reported height or lighting.
- Description and photo: the text or "No description added", thumbnails and Add photo, saved at once.
- Location: the same map with both positions, the legend and "Moved 612 m east of the
  registered position · …". Edit location places a point only.

Every report page uses `MiniMap` as its one report map: the edit page, the Ready to send
page, and `ReportDetailPage` for sent and error reports.
- Size: 16:9 of its width, between `--report-map-min-height` and `--report-map-max-height`.
  It follows the width through container units, never by filling the page.
- Zoom: a point at `REPORT_MAP_ZOOM` (15, the earlier preview zoom: roads, buildings and
  place names). A line or area, or an error report's two positions, are fitted with
  margin and never closer than that.
- Marker: 20 px (`--report-map-marker-radius`) with a 3 px white edge
  (`--report-map-marker-stroke`).
- Moved error reports: the registered position is a hollow ring and the reported one a
  filled dot. A legend under the map uses the same symbols.
- Caption: "Point · 60.4053° N, 5.3455° E", without a vertex count.
- Actions sit beside the Location heading as 44 px text buttons:
  - Edit location on the edit page and the Ready page;
  - Show on map on the Ready, sent and error report pages;
  - error reports change their position in the error form, so they have no Edit location.

Send for Review is the blue primary
(`data-color="brand1"`), an exception asked for on this page only. Its note sits
right-aligned beside it.

The Reports top has one row and a set of tabs under it.
- Row: [search] [Geometry ▾] [Height ▾] [✓ Select]. The search takes the rest of the width.
  All four share one height, radius, `--color-border-strong` frame and body-size regular
  text, and line up with the cards. On phones the search gets its own line and the three
  buttons share the next one, with Select on the right edge.
- Filter menus: Geometry is checkboxes (Point, Line, Polygon); Height is a radio group.
  Choices apply at once. An active filter names its choice on the button with a blue
  frame and blue text, and Clear filters appears as a link under the row.
- Status tabs: toggle buttons (`aria-pressed`) on the intro's full-width bottom rule. The
  chosen tab has blue text and a 2 px blue underline; the others are grey, with a muted
  count after the name. Counts and the `aria-live` subtitle reflect search and filters.

## Map-specific decisions

MapLibre paint values come through the typed CSS-to-drawing-display bridge. Geometry UI
uses names and distinct Point/Line/Polygon shapes as well as colour. Geographic drawing
paint remains contrast-oriented and independent of the UI theme; grayscale affects
raster basemaps only. Keep boundaries and editing vertices visible on varied imagery.

Preserve the radial selector's choice arrangement, original press coordinate, central
cancellation zone and generous sectors. Expanded SVG paths must stay inside the viewport
for Safari. Its centre shows a 48 px version of the map crosshair mark, and item icons are black with a
white outline in both themes. Geometry starts through the established hold/radial interaction when
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
Releasing within the 72 px center radius, including its boundary, keeps it open. Later
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
scrolling body. Its full-width height button starts as Not set, shares the footer button
height token and is disabled while busy. Both keypad variants require a height before
Continue or Finish; the keypad opens empty until one is entered. Both one-step variants retain
the metres/feet toggle, initially metres. “One step — scrolling” keeps its horizontal
height picker and optional numeric keypad. All variants collect the
same metadata and use the same completion summary, built on the shared Dialog. Their layouts and picker
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
