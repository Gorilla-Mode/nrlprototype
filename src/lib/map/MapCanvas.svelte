<script lang="ts">
  import { onMount } from 'svelte';
  import { createMapController, type CameraTarget, type MapController } from './createMapController';
  import type { GeolocationState } from './createGeolocationController';
  import type { HoldOrigin } from './createMapHoldController';
  import type { HoldMode } from './createMapDrawingInteraction';
  import type { DrawingState } from '../reporting/createDrawingController';
  import type { GeographicVertex, Obstacle, ObstacleGeometryType } from '../reporting/obstacle';
  import type { RegisteredObstacle, ScreenPoint } from '../obstacles/registeredObstacles';

  interface Props {
    visible?: boolean;
    crosshairMode?: boolean;
    /** Measured rendered width of the crosshair in CSS pixels. */
    crosshairSize?: number;
    opacity: number;
    grayscale: boolean;
    holdMode?: HoldMode;
    registeredObstacles?: readonly RegisteredObstacle[];
    /** Pixels at the bottom covered by a panel. */
    bottomInset?: number;
    onmapclick: () => void;
    onaccuracychange: (accuracy: number | null) => void;
    ongeolocationstatechange: (state: GeolocationState, message: string) => void;
    onholdchange: (origin: HoldOrigin | null) => void;
    onholdmove: (x: number, y: number) => void;
    ondrawingchange: (state: DrawingState) => void;
    onobstacleregistered?: (obstacle: Obstacle, positionReady?: Promise<Obstacle['gps_position']>) => void;
    onerrorcirclechange?: (center: ScreenPoint | null, match: RegisteredObstacle | null, position: GeographicVertex | null) => void;
    onpositiondragchange?: (dragging: boolean) => void;
  }

  let { visible = true, crosshairMode = false, crosshairSize = 0, opacity, grayscale, holdMode = 'obstacle', registeredObstacles = [], bottomInset = 0, onmapclick, onaccuracychange, ongeolocationstatechange, onholdchange, onholdmove, ondrawingchange, onobstacleregistered, onerrorcirclechange, onpositiondragchange }: Props = $props();
  let mapContainer: HTMLDivElement;
  let controller = $state.raw<MapController | null>(null);

  export function toggleGeolocation() {
    controller?.toggleGeolocation();
  }

  export function flyToLocation(target: CameraTarget) { controller?.flyToLocation(target); }

  export function undoDrawing() { controller?.undoDrawing(); }
  export function deleteDrawing() { controller?.deleteDrawing(); }
  export function completeDrawing() { controller?.completeDrawing(); }
  export function startAtCrosshair(type: ObstacleGeometryType) { controller?.startAtCrosshair(type); }
  export function appendAtCrosshair() { controller?.appendAtCrosshair(); }
  export function moveErrorCircle(x: number, y: number) { controller?.moveErrorCircle(x, y); }
  export function startPositionCorrection(origin: GeographicVertex, start: GeographicVertex) { controller?.startPositionCorrection(origin, start); }
  export function endPositionCorrection() { controller?.endPositionCorrection(); }
  export function zoomIn() { controller?.zoomIn(); }
  export function zoomOut() { controller?.zoomOut(); }
  export function sampleErrorReportTarget() { return controller?.sampleErrorReportTarget(); }
  export function focus() { controller?.focus(); }

  onMount(() => {
    const instance = createMapController(mapContainer, {
      initialOpacity: opacity,
      onGeolocationAccuracyChange: onaccuracychange,
      initialGrayscale: grayscale,
      onMapClick: () => onmapclick(),
      onGeolocationStateChange: (state, message) => ongeolocationstatechange(state, message),
      onHoldChange: (origin) => onholdchange(origin),
      onHoldMove: (x, y) => onholdmove(x, y),
      onDrawingChange: (state) => ondrawingchange(state),
      onObstacleRegistered: (obstacle, positionReady) => onobstacleregistered?.(obstacle, positionReady),
      onErrorCircleChange: (center, match, position) => onerrorcirclechange?.(center, match, position),
      onPositionDragChange: (dragging) => onpositiondragchange?.(dragging),
    });
    controller = instance;

    return () => {
      controller = null;
      instance.destroy();
      ongeolocationstatechange('unavailable', '');
    };
  });

  $effect(() => {
    controller?.setHoldMode(holdMode);
    controller?.setCrosshairSize(crosshairSize);
    controller?.setCrosshairMode(crosshairMode);
  });

  $effect(() => {
    controller?.setSatelliteOpacity(opacity);
  });

  $effect(() => {
    controller?.setGrayscale(grayscale);
  });

  $effect(() => {
    controller?.setRegisteredObstacles(registeredObstacles);
  });

  $effect(() => {
    controller?.setBottomInset(bottomInset);
  });

  $effect(() => {
    if (!visible) controller?.stopCamera();
  });
</script>

<div bind:this={mapContainer} class="map-container"></div>

<style>
  .map-container {
    position: absolute;
    inset: 0;
  }

  .map-container :global(.maplibregl-canvas) {
    -webkit-touch-callout: none;
  }

  .map-container :global(.maplibregl-canvas:focus-visible) {
    outline-offset: calc(-1 * var(--space-1));
  }
</style>
