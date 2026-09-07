import { LngLat, LngLatBounds, Marker, type Map, type MapLibreEvent } from 'maplibre-gl';

export function createGeolocationDisplay(map: Map, onUserMove: () => void) {
  const dot = document.createElement('div');
  dot.className = 'maplibregl-user-location-dot';
  dot.setAttribute('aria-hidden', 'true');
  const circle = document.createElement('div');
  circle.className = 'maplibregl-user-location-accuracy-circle';
  circle.setAttribute('aria-hidden', 'true');
  const dotMarker = new Marker({ element: dot });
  const circleMarker = new Marker({ element: circle, pitchAlignment: 'map' });
  let position: GeolocationPosition | undefined;
  let movingCamera = false;
  let destroyed = false;

  function updateAccuracy() {
    if (destroyed || !position) return;
    const center = dotMarker.getLngLat();
    const screen = map.project(center);
    const metersPerPixel = center.distanceTo(map.unproject([screen.x + 100, screen.y])) / 100;
    const diameter = 2 * position.coords.accuracy / metersPerPixel;
    if (!Number.isFinite(diameter) || diameter < 0) return;
    circle.style.width = `${diameter.toFixed(2)}px`;
    circle.style.height = circle.style.width;
  }

  function handleMoveStart(event: MapLibreEvent & { geolocationSource?: boolean }) {
    movingCamera = !!event.geolocationSource;
    // User gestures (including keyboard panning) release the camera. Resizes and
    // our own recentering must leave following active.
    if (event.originalEvent && !event.geolocationSource) onUserMove();
  }

  function handleMoveEnd() {
    movingCamera = false;
  }

  function clear() {
    position = undefined;
    if (movingCamera) map.stop();
    movingCamera = false;
    dotMarker.remove();
    circleMarker.remove();
  }

  map.on('movestart', handleMoveStart);
  map.on('moveend', handleMoveEnd);
  const accuracyEvents = ['zoom', 'move', 'rotate', 'pitch', 'resize'] as const;
  for (const event of accuracyEvents) map.on(event, updateAccuracy);

  return {
    show(next: GeolocationPosition) {
      if (destroyed) return;
      position = next;
      const center = new LngLat(next.coords.longitude, next.coords.latitude);
      circleMarker.setLngLat(center).addTo(map);
      dotMarker.setLngLat(center).addTo(map);
      updateAccuracy();
    },
    recenter(next: GeolocationPosition) {
      if (destroyed) return;
      const center = new LngLat(next.coords.longitude, next.coords.latitude);
      map.fitBounds(LngLatBounds.fromLngLat(center, next.coords.accuracy), {
        maxZoom: 16,
        bearing: map.getBearing(),
      }, { geolocationSource: true });
    },
    clear,
    destroy() {
      if (destroyed) return;
      destroyed = true;
      clear();
      map.off('movestart', handleMoveStart);
      map.off('moveend', handleMoveEnd);
      for (const event of accuracyEvents) map.off(event, updateAccuracy);
    },
  };
}
