<script lang="ts">
  import MapCanvas from './MapCanvas.svelte';
  import MapToolbar from './MapToolbar.svelte';
  import RightMapControls from './RightMapControls.svelte';
  import type { GeolocationState } from './createGeolocationController';

  let opacity = $state(0);
  let isGrayscale = $state(false);
  let isLayerFadeOpen = $state(false);
  let locationMessage = $state('');
  let geolocationState = $state<GeolocationState>('unavailable');
  let mapCanvas: MapCanvas;

  function handleMapClick() {
    isLayerFadeOpen = false;
    locationMessage = '';
  }

  function handleGeolocationStateChange(state: GeolocationState, message: string) {
    geolocationState = state;
    locationMessage = message;
  }
</script>

<main class="map-wrapper" aria-label="Home map">
  <RightMapControls
    bind:opacity
    bind:open={isLayerFadeOpen}
    bind:grayscale={isGrayscale}
    {geolocationState}
    ongeolocationclick={() => mapCanvas?.toggleGeolocation()}
  />
  <MapCanvas
    bind:this={mapCanvas}
    {opacity}
    grayscale={isGrayscale}
    onmapclick={handleMapClick}
    ongeolocationstatechange={handleGeolocationStateChange}
  />
  <MapToolbar />

  <div class="location-status" role="status">
    {#if locationMessage}
      <p>{locationMessage}</p>
    {/if}
  </div>
</main>

<style>
  .map-wrapper {
    position: relative;
    width: 100%;
    height: 100%;
    height: 100dvh;
    overflow: hidden;
    isolation: isolate;
  }

  .location-status {
    position: absolute;
    z-index: var(--layer-map-overlay);
    top: calc(var(--map-control-inset-top) + var(--map-control-size) + var(--space-3));
    right: var(--map-control-inset-right);
    left: var(--map-control-inset-left);
    display: flex;
    justify-content: flex-end;
    pointer-events: none;
  }

  .location-status p {
    width: fit-content;
    max-width: var(--map-status-max);
    margin: 0;
    padding: var(--space-3) var(--space-4);
    border: var(--border-default);
    border-radius: var(--radius-card);
    background: var(--color-map-control-surface);
    box-shadow: var(--shadow-control);
    color: var(--color-text-secondary);
    font-size: var(--font-size-body-small);
    line-height: var(--line-height-body);
  }
</style>
