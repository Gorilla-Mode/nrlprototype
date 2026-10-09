import type { Map } from 'maplibre-gl';
import type { ScreenPoint } from '../obstacles/registeredObstacles.js';

/** Separate 56 px grab radius within the ring's hole; touches outside it navigate the map. */
export const positionHandleRadius = 56;

/**
 * Drags the position circle from the map canvas itself, so every touch outside the
 * handle (and any second finger) stays with MapLibre for panning and pinch-zoom.
 */
export function createPositionDragInteraction(map: Map, options: {
  /** Circle centre in canvas pixels, or null when there is nothing to drag. */
  getCenter: () => ScreenPoint | null;
  onMove: (x: number, y: number) => void;
  onDragChange: (dragging: boolean) => void;
}) {
  const canvas = map.getCanvas();
  const view = canvas.ownerDocument.defaultView!;
  const listeners = new AbortController();
  const pointers = new Set<number>();
  let enabled = false;
  let drag: { id: number; clientX: number; clientY: number; x: number; y: number } | undefined;
  let restoreDragPan = false;

  function local(event: PointerEvent): ScreenPoint {
    const rect = canvas.getBoundingClientRect();
    return { x: event.clientX - rect.left, y: event.clientY - rect.top };
  }

  function onHandle(point: ScreenPoint) {
    const center = options.getCenter();
    return !!center && Math.hypot(point.x - center.x, point.y - center.y) <= positionHandleRadius;
  }

  function end() {
    if (!drag) return;
    const id = drag.id;
    drag = undefined;
    if (canvas.hasPointerCapture(id)) canvas.releasePointerCapture(id);
    if (restoreDragPan) map.dragPan.enable();
    restoreDragPan = false;
    canvas.style.cursor = '';
    options.onDragChange(false);
  }

  function handlePointerDown(event: PointerEvent) {
    pointers.add(event.pointerId);
    if (!enabled) return;
    // A second finger turns the gesture into the map's own pinch-zoom.
    if (drag) { end(); return; }
    if (event.target !== canvas || pointers.size !== 1 || !event.isPrimary || event.button !== 0) return;
    const center = options.getCenter();
    if (!center || !onHandle(local(event))) return;
    drag = { id: event.pointerId, clientX: event.clientX, clientY: event.clientY, x: center.x, y: center.y };
    canvas.setPointerCapture(event.pointerId);
    // Pointer events precede MapLibre's mouse/touch events, so this pan never starts.
    if (map.dragPan.isEnabled()) {
      map.dragPan.disable();
      restoreDragPan = true;
    }
    map.stop();
    canvas.style.cursor = 'grabbing';
    options.onDragChange(true);
  }

  function handlePointerMove(event: PointerEvent) {
    if (drag && event.pointerId === drag.id) {
      options.onMove(drag.x + event.clientX - drag.clientX, drag.y + event.clientY - drag.clientY);
    } else if (enabled && !drag && event.pointerType === 'mouse' && event.target === canvas) {
      canvas.style.cursor = onHandle(local(event)) ? 'grab' : '';
    }
  }

  function handlePointerEnd(event: PointerEvent) {
    pointers.delete(event.pointerId);
    if (event.pointerId === drag?.id) end();
  }

  function handleBlur() {
    pointers.clear();
    end();
  }

  const capture = { capture: true, signal: listeners.signal };
  view.addEventListener('pointerdown', handlePointerDown, capture);
  view.addEventListener('pointermove', handlePointerMove, capture);
  view.addEventListener('pointerup', handlePointerEnd, capture);
  view.addEventListener('pointercancel', handlePointerEnd, capture);
  view.addEventListener('blur', handleBlur, capture);

  return {
    setEnabled(next: boolean) {
      enabled = next;
      if (!next) {
        end();
        canvas.style.cursor = '';
      }
    },
    destroy() {
      listeners.abort();
      pointers.clear();
      end();
    },
  };
}
