import {
  Map,
  setWorkerUrl,
  type ErrorEvent,
} from 'maplibre-gl';
import mapWorkerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url';
import {
  createRasterStyle,
  mapDefaults,
  SATELLITE_LAYER_ID,
} from './mapConfig';
import { createGeolocationController, type GeolocationState } from './createGeolocationController';
import { createGeolocationDisplay } from './createGeolocationDisplay';
import type { HoldOrigin } from './createMapHoldController';
import { createMapDrawingInteraction } from './createMapDrawingInteraction';
import { createDrawingController, type DrawingState } from '../reporting/createDrawingController';
import type { Obstacle } from '../reporting/obstacle';
import { createReportController } from '../reporting/createReportController';
import { createDrawingDisplay } from './createDrawingDisplay';

setWorkerUrl(mapWorkerUrl);

interface MapControllerOptions {
  initialOpacity: number;
  onMapClick: () => void;
  onGeolocationStateChange: (state: GeolocationState, message: string) => void;
  onHoldChange: (origin: HoldOrigin | null) => void;
  onHoldMove: (x: number, y: number) => void;
  onDrawingChange: (state: DrawingState) => void;
  onObstacleRegistered?: (obstacle: Obstacle) => void;
}

export interface CameraTarget {
  lng: number;
  lat: number;
  zoom: number;
}

export interface MapController {
  setSatelliteOpacity: (opacity: number) => void;
  toggleGeolocation: () => void;
  flyToLocation: (target: CameraTarget) => void;
  undoDrawing: () => void;
  deleteDrawing: () => void;
  completeDrawing: () => void;
  destroy: () => void;
}

export function createMapController(
  container: HTMLDivElement,
  options: MapControllerOptions,
): MapController {
  let satelliteOpacity = options.initialOpacity;
  let destroyed = false;
  const map = new Map({
    ...mapDefaults,
    container,
    style: createRasterStyle(satelliteOpacity),
  });
  const locationDisplay = createGeolocationDisplay(map, () => geolocation.stopFollowing());
  const geolocation = createGeolocationController({
    onStateChange: options.onGeolocationStateChange,
    onPosition: locationDisplay.show,
    onRecenter: locationDisplay.recenter,
    onClear: locationDisplay.clear,
  });
  const reporting = createReportController({
    onRegister: (obstacle) => options.onObstacleRegistered?.(obstacle),
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
  const drawingInteraction = createMapDrawingInteraction(map, drawing, options);

  function setSatelliteOpacity(opacity: number) {
    if (destroyed) return;
    // Keep changes made before the layer is ready so handleLoad can apply them.
    satelliteOpacity = opacity;
    if (map.getLayer(SATELLITE_LAYER_ID)) {
      map.setPaintProperty(SATELLITE_LAYER_ID, 'raster-opacity', opacity);
    }
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

  function handleMapError(event: ErrorEvent) {
    console.error('MapLibre error:', event);
  }

  map.on('click', handleMapClick);
  map.on('load', handleLoad);
  map.on('error', handleMapError);
  window.addEventListener('resize', handleResize);

  return {
    setSatelliteOpacity,
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
      map.off('load', handleLoad);
      map.off('error', handleMapError);
      drawingInteraction.destroy();
      drawingDisplay.destroy();
      reporting.destroy();
      geolocation.destroy();
      locationDisplay.destroy();
      map.remove();
    },
  };
}
