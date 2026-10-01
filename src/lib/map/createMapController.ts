import {
  AttributionControl,
  Map,
  setWorkerUrl,
  type ErrorEvent,
} from 'maplibre-gl';
import mapWorkerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url';
import {
  applyRasterGrayscale,
  createRasterStyle,
  mapDefaults,
  SATELLITE_LAYER_ID,
} from './mapConfig';
import { createGeolocationController, type GeolocationState } from './createGeolocationController';
import { createGeolocationDisplay } from './createGeolocationDisplay';
import type { HoldOrigin } from './createMapHoldController';
import { createMapDrawingInteraction, obstacleMenuOuterRadius, type HoldMode } from './createMapDrawingInteraction';
import { createDrawingController, type DrawingState } from '../reporting/createDrawingController';
import type { GeographicVertex, Obstacle } from '../reporting/obstacle';
import { createReportController } from '../reporting/createReportController';
import { createDrawingDisplay } from './createDrawingDisplay';
import { createObstacleDisplay } from './createObstacleDisplay';
import { findObstacleInCircle, type RegisteredObstacle, type ScreenPoint } from '../obstacles/registeredObstacles';
import { MetricScaleControl } from './MetricScaleControl';

setWorkerUrl(mapWorkerUrl);

interface MapControllerOptions {
  initialOpacity: number;
  initialGrayscale: boolean;
  onGeolocationAccuracyChange: (accuracy: number | null) => void;
  onMapClick: () => void;
  onGeolocationStateChange: (state: GeolocationState, message: string) => void;
  onHoldChange: (origin: HoldOrigin | null) => void;
  onHoldMove: (x: number, y: number) => void;
  onDrawingChange: (state: DrawingState) => void;
  onObstacleRegistered?: (obstacle: Obstacle, positionReady?: Promise<Obstacle['gps_position']>) => void;
  /** Circle centre in container pixels (null when hidden) and the obstacle it currently selects. */
  onErrorCircleChange?: (center: ScreenPoint | null, match: RegisteredObstacle | null) => void;
}

export interface CameraTarget {
  lng: number;
  lat: number;
  zoom: number;
}

export interface MapController {
  setSatelliteOpacity: (opacity: number) => void;
  setGrayscale: (grayscale: boolean) => void;
  setHoldMode: (mode: HoldMode) => void;
  setRegisteredObstacles: (obstacles: readonly RegisteredObstacle[]) => void;
  moveErrorCircle: (x: number, y: number) => void;
  stopCamera: () => void;
  toggleGeolocation: () => void;
  flyToLocation: (target: CameraTarget) => void;
  undoDrawing: () => void;
  deleteDrawing: () => void;
  completeDrawing: () => void;
  focus: () => void;
  destroy: () => void;
}

