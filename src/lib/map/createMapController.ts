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
import { createMapDrawingInteraction, type HoldMode } from './createMapDrawingInteraction';
import { createDrawingController, type DrawingState } from '../reporting/createDrawingController';
import type { GeographicVertex, Obstacle, ObstacleGeometryType } from '../reporting/obstacle';
import { createReportController } from '../reporting/createReportController';
import { createDrawingDisplay } from './createDrawingDisplay';
import { createObstacleDisplay } from './createObstacleDisplay';
import { createPositionCorrectionDisplay } from './createPositionCorrectionDisplay';
import { createPositionDragInteraction } from './createPositionDragInteraction';
import type { RegisteredObstacle, ScreenPoint } from '../obstacles/registeredObstacles';
import { createMapErrorReportController, type ErrorReportTarget } from './createMapErrorReportController';
import type { PlacementEditingVariantId } from './placementEditing';
import { createVertexEditingInteraction, type EditableVertexHandle } from './createVertexEditingInteraction';
import { MetricScaleControl } from './MetricScaleControl';

setWorkerUrl(mapWorkerUrl);

interface MapControllerOptions {
  placementEditing?: PlacementEditingVariantId;
  onVertexHandlesChange?: (handles: readonly EditableVertexHandle[]) => void;
  initialOpacity: number;
  initialGrayscale: boolean;
  onGeolocationAccuracyChange: (accuracy: number | null) => void;
  onMapClick: () => void;
  onGeolocationStateChange: (state: GeolocationState, message: string) => void;
  onHoldChange: (origin: HoldOrigin | null) => void;
  onHoldMove: (x: number, y: number) => void;
  onDrawingChange: (state: DrawingState) => void;
  onObstacleRegistered?: (obstacle: Obstacle, positionReady?: Promise<Obstacle['gps_position']>) => void;
  /**
   * Circle centre in container pixels and on the map (null when hidden), and the obstacle
   * it currently selects; never a match while correcting a position.
   */
  onErrorCircleChange?: (center: ScreenPoint | null, match: RegisteredObstacle | null, position: GeographicVertex | null) => void;
  onPositionDragChange?: (dragging: boolean) => void;
}

export interface CameraTarget {
  lng: number;
  lat: number;
  zoom: number;
}

export interface MapController {
  setVisible: (visible: boolean) => void;
  vertexKeyDown: (index: number, event: KeyboardEvent) => void;
  vertexKeyUp: (event: KeyboardEvent) => void;
  finishKeyboardMove: () => void;
  movePersistentCenter: (x: number, y: number) => void;
  selectPersistentGeometry: (type: ObstacleGeometryType) => void;
  cancelPlacement: () => void;
  setSatelliteOpacity: (opacity: number) => void;
  setGrayscale: (grayscale: boolean) => void;
  setHoldMode: (mode: HoldMode) => void;
  setRegisteredObstacles: (obstacles: readonly RegisteredObstacle[]) => void;
  moveErrorCircle: (x: number, y: number) => void;
  /** Reuses the error circle to pick a corrected position, starting at `start`. */
  startPositionCorrection: (origin: GeographicVertex, start: GeographicVertex) => void;
  endPositionCorrection: () => void;
  zoomIn: () => void;
  zoomOut: () => void;
  /** Height of a panel covering the bottom of the map; the position circle stays above it. */
  setBottomInset: (pixels: number) => void;
  stopCamera: () => void;
  toggleGeolocation: () => void;
  flyToLocation: (target: CameraTarget) => void;
  undoDrawing: () => void;
  deleteDrawing: () => void;
  completeDrawing: () => void;
  setCrosshairMode: (enabled: boolean) => void;
  setCrosshairSize: (pixels: number) => void;
  sampleErrorReportTarget: () => ErrorReportTarget;
  startAtCrosshair: (type: ObstacleGeometryType) => void;
  appendAtCrosshair: () => void;
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
  let holdMode: HoldMode = 'obstacle';
  let crosshairMode = false;
  let visible = true;
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
  const variant = options.placementEditing ?? 'default';
  const drawing = createDrawingController({
    vertexEditing: variant !== 'default',
    deferPointCompletion: variant === 'basic',
    onChange: (state) => {
      if (drawingStatus === 'idle' && state.status === 'drawing') reporting.start();
      if (state.status === 'idle') reporting.cancel();
      drawingStatus = state.status;
      drawingDisplay.show(state.draft);
      drawingInteraction.sync(state);
      vertexEditing.sync(state);
      options.onDrawingChange(state);
    },
    onComplete: reporting.complete,
  });
  const vertexEditing = createVertexEditingInteraction(map, drawing, {
    variant, onHandlesChange: (handles) => options.onVertexHandlesChange?.(handles),
  });
  const drawingInteraction = createMapDrawingInteraction(map, drawing, {
    variant,
    onHoldChange: options.onHoldChange,
    onHoldMove: options.onHoldMove,
    onErrorReportPlace: (center) => errorReporting.placeCircle(center),
    // Marker radius 7 px plus a generous 24 px touch margin.
    isOnObstacle: (origin) => errorReporting.isOnObstacle(origin, 7 + 24),
  });
  const obstacleDisplay = createObstacleDisplay(map);
  const correctionDisplay = createPositionCorrectionDisplay(map);
  const positionDrag = createPositionDragInteraction(map, {
    getCenter: () => errorReporting.getDragCenter(),
    onMove: (x, y) => errorReporting.moveCircle(x, y),
    onDragChange: (dragging) => options.onPositionDragChange?.(dragging),
  });
  const errorReporting = createMapErrorReportController(map, {
    onChange: ({ center, match, position }) => options.onErrorCircleChange?.(center, match, position),
    onObstaclesChange: (obstacles, selectedId) => obstacleDisplay.show(obstacles, selectedId),
    onCorrectionChange: (origin, target) => correctionDisplay.show(origin, target),
    onGesturesChange: (correcting, crosshair) => {
      drawingInteraction.setHoldSuspended(correcting);
      positionDrag.setEnabled(correcting && !crosshair);
    },
    onCameraChange: () => geolocation.stopFollowing(),
  });

