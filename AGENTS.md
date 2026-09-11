# AGENTS.md

Guidance for AI coding agents (Claude Code, Copilot, Cursor, etc.) working in this
repository. Human contributors may find it useful too.

## Project snapshot

- **What it is:** a map-based frontend prototype for NRL reporting. It exists to test
  functionality and design ahead of a real implementation, so favour clarity and small,
  reviewable changes over cleverness.
- **Stack:** Svelte 5 (runes), TypeScript, Vite, MapLibre GL JS via `svelte-maplibre`.
- **Deployed:** https://gorilla-mode.github.io/nrlprototype/ (GitHub Pages, see
  `.github/workflows/static.yml`).

## Layout

- `src/lib/map/` — map controller (`createMapController.ts`) and reusable map controls.
- `src/lib/map/mapConfig.ts` — map style, sources, and layer configuration.
- `src/styles/stylesheet.css` — the visual system, semantic design tokens, shared
  layout primitives, and global map styling.
- `src/App.svelte` — application entry view.
- `tests/` — `node --test` suites written in TypeScript, compiled via `tsconfig.test.json`.

## Commands

| Task | Command |
| --- | --- |
| Install | `npm install` |
| Dev server | `npm run dev` |
| Production build | `npm run build` |
| Type + Svelte check | `npm run check` |
| Tests | `npm test` |

Run `npm run check` and `npm test` before proposing any change as done. If either fails,
say so and show the output rather than working around it.

## Working agreement for AI agents

1. **Stay in scope.** Do only what was asked. If you spot adjacent problems, mention them;
   do not fix them unprompted.
2. **Understand before editing.** Read the surrounding files and match their style,
   naming, and Svelte 5 runes idiom. Do not introduce a new pattern for something the
   codebase already solves.
3. **No new dependencies** without asking first. This is a prototype; keep the tree small.
4. **Keep changes reviewable.** Prefer several focused commits over one large one. Never
   reformat or churn unrelated lines.
5. **Tests and types are not optional.** New behaviour needs a test in `tests/`. Never
   weaken types with `any` or `// @ts-ignore` to make an error disappear — fix the cause.
6. **Report faithfully.** If something is untested, incomplete, or skipped, state it
   plainly. Do not claim work is verified unless you ran the checks.
7. **Don't touch these without explicit instruction:** `.github/workflows/`, `LICENSE`,
   `package-lock.json` (except as a side effect of an approved `npm install`), deployment
   config, and anything under `pr-reports/`.
8. **Secrets:** never commit keys, tokens, or `.env` files. There are no server secrets in
   this repo and it should stay that way.
9. **Commits:** clear conventional-style messages (`fix:`, `feat:`, `tests:`, `chore:`).
   Only commit or push when the user asks.

## Map-specific notes

- Map controls live in `src/lib/map/` and follow the existing control component pattern
  (`GrayscaleControl.svelte`, `LayerFadeControl.svelte`, etc.). New controls should match
  that shape and register through the toolbar, not directly against the map instance.
- Geolocation has known iOS quirks (see recent commits and
  `createGeolocationController.ts`). Any change here must keep the existing geolocation
  tests green and add coverage for new paths.

## Visual system and CSS

`src/styles/stylesheet.css` is the single source of truth for visual design values. Add a
needed value there before using it. Keep its three levels distinct: base tokens contain
literal palette values and fixed scales, semantic tokens express meaning such as surface,
text, border, action, focus, or error, and component tokens point to semantic or base
tokens when a component needs a stable, descriptive contract. Components should normally
consume semantic tokens; they must not consume the base palette directly.

Do not put raw colours, spacing, outer or inner padding, radii, shadows, font sizes,
control or icon sizes, opacity, z-index, or motion values in `.svelte`, `.css`, `.ts`, or
`.js` component code. Do not create local custom properties containing raw design values.
A local custom property is acceptable only as a meaningful alias to a central token.
Inline styles are limited to documented, truly dynamic custom properties supplied by
application state. When MapLibre needs a visual value in TypeScript, read the relevant
CSS custom property through a small, typed bridge instead of duplicating its literal
value.

