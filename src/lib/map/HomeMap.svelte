<script lang="ts">
  import { tick } from 'svelte';
  import type { SettingsSection } from '../settings/settings';
  import MenuDrawer from './MenuDrawer.svelte';
  import GeometryIcon from './GeometryIcon.svelte';
  import MapCanvas from './MapCanvas.svelte';
  import MapToolbar from './MapToolbar.svelte';
  import RightMapControls from './RightMapControls.svelte';
  import type { GeolocationState } from './createGeolocationController';
  import type { HoldOrigin } from './createMapHoldController';
  import RadialMenu from '../radial-menu/RadialMenu.svelte';
  import { idleDrawingState, type DrawingState } from '../reporting/createDrawingController';
  import { obstacleGeometryChoices, type Obstacle } from '../reporting/obstacle';
  import { obstacleMenuInnerRadius } from './createMapDrawingInteraction';

  let { oncomplete, menuOpen = $bindable(false), visible = true, onfaq, onsettings, onreports,
    opacity = $bindable(0), isGrayscale = $bindable(false),
    geolocationState = $bindable<GeolocationState>('unavailable'), locationMessage = $bindable(''),
    accuracy = $bindable<number | null>(null),
  }: {
    oncomplete?: (obstacle: Obstacle) => void;
    menuOpen?: boolean;
    visible?: boolean;
    onfaq: () => void;
    onsettings: (section: SettingsSection) => void;
    onreports: () => void;
    opacity?: number;
    isGrayscale?: boolean;
    geolocationState?: GeolocationState;
    locationMessage?: string;
    accuracy?: number | null;
  } = $props();
  let mapWrapper: HTMLElement;

  let isLayerFadeOpen = $state(false);
  let mapCanvas: MapCanvas;
  let holdOrigin = $state<HoldOrigin | null>(null);
  let holdPointer = $state<{ x: number; y: number } | null>(null);
  export function toggleGeolocation() { mapCanvas?.toggleGeolocation(); }

  async function deleteSelection() {
    mapCanvas?.deleteDrawing();
    await tick();
    mapCanvas?.focus();
  }

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

{#snippet pointIcon()}<GeometryIcon type="Point" />{/snippet}

{#snippet lineIcon()}<GeometryIcon type="LineString" />{/snippet}

{#snippet polygonIcon()}<GeometryIcon type="Polygon" />{/snippet}

<main bind:this={mapWrapper} class="map-wrapper" aria-label="Home map">
  <RightMapControls
    bind:opacity
    bind:open={isLayerFadeOpen}
    bind:grayscale={isGrayscale}
    {geolocationState}
    ongeolocationclick={() => mapCanvas?.toggleGeolocation()}
  />
  <MapCanvas
    {visible}
    bind:this={mapCanvas}
    {opacity}
    grayscale={isGrayscale}
    onmapclick={handleMapClick}
    ongeolocationstatechange={handleGeolocationStateChange}
    onaccuracychange={(value) => { accuracy = value; }}
    onholdchange={(origin) => { holdOrigin = origin; holdPointer = null; }}
    onholdmove={(x, y) => { holdPointer = { x, y }; }}
    ondrawingchange={(state) => { drawing = state; }}
    onobstacleregistered={oncomplete}
  />
  <MapToolbar
    {menuOpen}
    onmenu={() => { isLayerFadeOpen = false; menuOpen = true; }}
    {drawing}
    onsearchselect={(suggestion) => mapCanvas?.flyToLocation(suggestion)}
    onundo={() => mapCanvas?.undoDrawing()}
    ondelete={deleteSelection}
    oncomplete={() => mapCanvas?.completeDrawing()}
    onreports={() => { isLayerFadeOpen = false; onreports(); }}
  />

  <MenuDrawer bind:open={menuOpen} {onfaq} {onsettings}
    ondismiss={() => mapWrapper.querySelector<HTMLButtonElement>('[aria-label="Menu"]')?.focus({ preventScroll: true })} />

  {#if holdOrigin}
    {@const geometryIcons = { point: pointIcon, line: lineIcon, polygon: polygonIcon }}
    <div class="hold-menu" style:--hold-x={`${holdOrigin.x}px`} style:--hold-y={`${holdOrigin.y}px`}>
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
    background: var(--color-background-raised);
    box-shadow: var(--shadow-control);
    color: var(--color-text-secondary);
    font-size: var(--font-size-body-small);
    line-height: var(--line-height-body);
  }
  .hold-menu {
    position: absolute;
    z-index: var(--layer-popover);
    left: var(--hold-x);
    top: var(--hold-y);
    transform: translate(-50%, -50%);
    pointer-events: none;
  }
</style>