export function createMapController(
  container: HTMLDivElement,
  options: MapControllerOptions,
): MapController {
  let satelliteOpacity = options.initialOpacity;
  let grayscale = options.initialGrayscale;
  let destroyed = false;
  const map = new Map({
    ...mapDefaults,
    container,
    style: createRasterStyle(satelliteOpacity, grayscale),
  });
  map.addControl(new AttributionControl({ compact: true }), 'bottom-left');
  const scaleWidth = Number.parseFloat(getComputedStyle(container).getPropertyValue('--map-scale-max-width'));
  map.addControl(new MetricScaleControl({ maxWidth: scaleWidth }), 'bottom-right');
  const locationDisplay = createGeolocationDisplay(map, () => geolocation.stopFollowing());
  const geolocation = createGeolocationController({
    onStateChange: options.onGeolocationStateChange,
    onPosition: (position) => {
      locationDisplay.show(position);
      options.onGeolocationAccuracyChange(position.coords.accuracy);
    },
    onRecenter: (position) => {
      // Full-screen pages keep the map mounted but inert. GPS still updates its marker;
      // it must not move the camera the user expects to return to.
      if (!container.closest('[inert]')) locationDisplay.recenter(position);
    },
    onClear: () => { locationDisplay.clear(); options.onGeolocationAccuracyChange(null); },
  });
  const reporting = createReportController({
    onRegister: (obstacle, positionReady) => options.onObstacleRegistered?.(obstacle, positionReady),
  });
  const drawingDisplay = createDrawingDisplay(map);
  let drawingStatus: DrawingState['status'] = 'idle';
  const drawing = createDrawingController({
    onChange: (state) => {
      if (drawingStatus === 'idle' && state.status === 'drawing') reporting.start();
      if (state.status === 'idle') reporting.cancel();
      drawingStatus = state.status;
      drawingDisplay.show(state.draft);
      drawingInteraction.sync(state);
      options.onDrawingChange(state);
    },
    onComplete: reporting.complete,
  });
  const drawingInteraction = createMapDrawingInteraction(map, drawing, {
    onHoldChange: options.onHoldChange,
    onHoldMove: options.onHoldMove,
    onErrorReportPlace: (center) => { errorCircleCenter = center; syncErrorReport(); },
  });
  const obstacleDisplay = createObstacleDisplay(map);
  let holdMode: HoldMode = 'obstacle';
  let registeredObstacles: readonly RegisteredObstacle[] = [];
  // Anchored geographically so the circle follows the map while panning or zooming.
  let errorCircleCenter: GeographicVertex | null = null;

  function project([lng, lat]: GeographicVertex): ScreenPoint {
    const { x, y } = map.project([lng, lat]);
    return { x, y };
  }

  function syncErrorReport() {
    if (destroyed) return;
    const active = holdMode === 'error-report';
    const center = active && errorCircleCenter ? project(errorCircleCenter) : null;
    const match = center && findObstacleInCircle(center, registeredObstacles,
      (obstacle) => project([obstacle.lng, obstacle.lat]), obstacleMenuOuterRadius);
    obstacleDisplay.show(active ? registeredObstacles : null, match?.id ?? null);
    options.onErrorCircleChange?.(center, match ?? null);
  }

  function setHoldMode(mode: HoldMode) {
    if (destroyed) return;
    drawingInteraction.setHoldMode(mode);
    holdMode = mode;
    if (mode !== 'error-report') errorCircleCenter = null;
    syncErrorReport();
  }

  function setSatelliteOpacity(opacity: number) {
    if (destroyed) return;
    // Keep changes made before the layer is ready so handleLoad can apply them.
    satelliteOpacity = opacity;
    if (map.getLayer(SATELLITE_LAYER_ID)) {
      map.setPaintProperty(SATELLITE_LAYER_ID, 'raster-opacity', opacity);
    }
  }

  function setGrayscale(nextGrayscale: boolean) {
    if (destroyed) return;
    grayscale = nextGrayscale;
    applyRasterGrayscale(map, grayscale);
  }

  function flyToLocation(target: CameraTarget) {
    if (destroyed) return;
    // A programmatic move carries no originalEvent, so the display cannot release
    // following on its own and the next fix would drag the camera back off the result.
    geolocation.stopFollowing();
    map.flyTo({
      center: [target.lng, target.lat],
      zoom: target.zoom,
      bearing: map.getBearing(),
    });
  }

  function handleMapClick() {
    options.onMapClick();
  }

  function handleResize() {
    drawingInteraction.cancel();
    map.resize();
  }

  function handleLoad() {
    setSatelliteOpacity(satelliteOpacity);
    map.resize();

    const attribution = container.querySelector<HTMLDetailsElement>('.maplibregl-ctrl-attrib');
    if (attribution?.classList.contains('maplibregl-compact')) {
      attribution.open = false;
      attribution.classList.remove('maplibregl-compact-show');
    }
  }

  function handleStyleLoad() {
    setSatelliteOpacity(satelliteOpacity);
    setGrayscale(grayscale);
  }

  function handleMapError(event: ErrorEvent) {
    console.error('MapLibre error:', event);
  }

  map.on('click', handleMapClick);
  map.on('move', syncErrorReport);
  map.on('load', handleLoad);
  map.on('style.load', handleStyleLoad);
  map.on('error', handleMapError);
  window.addEventListener('resize', handleResize);

  return {
    focus: () => map.getCanvas().focus({ preventScroll: true }),
    stopCamera: () => { if (!destroyed) map.stop(); },
    setSatelliteOpacity,
    setGrayscale,
    setHoldMode,
    setRegisteredObstacles: (obstacles) => { registeredObstacles = obstacles; syncErrorReport(); },
    moveErrorCircle: (x, y) => {
      if (destroyed || holdMode !== 'error-report') return;
      const { lng, lat } = map.unproject([x, y]);
      errorCircleCenter = [lng, lat];
      syncErrorReport();
    },
    toggleGeolocation: geolocation.toggle,
    flyToLocation,
    undoDrawing: () => { if (!destroyed) drawing.undo(); },
    deleteDrawing: () => { if (!destroyed) drawing.delete(); },
    completeDrawing: () => { if (!destroyed) drawing.complete(); },
    destroy() {
      if (destroyed) return;
      destroyed = true;
      window.removeEventListener('resize', handleResize);
      map.off('click', handleMapClick);
      map.off('move', syncErrorReport);
      map.off('load', handleLoad);
      map.off('style.load', handleStyleLoad);
      map.off('error', handleMapError);
      drawingInteraction.destroy();
      drawingDisplay.destroy();
      obstacleDisplay.destroy();
      reporting.destroy();
      geolocation.destroy();
      locationDisplay.destroy();
      map.remove();
    },
  };
}