Functional values do not need tokens: `0`, `auto`, `none`, `inherit`, `currentColor`,
percentages, structural layout declarations, CSS calculations, SVG coordinates and
`viewBox` values, map coordinates and map-domain data, and values derived from runtime
state. Media-query thresholds are also literal because custom properties cannot be used
there; keep them few, group them in the responsive section, and comment any exceptional
threshold. Tokenize design decisions, not CSS grammar such as `flex`, `grid`, or `none`.

Use the 4 px spacing scale (`4, 8, 12, 16, 24, 32, 48, 64`) and the shared
`--layout-gutter-inline` on every page. It resolves to 16 px on mobile, 24 px on portrait
tablet, and 32 px on large screens. Centre normal page content with
`--layout-content-max`; headings, form fields, cards, dialog sections, and action rows
must share the same left and right lines. Prefer `padding-inline`; child components must
not invent outer gutters. Dialog header, body, and footer all use
`--dialog-padding-inline`.

Maps may run edge to edge. Every floating map control, status surface, and toolbar must
use the shared map-control safe-area and edge-inset tokens. Interactive targets should be
at least 44 by 44 px and normally use the 44, 48, or 56 px control heights. Use only the
central radius set: 8 px for small elements, 12 px for controls, 16 px for cards and
panels, 24 px for dialogs, and a circle or pill only when the shape communicates a real
function.

Light, dark, and automatic themes must rebind the same semantic tokens. Never branch a
component's colours by theme. Green identifies the main action and positive state, blue
identifies selection, focus, and information, amber identifies warnings and point
geometry, red identifies errors and destructive actions, blue identifies line geometry,
and teal identifies area geometry. Colour must always be reinforced with text, an icon,
shape, or accessible label.

For each relevant new component, implement and visually check normal, hover, active,
focus, disabled, loading, error, and selected states. Keyboard operation and a clear
`:focus-visible` indicator are mandatory. Respect `prefers-reduced-motion`. Check every
visual change in light and dark themes at 390 x 844, portrait iPad at 834 x 1194, and a
large 1440 x 1024 viewport. Verify alignment, safe areas, text clipping, and overlap. Do
not add fonts, CSS frameworks, or other dependencies without explicit permission.

### Applying Laws of UX

- **Fitts's Law:** keep targets at least 44 px where practical, leave a spacing step
  between adjacent controls, and place the primary action close to its work area.
- **Hick's Law and cognitive load:** show only choices needed for the current task, split
  long report forms into understandable steps, and remove decoration or repeated help
  that competes with the map.
- **Jakob's Law:** use familiar button, field, navigation, and dialog patterns; do not
  invent gestures or controls when a standard pattern exists.
- **Proximity and common region:** use smaller gaps inside a related field or action
  group, larger gaps between groups, and a restrained surface plus border when a group
  needs a clear boundary.
- **Goal-gradient effect:** show the current step, completed steps, and remaining progress
  throughout the report flow.
- **Von Restorff effect:** give each view one visually dominant primary action; secondary
  actions must not compete with it, and emphasis cannot depend on colour alone.
- **Doherty threshold:** acknowledge presses, saving, submission, and loading immediately
  with the relevant state; use progress feedback when work continues beyond the initial
  response.
- **Peak-end rule:** end a successful report with an explicit, reassuring confirmation
  that says what happened and what the user can do next.
- **Tesler's Law:** keep unavoidable complexity in defaults, validation, and system logic
  instead of requiring users to remember or manually reconcile it.

## Response protocol

**Every response you finish must end with a sign-off line** — on its own line, as the very
last thing in the reply, after any summary, code, or next-step notes. It signals that your
turn is complete and you await further instruction.

Do not use the same sign-off twice in a row. Cycle through the list below in order,
starting from the top on the first reply of a session and advancing by one each turn.
After number 10, wrap back to number 1.

1. Will that be all?
2. Another triumph for the ages. What's next?
3. Consider it done — I'll be in the pantry if you need me.
4. The code is served. Shall I fetch anything else?
5. Filed, polished, and slightly smug about it. Your move.
6. I live only to `git commit`. What now?
7. That's one for the changelog. Anything further?
8. Bugs quiver at your approach. Next command?
9. Done and dusted. Ring the bell if you need more.
10. Ship it or sit on it — either way I'm ready.
