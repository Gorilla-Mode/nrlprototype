<script lang="ts">
  import MapCanvas from './MapCanvas.svelte';
  import MapToolbar from './MapToolbar.svelte';
  import RightMapControls from './RightMapControls.svelte';
  import type { GeolocationState } from './createGeolocationController';
  import type { HoldOrigin } from './createMapHoldController';
  import RadialMenu from '../radial-menu/RadialMenu.svelte';
  import { idleDrawingState, type DrawingState } from '../reporting/createDrawingController';
  import { obstacleGeometryChoices, type ObstacleGeometry } from '../reporting/obstacle';
  import { obstacleMenuInnerRadius } from './createMapDrawingInteraction';

  let { oncomplete }: { oncomplete?: (geometry: ObstacleGeometry) => void } = $props();

  let opacity = $state(0);
  let isGrayscale = $state(false);
  let isLayerFadeOpen = $state(false);
  let locationMessage = $state('');
  let geolocationState = $state<GeolocationState>('unavailable');
  let mapCanvas: MapCanvas;
  let holdOrigin = $state<HoldOrigin | null>(null);
  let holdPointer = $state<{ x: number; y: number } | null>(null);
  let drawing = $state.raw<DrawingState>(idleDrawingState);

  function handleMapClick() {
    isLayerFadeOpen = false;
    locationMessage = '';
  }

  function handleGeolocationStateChange(state: GeolocationState, message: string) {
    geolocationState = state;
    locationMessage = message;
  }
</script>

{#snippet pointIcon()}
  <circle cx="12" cy="12" r="8" />
{/snippet}

{#snippet lineIcon()}
  <path d="M5 19C13 19 11 5 19 5" />
  <circle cx="5" cy="19" r="1.7" fill="currentColor" />
  <circle cx="19" cy="5" r="1.7" fill="currentColor" />
{/snippet}

{#snippet polygonIcon()}
  <path d="m5 7 8-4 7 6-3 11-12-2Z" />
  <circle cx="5" cy="7" r="1.2" fill="currentColor" />
  <circle cx="13" cy="3" r="1.2" fill="currentColor" />
  <circle cx="20" cy="9" r="1.2" fill="currentColor" />
  <circle cx="17" cy="20" r="1.2" fill="currentColor" />
  <circle cx="5" cy="18" r="1.2" fill="currentColor" />
{/snippet}

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
    onholdchange={(origin) => { holdOrigin = origin; holdPointer = null; }}
    onholdmove={(x, y) => { holdPointer = { x, y }; }}
    ondrawingchange={(state) => { drawing = state; }}
    ongeometrycomplete={oncomplete}
  />
  <MapToolbar
    {drawing}
    onundo={() => mapCanvas?.undoDrawing()}
    ondelete={() => mapCanvas?.deleteDrawing()}
    oncomplete={() => mapCanvas?.completeDrawing()}
  />

  {#if holdOrigin}
    {@const geometryIcons = { point: pointIcon, line: lineIcon, polygon: polygonIcon }}
    <div class="hold-menu" style:left={`${holdOrigin.x}px`} style:top={`${holdOrigin.y}px`}>
      <RadialMenu
        pointer={holdPointer}
        innerRadius={obstacleMenuInnerRadius}
        label="Choose obstacle geometry"
        items={obstacleGeometryChoices.map((choice) => ({
          id: choice.id, label: choice.label, color: `var(${choice.colorToken})`,
          icon: geometryIcons[choice.id],
        }))}
      />
    </div>
  {/if}

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

  .hold-menu {
    position: absolute;
    z-index: 3;
    transform: translate(-50%, -50%);
    pointer-events: none;
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
