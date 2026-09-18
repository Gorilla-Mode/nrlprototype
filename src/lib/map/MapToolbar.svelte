<script lang="ts">
  import MapButton from './MapButton.svelte';
  import DrawingToolbar from './DrawingToolbar.svelte';
  import SearchBar from './SearchBar.svelte';
  import type { DrawingState } from '../reporting/createDrawingController';
  import type { LocationSuggestion } from './locationSearch';

  let { drawing, onundo, ondelete, oncomplete, onsearchselect, onmenu, menuOpen, onreports }: {
    onmenu: () => void;
    menuOpen: boolean;
    drawing: DrawingState;
    onundo: () => void;
    ondelete: () => void;
    oncomplete: () => void;
    onsearchselect: (suggestion: LocationSuggestion) => void;
    onreports: () => void;
  } = $props();

</script>

<div class="map-toolbar" role="group" aria-label="Map tools">
  <SearchBar onselect={onsearchselect} />

  <MapButton type="button" aria-label="Reports" onclick={onreports}>
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M13 3H6a1 1 0 0 0-1 1v16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V9l-6-6Z" />
      <path d="M13 3v6h6M8.5 13h7M8.5 16.5h7M8.5 9h1" />
    </svg>
  </MapButton>

  <MapButton type="button" aria-label="Menu" aria-haspopup="dialog" aria-expanded={menuOpen} aria-controls="main-menu" onclick={onmenu}>
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M4 6h16M4 12h16M4 18h16" />
    </svg>
  </MapButton>
</div>

<DrawingToolbar state={drawing} {onundo} {ondelete} {oncomplete} />

<style>
  .map-toolbar {
    position: absolute;
    /* Search results must stay above lower map actions on short viewports. */
    z-index: var(--layer-popover);
    top: var(--map-control-inset-top);
    right: var(--map-control-inset-right);
    left: var(--map-control-inset-left);
    display: flex;
    align-items: center;
    gap: var(--map-toolbar-gap);
    pointer-events: none;
  }

</style>
