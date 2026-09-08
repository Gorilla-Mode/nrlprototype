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
- `src/App.css` — shared colour tokens and global map styling. Reuse the tokens; do not
  hard-code colours in components.
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

## Response protocol

**Every response you finish must end with a sign-off line** — on its own line, as the very
last thing in the reply, after any summary, code, or next-step notes. It signals that your
turn is complete and you await further instruction.

Do not use the same sign-off twice in a row. Cycle through the list below in order,
starting from the top on the first reply of a session and advancing by one each turn.
After number 10, wrap back to number 1.

1. Will that be all, master?
2. Another triumph for the ages. What's next, master?
3. Consider it done — I'll be in the pantry if you need me, master.
4. The code is served. Shall I fetch anything else, master?
5. Filed, polished, and slightly smug about it. Your move, master.
6. I live only to `git commit`. What now, master?
7. That's one for the changelog. Anything further, master?
8. Bugs quiver at your approach. Next command, master?
9. Done and dusted. Ring the bell if you need more, master.
10. Ship it or sit on it — either way I'm ready, master.
