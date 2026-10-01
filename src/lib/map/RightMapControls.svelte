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
    geolocationState: GeolocationState;
    ongeolocationclick: () => void;
  }

  let {
    opacity = $bindable(0),
    open = $bindable(false),
    grayscale = $bindable(false),
    errorReportMode = $bindable(false),
    errorReportDisabled = false,
    geolocationState,
    ongeolocationclick,
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
  <GeolocationControl state={geolocationState} onclick={ongeolocationclick} />
  <LayerFadeControl bind:opacity bind:open />
  <div class:covered={open} inert={open}>
    <GrayscaleControl bind:enabled={grayscale} />
  </div>
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
</style>
