<script lang="ts">
  import MapButton from './MapButton.svelte';
  import DrawingToolbar from './DrawingToolbar.svelte';
  import type { DrawingState } from '../reporting/createDrawingController';

  let { drawing, onundo, ondelete, oncomplete }: {
    drawing: DrawingState;
    onundo: () => void;
    ondelete: () => void;
    oncomplete: () => void;
  } = $props();
</script>

<div class="map-toolbar" role="group" aria-label="Map tools">
  <div class="search-bar">
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="10.75" cy="10.75" r="6.75" />
      <path d="m16 16 5 5" />
    </svg>
    <input
      type="search"
      placeholder="Search place or address"
      aria-label="Search place or address"
      disabled
    />
  </div>

  <MapButton type="button" aria-label="Reports" disabled>
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M13 3H6a1 1 0 0 0-1 1v16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V9l-6-6Z" />
      <path d="M13 3v6h6M8.5 13h7M8.5 16.5h7M8.5 9h1" />
    </svg>
  </MapButton>

  <MapButton type="button" aria-label="Menu" disabled>
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M4 6h16M4 12h16M4 18h16" />
    </svg>
  </MapButton>
</div>

<DrawingToolbar state={drawing} {onundo} {ondelete} {oncomplete} />

<style>
  .map-toolbar {
    position: absolute;
    z-index: 2;
    top: max(6px, env(safe-area-inset-top));
    right: var(--map-right-inset);
    left: max(8px, env(safe-area-inset-left));
    display: flex;
    align-items: center;
    gap: 6px;
    pointer-events: none;
  }

  .search-bar {
    display: flex;
    flex: 1;
    align-items: center;
    gap: 10px;
    min-width: 0;
    height: var(--map-control-size);
    padding: 0 14px;
    border-radius: 999px;
    background: var(--color-surface);
    box-shadow: var(--shadow-control);
    color: var(--color-muted);
    pointer-events: auto;
  }

  .search-bar svg {
    flex: none;
    width: 24px;
    height: 24px;
    stroke: currentColor;
    stroke-width: 1.7;
    stroke-linecap: round;
    stroke-linejoin: round;
  }

  .search-bar input {
    width: 100%;
    min-width: 0;
    padding: 0;
    border: 0;
    outline: none;
    background: transparent;
    color: var(--color-muted);
    font-size: 13px;
    opacity: 1;
    -webkit-text-fill-color: var(--color-muted);
  }

  .search-bar input::placeholder {
    color: var(--color-muted);
    opacity: 1;
  }
</style>
