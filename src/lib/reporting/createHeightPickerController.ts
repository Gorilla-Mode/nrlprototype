import { minObstacleHeightMeters, maxObstacleHeightMeters } from './reporting.js';

type HeightItem = Pick<HTMLElement, 'getBoundingClientRect'>;
type HeightTrack = HeightItem & Pick<HTMLElement, 'scrollLeft' | 'scrollWidth' | 'clientWidth'> & {
  scrollTo: (options: ScrollToOptions) => void;
};

export function createHeightPickerController(options: {
  track: HeightTrack;
  items: ReadonlyMap<number, HeightItem>;
  getValue: () => number;
  enabled: () => boolean;
  onchange: (value: number) => void;
  reducedMotion: () => boolean;
  requestFrame: (callback: FrameRequestCallback) => number;
  cancelFrame: (id: number) => void;
}) {
  const { track, items } = options;
  let frame: number | undefined;
  let scrollValue: number | undefined;
  let target: number | undefined;

  function center(value: number, instant: boolean) {
    const item = items.get(value);
    if (!item) return;
    const bounds = track.getBoundingClientRect();
    const itemBounds = item.getBoundingClientRect();
    const left = track.scrollLeft + itemBounds.left + itemBounds.width / 2 - bounds.left - bounds.width / 2;
    const destination = Math.max(0, Math.min(track.scrollWidth - track.clientWidth, left));
    const immediate = instant || options.reducedMotion();
    target = immediate || Math.abs(track.scrollLeft - destination) < 1 ? undefined : destination;
    track.scrollTo({ left: destination, behavior: immediate ? 'instant' : 'smooth' });
  }

  function scroll() {
    if (!options.enabled() || frame !== undefined) return;
    frame = options.requestFrame(() => {
      frame = undefined;
      if (!options.enabled()) return;
      // Explicit selections own their animation; intermediate values must not undo them.
      if (target !== undefined) {
        if (Math.abs(track.scrollLeft - target) < 1) target = undefined;
        return;
      }
      const bounds = track.getBoundingClientRect();
      const middle = bounds.left + bounds.width / 2;
      let closest = options.getValue();
      let distance = Infinity;
      for (const [value, item] of items) {
        const rect = item.getBoundingClientRect();
        const nextDistance = Math.abs(rect.left + rect.width / 2 - middle);
        if (nextDistance < distance) {
          closest = value;
          distance = nextDistance;
        }
      }
      if (closest !== options.getValue()) {
        scrollValue = closest;
        options.onchange(closest);
      }
    });
  }

  function stop() {
    if (frame !== undefined) options.cancelFrame(frame);
    frame = undefined;
    target = undefined;
    scrollValue = undefined;
    track.scrollTo({ left: track.scrollLeft, behavior: 'instant' });
  }

  return {
    scroll,
    stop,
    sync(value: number, instant = false) {
      // Echoes of touch-scroll updates must never restart a centering animation.
      if (!instant && value === scrollValue) return;
      scrollValue = undefined;
      center(value, instant);
    },
    select(value: number) {
      if (!options.enabled()) return;
      const next = Math.max(minObstacleHeightMeters, Math.min(maxObstacleHeightMeters, value));
      scrollValue = undefined;
      options.onchange(next);
      center(next, false);
    },
  };
}
