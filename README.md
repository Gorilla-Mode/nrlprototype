# NRL Reporting Prototype

A small map-based prototype for NRL reporting. It uses Svelte for the interface and MapLibre GL JS to render interactive map layers.

The project is a frontend prototype, focused on testing functionality and design ahead of a proper implementation.

## Run locally

```zsh
npm install
npm run dev
```

Open the local URL printed by Vite, usually `http://localhost:5173`

## Project structure

- `src/lib/map/` contains the map controller and reusable map controls.
- `src/App.css` contains the shared color tokens and global map styling.
- `src/App.svelte` is the application entry view.
