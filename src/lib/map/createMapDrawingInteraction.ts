import type { Map, MapLibreEvent } from 'maplibre-gl';
import { createMapHoldController, type HoldOrigin } from './createMapHoldController.js';
import { getHoveredRadialSegment } from '../radial-menu/radialMenu.js';
import type { DrawingController, DrawingState } from '../reporting/createDrawingController.js';
import { obstacleGeometryChoices, type GeographicVertex } from '../reporting/obstacle.js';

export const obstacleMenuInnerRadius = 46;
export const obstacleMenuOuterRadius = 112;

/** What a released hold on the map does: start new geometry, or report an error on an existing obstacle. */
export type HoldMode = 'obstacle' | 'error-report';

export function createMapDrawingInteraction(map: Map, drawing: DrawingController, options: {
  onHoldChange: (origin: HoldOrigin | null) => void;
  onHoldMove: (x: number, y: number) => void;
  /** Error-report release: the original press coordinate becomes the circle centre. */
  onErrorReportPlace?: (center: GeographicVertex) => void;
}) {
  const canvas = map.getCanvas();
  const view = canvas.ownerDocument.defaultView!;
  const listeners = new AbortController();
  const pointers = new Set<number>();
  let initialVertex: GeographicVertex | undefined;
  let press: { id: number; x: number; y: number; pointerType: string; released: boolean } | undefined;
  let lastTouch: { x: number; y: number; time: number } | undefined;
  let restoreDoubleClickZoom: boolean | undefined;
  let destroyed = false;
  let holdMode: HoldMode = 'obstacle';
  let holdSuspended = false;

  function coordinate(x: number, y: number): GeographicVertex {
    const { lng, lat } = map.unproject([x, y]);
    return [lng, lat];
  }

  // Register hold suppression first: its release click must never reach the drawing listener.
  const hold = createMapHoldController(canvas, {
    isEnabled: () => !holdSuspended && drawing.getState().status === 'idle',
    onPressStart: ({ x, y }) => { initialVertex = coordinate(x, y); },
    onActivate: () => map.stop(),
    onOpen: options.onHoldChange,
    onClose: () => options.onHoldChange(null),
    onMove: options.onHoldMove,
    onRelease: (x, y) => {
      if (holdMode === 'error-report') {
        if (initialVertex) options.onErrorReportPlace?.(initialVertex);
        initialVertex = undefined;
        return;
      }
      const index = getHoveredRadialSegment({ x, y }, obstacleGeometryChoices.length, obstacleMenuInnerRadius);
      if (index !== null && initialVertex) drawing.start(obstacleGeometryChoices[index].type, initialVertex);
      initialVertex = undefined;
    },
  });

  function cancelTap() { press = undefined; }

  function handlePointerDown(event: PointerEvent) {
    pointers.add(event.pointerId);
    cancelTap();
    if (drawing.getState().status !== 'drawing' || event.target !== canvas || pointers.size !== 1 ||
      !event.isPrimary || event.button !== 0 || event.ctrlKey || event.shiftKey || event.altKey || event.metaKey) return;
    press = { id: event.pointerId, x: event.clientX, y: event.clientY, pointerType: event.pointerType, released: false };
  }

  function handlePointerMove(event: PointerEvent) {
    if (press?.id === event.pointerId && !press.released &&
      (event.buttons === 0 || Math.hypot(event.clientX - press.x, event.clientY - press.y) >= 3)) cancelTap();
  }

  function handlePointerEnd(event: PointerEvent) {
    pointers.delete(event.pointerId);
    if (press?.id !== event.pointerId) return;
    if (event.type === 'pointercancel' || Math.hypot(event.clientX - press.x, event.clientY - press.y) >= 3) cancelTap();
    else press.released = true;
  }

  function handleClick(event: MouseEvent) {
    const tap = press;
    cancelTap();
    if (!tap?.released || event.target !== canvas || event.defaultPrevented || event.detail > 1 ||
      event.button !== 0 || event.ctrlKey || event.shiftKey || event.altKey || event.metaKey ||
      drawing.getState().status !== 'drawing') return;
    // Some touch browsers report detail=1 for both clicks of a double tap.
    if (tap.pointerType === 'touch') {
      const previous = lastTouch;
      lastTouch = { x: tap.x, y: tap.y, time: event.timeStamp };
      if (previous && event.timeStamp - previous.time < 500 && Math.hypot(tap.x - previous.x, tap.y - previous.y) < 25) return;
    }
    const rect = canvas.getBoundingClientRect();
    drawing.append(coordinate(event.clientX - rect.left, event.clientY - rect.top));
  }

  function cancel() {
    hold.cancel();
    cancelTap();
    initialVertex = undefined;
  }

  function handleMoveStart(event: MapLibreEvent) {
    // MapLibre emits movestart for a resize even when the camera stays still.
    if (event.originalEvent || map.isMoving()) cancel();
  }

  function handleBlur() { pointers.clear(); cancel(); }
  function handleLostCapture(event: PointerEvent) {
    if (press?.id === event.pointerId && !press.released) cancelTap();
  }

  function sync(state: DrawingState) {
    if (destroyed) return;
    if (state.status === 'drawing' && restoreDoubleClickZoom === undefined) {
      restoreDoubleClickZoom = map.doubleClickZoom.isEnabled();
      map.doubleClickZoom.disable();
    } else if (state.status !== 'drawing') {
      if (restoreDoubleClickZoom) map.doubleClickZoom.enable();
      restoreDoubleClickZoom = undefined;
      cancelTap();
      lastTouch = undefined;
    }
  }

  const capture = { capture: true, signal: listeners.signal };
  view.addEventListener('pointerdown', handlePointerDown, capture);
  view.addEventListener('pointermove', handlePointerMove, capture);
  view.addEventListener('pointerup', handlePointerEnd, capture);
  view.addEventListener('pointercancel', handlePointerEnd, capture);
  view.addEventListener('click', handleClick, capture);
  view.addEventListener('wheel', cancelTap, capture);
  view.addEventListener('blur', handleBlur, capture);
  canvas.addEventListener('lostpointercapture', handleLostCapture, capture);
  map.on('movestart', handleMoveStart);
  sync(drawing.getState());

  /** Pauses the hold gesture entirely, e.g. while another gesture owns the map. */
  function setHoldSuspended(suspended: boolean) {
    holdSuspended = suspended;
    if (suspended) cancel();
  }

  function setHoldMode(mode: HoldMode) {
    if (mode === holdMode) return;
    holdMode = mode;
    // An open menu belongs to the previous mode; never let it release into the new one.
    cancel();
  }

  return {
    cancel,
    sync,
    setHoldMode,
    setHoldSuspended,
    destroy() {
      if (destroyed) return;
      destroyed = true;
      listeners.abort();
      map.off('movestart', handleMoveStart);
      hold.destroy();
      cancelTap();
      pointers.clear();
      if (restoreDoubleClickZoom) map.doubleClickZoom.enable();
    },
  };
}
