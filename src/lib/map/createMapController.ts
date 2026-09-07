import {
  Map,
  GeolocateControl,
  setWorkerUrl,
  type ErrorEvent,
  type GeolocateErrorEvent,
} from 'maplibre-gl';
import mapWorkerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url';
import {
  createRasterStyle,
  geolocationOptions,
  mapDefaults,
  SATELLITE_LAYER_ID,
} from './mapConfig';

setWorkerUrl(mapWorkerUrl);

interface MapControllerOptions {
  initialOpacity: number;
  geolocationContainer: HTMLDivElement;
  onMapClick: () => void;
  onLocationMessage: (message: string) => void;
}

export interface MapController {
  setSatelliteOpacity: (opacity: number) => void;
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
  const geolocate = new GeolocateControl(geolocationOptions);

  function setSatelliteOpacity(opacity: number) {
    if (destroyed) return;
    // Keep changes made before the layer is ready so handleLoad can apply them.
    satelliteOpacity = opacity;
    if (map.getLayer(SATELLITE_LAYER_ID)) {
      map.setPaintProperty(SATELLITE_LAYER_ID, 'raster-opacity', opacity);
    }
  }

  function clearLocationMessage() {
    options.onLocationMessage('');
  }

  function handleLocationError(event: GeolocateErrorEvent) {
    options.onLocationMessage(event.code === 1
      ? 'Allow location access in your browser to find your position.'
      : 'Unable to find your location. Please try again.');
  }

  function handleMapClick() {
    options.onMapClick();
  }

  function handleResize() {
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

  options.geolocationContainer.appendChild(geolocate.onAdd(map));
  geolocate.on('trackuserlocationstart', clearLocationMessage);
  geolocate.on('geolocate', clearLocationMessage);
  geolocate.on('error', handleLocationError);
  map.on('click', handleMapClick);
  map.on('load', handleLoad);
  map.on('error', handleMapError);
  window.addEventListener('resize', handleResize);

  return {
    setSatelliteOpacity,
    destroy() {
      if (destroyed) return;
      destroyed = true;
      window.removeEventListener('resize', handleResize);
      geolocate.off('trackuserlocationstart', clearLocationMessage);
      geolocate.off('geolocate', clearLocationMessage);
      geolocate.off('error', handleLocationError);
      map.off('click', handleMapClick);
      map.off('load', handleLoad);
      map.off('error', handleMapError);
      geolocate.onRemove();
      map.remove();
    },
  };
}
