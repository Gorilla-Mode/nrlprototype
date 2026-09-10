import {
  Map,
  setWorkerUrl,
  type ErrorEvent,
  type MapLibreEvent,
} from 'maplibre-gl';
import mapWorkerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url';
import {
  createRasterStyle,
  mapDefaults,
  SATELLITE_LAYER_ID,
} from './mapConfig';
import { createGeolocationController, type GeolocationState } from './createGeolocationController';
import { createGeolocationDisplay } from './createGeolocationDisplay';
import { createMapHoldController, type HoldOrigin } from './createMapHoldController';

setWorkerUrl(mapWorkerUrl);

interface MapControllerOptions {
  initialOpacity: number;
  onMapClick: () => void;
  onGeolocationStateChange: (state: GeolocationState, message: string) => void;
  onHoldChange: (origin: HoldOrigin | null) => void;
  onHoldMove: (x: number, y: number) => void;
}

export interface MapController {
  setSatelliteOpacity: (opacity: number) => void;
  toggleGeolocation: () => void;
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
  const hold = createMapHoldController(map.getCanvas(), {
    onActivate: () => map.stop(),
    onOpen: options.onHoldChange,
    onClose: () => options.onHoldChange(null),
    onMove: options.onHoldMove,
  });

  function setSatelliteOpacity(opacity: number) {
    if (destroyed) return;
    // Keep changes made before the layer is ready so handleLoad can apply them.
    satelliteOpacity = opacity;
    if (map.getLayer(SATELLITE_LAYER_ID)) {
      map.setPaintProperty(SATELLITE_LAYER_ID, 'raster-opacity', opacity);
    }
  }

  function handleMapClick() {
    options.onMapClick();
  }

  function handleResize() {
    hold.cancel();
    map.resize();
  }

  function handleMoveStart(event: MapLibreEvent) {
    // resize() also emits movestart without camera movement, including on initial load.
    // Real window resizes are handled above; user navigation and camera animations cancel holds.
    if (event.originalEvent || map.isMoving()) hold.cancel();
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
  map.on('movestart', handleMoveStart);
  window.addEventListener('resize', handleResize);

  return {
    setSatelliteOpacity,
    toggleGeolocation: geolocation.toggle,
    destroy() {
      if (destroyed) return;
      destroyed = true;
      window.removeEventListener('resize', handleResize);
      map.off('click', handleMapClick);
      map.off('load', handleLoad);
      map.off('error', handleMapError);
      map.off('movestart', handleMoveStart);
      hold.destroy();
      geolocation.destroy();
      locationDisplay.destroy();
      map.remove();
    },
  };
}
