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
    geolocationState: GeolocationState;
    ongeolocationclick: () => void;
    crosshairMode: boolean;
    oncrosshairtoggle: () => void;
  }

  let {
    opacity = $bindable(0),
    open = $bindable(false),
    grayscale = $bindable(false),
    geolocationState,
    ongeolocationclick,
    crosshairMode,
    oncrosshairtoggle,
  }: Props = $props();
</script>

<aside class="right-map-controls" aria-label="Map controls">
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
