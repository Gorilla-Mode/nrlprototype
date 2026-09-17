# AGENTS.md

Start here when working on the Kartverket NRL reporting prototype. It is a static,
map-based frontend for evaluating workflows and design before real implementation.
Prioritise clarity, reviewable changes and portrait iPad usability. Preserve working
map interactions; do not turn a focused task into a redesign or rewrite.

## Read for your task

| Task | Read |
| --- | --- |
| UI, CSS, icons, responsive or accessibility | DESIGN_SYSTEM.md and surrounding components |
| Map/controller, geolocation, API or data behaviour | Relevant ARCHITECTURE.md sections and existing tests |
| Backend, storage, database or security proposal | ARCHITECTURE.md including Security and data handling; none of these systems exists yet |
| Large feature | README.md product brief, IMPLEMENTATION_STATUS.md, then relevant architecture/design sections |
| Small correction | Nearby code and applicable guidance only; do not read every document |

Update the relevant document when a change makes it inaccurate. Do not add documents
or abstractions merely to satisfy a template.

## Technical constraints

- Svelte 5 runes, TypeScript, Vite and MapLibre GL JS. Existing package dependencies
  include svelte-maplibre and Turf. Do not add dependencies without permission.
- Entry: src/main.ts → App → HomeMap. Controls live in src/lib/map; MapCanvas forwards
  typed commands through createMapController. New controls register through the toolbar.
- Map sources/layers live in mapConfig.ts. Drawing/reporting controllers are separate
  from their UI. Follow existing boundaries and naming; avoid a new state framework.
- Preserve geolocation's iOS paths and tests. Runtime measurements, coordinates and
  device state must not be replaced by presentation assumptions.
- Tests live in tests/, compiled by tsconfig.test.json. New behaviour needs coverage.
  Never use any or ts-ignore to bypass a type error.

## UX constraints

- DESIGN_SYSTEM.md and src/styles/stylesheet.css define the visual baseline. Keep base,
  semantic and component tokens distinct; components normally consume semantic tokens.
- Do not hardcode design values or raw palette colours in components. Read CSS values
  through the typed drawing-display bridge when MapLibre needs them. Only documented,
  runtime-derived custom properties belong in inline styles.
- Keep search and information panels opaque, map buttons visually stable, text legible
  over maps and targets at least 44 × 44 px. Use shared gutters and safe-area insets.
- Keep labelled geometry, keyboard access, focus-visible, reduced motion and explicit
  loading/error/empty/completion states. Colour alone must never convey meaning.
- Preserve good work. Do not implement language/units/help/persistence just because they
  appear in the roadmap. Selection completion is not submission or durable saving.

## Verification

| Task | Command |
| --- | --- |
| Development | npm run dev |
| Type and Svelte checks | npm run check |
| Tests | npm test |
| Production build | npm run build |

Run check and tests before calling any change done; run the build for application
changes. If a check fails, report the failing output and fix the cause within scope.
There is no configured lint command; the residual .oxlintrc.json is not an executable
verification step. Do not install a linter for an unrelated task.

For visual changes inspect 390 × 844, portrait iPad 834 × 1194 and 1440 × 1024 in both
light/dark themes. Check map backgrounds, focus/hover/selected/disabled states,
loading/errors, text clipping, safe areas and overlapping controls. Emulation is not
physical iPad/Safari verification: report exactly what was tested and what remains.

## Git and data hygiene

1. Inspect branch, status, recent history and changed/untracked files before editing.
   Do not overwrite or revert unrelated local changes.
2. Keep scope focused; no unrelated formatting, asset cleanup or architecture changes.
3. Do not commit or push unless explicitly requested. Use clear conventional messages
   when asked (feat:, fix:, tests:, docs:, chore:).
4. Do not touch .github/workflows/, LICENSE, deployment configuration or pr-reports/
   without explicit instruction. Preserve package-lock.json unless an approved install
   changes it. npm install is not part of routine verification.
5. Never commit secrets, credentials, .env files, editor settings, temporary screenshots,
   node_modules, dist or .test-build. Classify uncertain untracked files before acting;
   do not delete them merely because they are untracked.
6. Review the complete final diff, run git diff --check and inspect remaining untracked
   files. Distinguish task changes ready for Git from existing unrelated work.
7. No server secrets belong in this frontend. Read the architecture's data notes before
   changing geolocation, search requests, reporting or persistence.

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
