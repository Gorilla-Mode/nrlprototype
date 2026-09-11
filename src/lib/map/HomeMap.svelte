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
    --map-control-size: 44px;
    --map-control-gap: 4px;
    --map-actions-top: 37.5%;
    --map-right-inset: max(8px, env(safe-area-inset-right));

    position: relative;
    width: 100%;
    height: 100%;
    height: 100dvh;
    overflow: hidden;
    isolation: isolate;
  }

  .location-status {
    position: absolute;
    z-index: 2;
    top: calc(max(6px, env(safe-area-inset-top)) + var(--map-control-size) + 12px);
    right: var(--map-right-inset);
    max-width: min(290px, calc(100% - 16px));
  }

  .location-status p {
    margin: 0;
    padding: 12px 16px;
    border-radius: 16px;
    background: var(--color-surface);
    box-shadow: var(--shadow-control);
    color: var(--color-muted-strong);
    font-size: 13px;
    line-height: 1.5;
  }
</style>
