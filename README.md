# NRL Reporting Prototype

A map-based frontend prototype for Kartverket NRL reporting and aviation-related
workflows. It tests geometry selection and interface design ahead of a real reporting
implementation. Portrait iPad use, clear map controls and keyboard access are priorities.
It is not an operational navigation tool or a production submission service.

## Run locally

Use npm install for initial setup, then npm run dev. Open the URL printed by Vite.
Verify changes with npm run check, npm test and npm run build. No lint script is configured.

Deployed prototype: https://gorilla-mode.github.io/nrlprototype/

User testing: https://gorilla-mode.github.io/nrlprototype-usertest/

### Deployments

Pushes and merges to `master` update the existing prototype. Pushes and merges to
`user-test` run type checks, tests and a build, then publish generated files to
the `gh-pages` branch of `Gorilla-Mode/nrlprototype-usertest`. Failed checks leave
the previous testing site available. Development stays in this repository; the
testing repository contains generated files only and needs no manual code updates.

The testing repository uses GitHub Pages **Deploy from a branch**, with `gh-pages`
and `/ (root)` as its source. Its write-enabled deploy key has its private half stored
in this repository's Actions secret `USERTEST_DEPLOY_KEY`. Never commit that key.
Push deployment works as soon as the workflow is on `user-test`. Manual dispatch
also requires the workflow file to exist on the default branch (`master`); select
`user-test` when running it. Manual testing runs on other branches are skipped.
The production workflow accepts only `main` or `master`.

The source workflow publishes the files; the destination repository's Pages workflow
then makes them live. Check Actions in both repositories when diagnosing deployment
failures. To restore an earlier test version, revert the relevant change on `user-test`
and push it through the same checks and deployment process.

| Mode | Link |
| --- | --- |
| Debug mode | [Open debug mode](https://gorilla-mode.github.io/nrlprototype/?debug=1) |
| Debug mode with Help | [Open debug mode with Help](https://gorilla-mode.github.io/nrlprototype/?debug=1&help=1) |

## Current workflow

Search for a place/address, adjust map layers, or locate yourself. Hold and drag on the
map to choose Point, Line or Polygon, then click or tap to add vertices. Undo adjusts
a selection; Delete clears it. Completing geometry does not submit or persist a report.

The right-side menu opens FAQ as a full-screen page at `#/FAQ`. Back restores the
map and reopens the menu at its previous scroll position. FAQ content describes
the intended reporting workflow and is explicitly labelled as prototype guidance;
reporting, saved drafts and registrar review are not implemented. Guide and support
destinations remain visibly unavailable. Notifications at `#/Notifications` lists sample
report-status updates; Mark all read is session-only. Settings provides profile/security/notification/offline
placeholders and real shared map-layer/location controls. Language offers a session-only
Norsk/English preference; the interface remains English. My Profile and Settings share
the profile view at `#/Settings/profile`.

## Structure and documentation

- src/lib/map: map lifecycle, controls, search, geolocation and drawing display.
- src/lib/settings: Settings shell, focused views and section definitions.
- src/lib/faq: static FAQ content, local search and the full-screen accordion page.
- src/lib/notifications: sample report-status notifications and their full-screen page.
- src/lib/reporting: geometry validation and transient report registration.
- src/lib/radial-menu: gesture selector presentation and sector geometry.
- src/styles/stylesheet.css: central visual tokens and shared styles, imported by src/main.ts.
- tests/: TypeScript node:test suites.

Start with [AGENTS.md](AGENTS.md) for task-based guidance.
[DESIGN_SYSTEM.md](DESIGN_SYSTEM.md) defines the visual baseline.
[ARCHITECTURE.md](ARCHITECTURE.md) explains boundaries, external services and data handling.

This remains a workflow prototype: authentication, production submission and durable
storage are outside its current boundary. Treat the code, tests and current feature
request as the source of implemented behaviour.
