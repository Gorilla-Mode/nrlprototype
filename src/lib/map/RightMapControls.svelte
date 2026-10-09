<script lang="ts">
  import LayerFadeControl from './LayerFadeControl.svelte';
  import GrayscaleControl from './GrayscaleControl.svelte';
  import GeolocationControl from './GeolocationControl.svelte';
  import MapButton from './MapButton.svelte';
  import type { GeolocationState } from './createGeolocationController';

  interface Props {
    opacity?: number;
    open?: boolean;
    grayscale?: boolean;
    errorReportMode?: boolean;
    errorReportDisabled?: boolean;
    /** +/− zoom, shown while the map is used to correct a position. */
    zoomControls?: boolean;
    onzoomin?: () => void;
    onzoomout?: () => void;
    geolocationState: GeolocationState;
    ongeolocationclick: () => void;
    crosshairMode: boolean;
    oncrosshairtoggle: () => void;
    /** Opens the user-test task list; the button is absent outside user testing. */
    onusertasks?: () => void;
    userTasksOpen?: boolean;
  }

  let {
    opacity = $bindable(0),
    open = $bindable(false),
    grayscale = $bindable(false),
    errorReportMode = $bindable(false),
    errorReportDisabled = false,
    zoomControls = false,
    onzoomin,
    onzoomout,
    geolocationState,
    ongeolocationclick,
    crosshairMode,
    oncrosshairtoggle,
    onusertasks,
    userTasksOpen = false,
  }: Props = $props();
</script>

<aside class="right-map-controls" aria-label="Map controls">
  <MapButton
    class="error-report-button"
    active={errorReportMode}
    disabled={errorReportDisabled}
    aria-label="Rapporter feil på hinder"
    aria-pressed={errorReportMode}
    title="Rapporter feil på hinder"
    onclick={() => { errorReportMode = !errorReportMode; }}
  >
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0" />
      <path d="M12 6.5v4M12 13.5h.01" />
    </svg>
  </MapButton>
  {#if zoomControls}
    <MapButton aria-label="Zoom in" title="Zoom in" onclick={onzoomin}>
      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M12 5v14M5 12h14" /></svg>
    </MapButton>
    <MapButton aria-label="Zoom out" title="Zoom out" onclick={onzoomout}>
      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M5 12h14" /></svg>
    </MapButton>
  {/if}
  <GeolocationControl state={geolocationState} onclick={ongeolocationclick} />
  <LayerFadeControl bind:opacity bind:open />
  <div class:covered={open} inert={open}>
    <GrayscaleControl bind:enabled={grayscale} />
  </div>
  <div class:covered={open} inert={open}>
    <MapButton active={crosshairMode} aria-label="Toggle crosshair mode" aria-pressed={crosshairMode}
      title="Toggle crosshair mode" onclick={oncrosshairtoggle}>
      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <circle cx="12" cy="12" r="7" />
        <path d="M12 2v6M12 16v6M2 12h6M16 12h6" />
        <circle cx="12" cy="12" r="1" fill="currentColor" stroke="none" />
      </svg>
    </MapButton>
  </div>
  {#if onusertasks}
    <div class:covered={open} inert={open}>
      <MapButton class="user-test-button" aria-label="Vis oppgaver for brukertest" aria-haspopup="dialog" aria-expanded={userTasksOpen}
        title="Vis oppgaver for brukertest" onclick={onusertasks}>
        <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d="M8 8a4 4 0 0 1 8 0c0 3-4 3-4 6M12 18v1" />
        </svg>
      </MapButton>
    </div>
  {/if}
</aside>

<style>
  .covered {
    visibility: hidden;
  }

  .right-map-controls {
    position: absolute;
    z-index: var(--layer-map-overlay);
    top: var(--map-controls-position-block);
    right: var(--map-control-inset-right);
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: var(--map-control-gap);
    transform: translateY(-50%);
  }

  /* Filled so test participants can find the task guide among the neutral map controls. */
  .right-map-controls :global(.map-button.user-test-button) {
    border-color: var(--color-action-secondary);
    background: var(--color-action-secondary);
    color: var(--color-text-inverse);
  }

  .right-map-controls :global(.map-button.user-test-button:not(:disabled):hover) {
    border-color: var(--color-action-secondary-hover);
    background: var(--color-action-secondary-hover);
  }

  /* Leave room for bottom selection actions on short portrait viewports. */
  @media (max-width: 60rem) and (max-height: 60rem) {
    .right-map-controls { top: var(--map-controls-compact-position-block); }
  }
</style>
