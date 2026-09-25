<script lang="ts">
  import MapButton from './MapButton.svelte';
  import DrawingToolbar from './DrawingToolbar.svelte';
  import SearchBar from './SearchBar.svelte';
  import type { DrawingState } from '../reporting/createDrawingController';
  import type { LocationSuggestion } from './locationSearch';

  let { drawing, onundo, ondelete, oncomplete, onresumedetails, onsearchselect, onmenu, onreports, onhelp, helpOpen, menuOpen }: {
    onmenu: () => void;
    onreports: () => void;
    onhelp: () => void;
    helpOpen: boolean;
    menuOpen: boolean;
    drawing: DrawingState;
    onundo: () => void;
    ondelete: () => void;
    oncomplete: () => void;
    onresumedetails?: () => void;
    onsearchselect: (suggestion: LocationSuggestion) => void;
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

<button class="map-help" type="button" aria-haspopup="dialog" aria-expanded={helpOpen} aria-controls="map-tutorial" onclick={onhelp}>
  <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path d="M8 8a4 4 0 0 1 8 0c0 3-4 3-4 6M12 18v1" />
  </svg>
  <span>Help</span>
</button>

<DrawingToolbar state={drawing} {onundo} {ondelete} {oncomplete} {onresumedetails} />

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

  .map-help {
    position: absolute;
    z-index: var(--layer-map-overlay);
    right: var(--map-control-inset-right);
    bottom: var(--map-help-inset-bottom);
    width: var(--map-help-size);
    height: var(--map-help-size);
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: var(--space-1);
    padding: var(--space-2);
    border: var(--border-width-default) solid var(--color-action-secondary);
    border-radius: var(--radius-round);
    background: var(--color-action-secondary);
    color: var(--color-text-inverse);
    box-shadow: var(--shadow-control);
    font-size: var(--font-size-body);
    font-weight: var(--font-weight-semibold);
    cursor: pointer;
  }
  .map-help:hover { background: var(--color-action-secondary-hover); }
  .map-help:active { background: var(--color-action-secondary-hover); transform: scale(var(--scale-control-active)); }
  .map-help svg {
    width: var(--icon-size-large);
    height: var(--icon-size-large);
    stroke: currentColor;
    stroke-width: var(--icon-stroke-width);
    stroke-linecap: round;
    stroke-linejoin: round;
  }
</style>
