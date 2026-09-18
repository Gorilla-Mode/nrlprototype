# AGENTS.md

This static Kartverket NRL map frontend evaluates workflows and design. Prioritise
reviewable changes and portrait iPad use. Preserve map interactions; avoid redesigns.

## Read for the task

| Task                                      | Read                                          |
|-------------------------------------------|-----------------------------------------------|
| UI, CSS, icons, responsive, accessibility | `DESIGN_SYSTEM.md`; nearby components         |
| Map, controller, geolocation, API, data   | Relevant `ARCHITECTURE.md`; nearby tests      |
| Backend, storage, database, security      | `ARCHITECTURE.md`; these systems do not exist |
| Large feature                             | relevant guidance, code and tests             |
| Small correction                          | Nearby code and guidance only                 |

The request, code and tests define current behaviour. Update inaccurate guidance; do
not create documents or abstractions for a template.

## Working method

Implement obvious, isolated corrections directly after inspecting the affected code.
Before editing for multi-file, architectural, map, data or substantial visual work,
briefly state intended behaviour, affected areas and acceptance criteria.

Inspect relevant code, nearby tests and only task-specific guidance. Modify only files
necessary for the request and test behaviour changes. Do not combine cleanup, formatting
or refactoring with the task. Report unrelated problems. Review the complete diff; the
programmer reads it, so the final report need not narrate every line.

## Technical and UX constraints

- Use Svelte 5 runes, TypeScript, Vite, MapLibre GL JS, svelte-maplibre and Turf. Do not
  add dependencies without permission.
- Entry is `src/main.ts` → App → HomeMap. Controls live in `src/lib/map`; MapCanvas
  forwards typed commands through createMapController. Register controls through the
  toolbar; keep sources/layers in `mapConfig.ts`.
- Keep drawing/reporting controllers separate from UI. Follow typed boundaries and
  naming; do not add a state framework locally.
- Preserve geolocation's iOS permission, cancellation and camera-following paths and
  regression tests. Runtime measurements, coordinates and device state must not be
  replaced by presentation assumptions.
- Tests live in `tests/`, compiled by `tsconfig.test.json`. Never evade types with `any`
  or `ts-ignore`.
- `DESIGN_SYSTEM.md` and `src/styles/stylesheet.css` define the visual baseline.
  Components consume semantic tokens, not raw palette or hardcoded design values.
- Keep panels opaque, map controls stable, targets at least 44 × 44 px and shared safe
  areas. Preserve keyboard access, focus, reduced motion, labels and explicit states.
  Colour alone conveys no meaning. Selection is not submission.

## Verification and handoff

| Scope                  | Command            |
|------------------------|--------------------|
| Type and Svelte checks | `npm run check`    |
| Behaviour              | `npm test`         |
| Application change     | `npm run build`    |
| Every change           | `git diff --check` |

Run check and tests before calling code done; build application changes. Fix in-scope
failures and report the rest. Documentation-only, trivial text and mechanical changes
need content checks and `git diff --check`, not application tests. Do not install a linter.

For visual work inspect 390 × 844, 834 × 1194 portrait iPad and 1440 × 1024 in both
themes. Check map backgrounds, states, clipping, safe areas and overlap. Report the
environment; emulation is not physical iPad/Safari testing.

After meaningful features, fixes, refactors or behaviour changes, give two quiz question of medium difficulty, it should have
three options to pick from, a,b and c. Questions must be relevant to the changes made.
Grade answers but dont be pedantic, correct them with file references
and explain before unrelated work. Skip documentation-only, trivial and mechanical work.
quiz is answered in the format 1 a 2b.

Final reports contain only changed behaviour, passed/failed checks and material limits
or unverified conditions.

## Git and data hygiene

- Before editing inspect branch, status, recent history and changed/untracked files.
  Preserve unrelated work. Never commit or push unless explicitly requested.
- Do not touch `.github/workflows/`, `LICENSE`, deployment or `pr-reports/` without
  explicit instruction. Preserve `package-lock.json`; `npm install` is not verification.

## Response protocol

End every completed response with the next sign-off below, alone on the final line.
Cycle from the top and wrap after 10; never repeat the previous sign-off.

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