<script lang="ts">
  import { onMount } from 'svelte';
  import { createMapController, type CameraTarget, type MapController } from './createMapController';
  import type { GeolocationState } from './createGeolocationController';
  import type { HoldOrigin } from './createMapHoldController';
  import type { DrawingState } from '../reporting/createDrawingController';
  import type { Obstacle } from '../reporting/obstacle';

  interface Props {
    opacity: number;
    grayscale: boolean;
    onmapclick: () => void;
    ongeolocationstatechange: (state: GeolocationState, message: string) => void;
    onholdchange: (origin: HoldOrigin | null) => void;
    onholdmove: (x: number, y: number) => void;
    ondrawingchange: (state: DrawingState) => void;
    onobstacleregistered?: (obstacle: Obstacle) => void;
  }

  let { opacity, grayscale, onmapclick, ongeolocationstatechange, onholdchange, onholdmove, ondrawingchange, onobstacleregistered }: Props = $props();
  let mapContainer: HTMLDivElement;
  let controller = $state.raw<MapController | null>(null);

  export function toggleGeolocation() {
    controller?.toggleGeolocation();
  }

  export function flyToLocation(target: CameraTarget) { controller?.flyToLocation(target); }

  export function undoDrawing() { controller?.undoDrawing(); }
  export function deleteDrawing() { controller?.deleteDrawing(); }
  export function completeDrawing() { controller?.completeDrawing(); }

  onMount(() => {
    const instance = createMapController(mapContainer, {
      initialOpacity: opacity,
      onMapClick: () => onmapclick(),
      onGeolocationStateChange: (state, message) => ongeolocationstatechange(state, message),
      onHoldChange: (origin) => onholdchange(origin),
      onHoldMove: (x, y) => onholdmove(x, y),
      onDrawingChange: (state) => ondrawingchange(state),
      onObstacleRegistered: (obstacle) => onobstacleregistered?.(obstacle),
    });
    controller = instance;

    return () => {
      controller = null;
      instance.destroy();
      ongeolocationstatechange('unavailable', '');
    };
  });

  $effect(() => {
    controller?.setSatelliteOpacity(opacity);
  });
</script>

<div bind:this={mapContainer} class="map-container" class:is-grayscale={grayscale}></div>

<style>
  .map-container {
    position: absolute;
    inset: 0;
  }

  .map-container :global(.maplibregl-canvas) {
    -webkit-touch-callout: none;
  }
</style>
