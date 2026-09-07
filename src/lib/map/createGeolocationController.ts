export type GeolocationState =
  | 'idle'
  | 'locating'
  | 'following'
  | 'background'
  | 'error'
  | 'unavailable';

interface GeolocationControllerOptions {
  onStateChange: (state: GeolocationState, message: string) => void;
  onPosition: (position: GeolocationPosition) => void;
  onRecenter: (position: GeolocationPosition) => void;
  onClear: () => void;
}

export interface GeolocationController {
  toggle: () => void;
  stopFollowing: () => void;
  destroy: () => void;
}

const positionOptions: PositionOptions = { enableHighAccuracy: true, timeout: 10000 };

function errorMessage(code: number) {
  switch (code) {
    case 1:
      return 'Location access was denied. Check this website’s location permission and, on iPhone or iPad, Location Services for Safari in Settings. Then tap location to try again.';
    case 3:
      return 'Finding your location timed out. Tap location to try again.';
    default:
      return 'Your position is unavailable. Check your location signal and tap location to try again.';
  }
}

export function createGeolocationController(
  options: GeolocationControllerOptions,
): GeolocationController {
  const geolocation = navigator.geolocation;
  let state: GeolocationState = window.isSecureContext && geolocation ? 'idle' : 'unavailable';
  let watchId: number | undefined;
  let generation = 0;
  let destroyed = false;
  let lastPosition: GeolocationPosition | undefined;

  function publish(next: GeolocationState, message = '') {
    state = next;
    options.onStateChange(state, message);
  }

  function clearTracking() {
    // Invalidate queued callbacks before clearing the browser watch.
    generation++;
    if (watchId !== undefined) {
      geolocation.clearWatch(watchId);
      watchId = undefined;
    }
    lastPosition = undefined;
    options.onClear();
  }

  function start() {
    const request = ++generation;
    const isCurrent = () => !destroyed && request === generation;
    const fail = (code: number) => {
      if (!isCurrent()) return;
      clearTracking();
      publish('error', errorMessage(code));
    };

    publish('locating');
    try {
      // Keep this synchronous all the way from the click. Permission queries can
      // disagree with actual access, and must never gate this request.
      const id = geolocation.watchPosition((position) => {
        if (!isCurrent()) return;
        lastPosition = position;
        options.onPosition(position);
        if (state !== 'background') {
          publish('following');
          options.onRecenter(position);
        }
      }, (error) => fail(error.code), positionOptions);

      // Also handle a synchronous failure or cancellation before the ID returns.
      if (isCurrent()) watchId = id;
      else geolocation.clearWatch(id);
    } catch (error) {
      const denied = error instanceof DOMException &&
        (error.name === 'SecurityError' || error.name === 'NotAllowedError');
      fail(denied ? 1 : 2);
    }
  }

  publish(state, state === 'unavailable'
    ? 'Location is unavailable. Open this page over HTTPS in a browser that supports location.'
    : '');

  return {
    toggle() {
      if (destroyed || state === 'unavailable') return;
      if (state === 'locating' || state === 'following') {
        clearTracking();
        publish('idle');
      } else if (state === 'background') {
        publish(lastPosition ? 'following' : 'locating');
        if (lastPosition) options.onRecenter(lastPosition);
      } else {
        start();
      }
    },
    stopFollowing() {
      if (!destroyed && (state === 'following' || state === 'locating')) {
        publish('background');
      }
    },
    destroy() {
      if (destroyed) return;
      destroyed = true;
      clearTracking();
    },
  };
}