  function setHoldMode(mode: HoldMode) {
    if (destroyed || mode === holdMode || (mode === 'error-report' && drawing.getState().status !== 'idle')) return;
    holdMode = mode;
    vertexEditing.cancel();
    vertexEditing.setEnabled(visible && mode === 'obstacle');
    drawingInteraction.setHoldMode(mode);
    errorReporting.setHoldMode(mode);
  }

  function setCrosshairMode(enabled: boolean) {
    if (destroyed || crosshairMode === enabled) return;
    crosshairMode = enabled;
    vertexEditing.cancel();
    drawingInteraction.setCrosshairMode(enabled);
    errorReporting.setCrosshairMode(enabled);
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
    vertexEditing.cancel();
    map.resize();
  }

  function handleVisibility() {
    if (document.hidden) { drawingInteraction.cancel(); vertexEditing.cancel(); }
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
  map.on('load', handleLoad);
  map.on('style.load', handleStyleLoad);
  map.on('error', handleMapError);
  window.addEventListener('resize', handleResize);
  document.addEventListener('visibilitychange', handleVisibility);

  return {
    setVisible: (value) => {
      if (destroyed || visible === value) return;
      visible = value;
      drawingInteraction.setVisible(value);
      vertexEditing.setEnabled(value && holdMode === 'obstacle');
    },
    vertexKeyDown: vertexEditing.keyDown,
    vertexKeyUp: vertexEditing.keyUp,
    finishKeyboardMove: vertexEditing.finishKeyboardMove,
    movePersistentCenter: drawingInteraction.movePersistentCenter,
    selectPersistentGeometry: drawingInteraction.selectPersistentGeometry,
    cancelPlacement: () => { drawingInteraction.cancel(); vertexEditing.cancel(); },
    focus: () => map.getCanvas().focus({ preventScroll: true }),
    stopCamera: () => { if (!destroyed) map.stop(); },
    setSatelliteOpacity,
    setGrayscale,
    setHoldMode,
    setRegisteredObstacles: errorReporting.setRegisteredObstacles,
    moveErrorCircle: errorReporting.moveCircle,
    startPositionCorrection: errorReporting.startPositionCorrection,
    endPositionCorrection: errorReporting.endPositionCorrection,
    setBottomInset: errorReporting.setBottomInset,
    sampleErrorReportTarget: errorReporting.sample,
    setCrosshairSize: errorReporting.setCrosshairSize,
    zoomIn: () => { if (!destroyed) map.zoomIn(); },
    zoomOut: () => { if (!destroyed) map.zoomOut(); },
    toggleGeolocation: geolocation.toggle,
    flyToLocation,
    undoDrawing: () => { if (!destroyed) { vertexEditing.cancel(); drawing.undo(); } },
    deleteDrawing: () => { if (!destroyed) { drawingInteraction.cancel(); vertexEditing.cancel(); drawing.delete(); } },
    completeDrawing: () => { if (!destroyed) drawing.complete(); },
    setCrosshairMode,
    startAtCrosshair: drawingInteraction.startAtCrosshair,
    appendAtCrosshair: drawingInteraction.appendAtCrosshair,
    destroy() {
      if (destroyed) return;
      destroyed = true;
      window.removeEventListener('resize', handleResize);
      document.removeEventListener('visibilitychange', handleVisibility);
      map.off('click', handleMapClick);
      map.off('load', handleLoad);
      map.off('style.load', handleStyleLoad);
      map.off('error', handleMapError);
      errorReporting.destroy();
      positionDrag.destroy();
      vertexEditing.destroy();
      drawingInteraction.destroy();
      drawingDisplay.destroy();
      obstacleDisplay.destroy();
      correctionDisplay.destroy();
      reporting.destroy();
      geolocation.destroy();
      locationDisplay.destroy();
      map.remove();
    },
  };
}
