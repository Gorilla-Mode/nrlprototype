<script lang="ts">
  import MapButton from './MapButton.svelte';
  import DrawingToolbar from './DrawingToolbar.svelte';
  import SearchBar from './SearchBar.svelte';
  import type { DrawingState } from '../reporting/createDrawingController';
  import type { LocationSuggestion } from './locationSearch';

  let { drawing, onundo, ondelete, oncomplete, onsearchselect }: {
    drawing: DrawingState;
    onundo: () => void;
    ondelete: () => void;
    oncomplete: () => void;
    onsearchselect: (suggestion: LocationSuggestion) => void;
  } = $props();
</script>

<div class="map-toolbar" role="group" aria-label="Map tools">
  <SearchBar onselect={onsearchselect} />

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
</style>
