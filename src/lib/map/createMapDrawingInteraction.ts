import type { PlacementEditingVariantId } from './placementEditing.js';
import type { Map, MapLibreEvent } from 'maplibre-gl';
import { createMapHoldController, type HoldOrigin } from './createMapHoldController.js';
import { getHoveredRadialSegment } from '../radial-menu/radialMenu.js';
import type { DrawingController, DrawingState } from '../reporting/createDrawingController.js';
import { obstacleGeometryChoices, type GeographicVertex, type ObstacleGeometryType } from '../reporting/obstacle.js';

export const obstacleMenuInnerRadius = 46;
export const obstacleMenuOuterRadius = 112;

/** What a released hold on the map does: start new geometry, or report an error on an existing obstacle. */
export type HoldMode = 'obstacle' | 'error-report';

export interface CrosshairDrawingState {
  readonly candidate: GeographicVertex | null;
  readonly targetIndex: number | null;
  readonly editing: boolean;
}

export const idleCrosshairDrawingState: CrosshairDrawingState = { candidate: null, targetIndex: null, editing: false };

export function createMapDrawingInteraction(map: Map, drawing: DrawingController, options: {
  variant?: PlacementEditingVariantId;
  onCrosshairChange?: (state: CrosshairDrawingState) => void;
  onHoldChange: (origin: HoldOrigin | null) => void;
  onHoldMove: (x: number, y: number) => void;
  /** Error-report release: the original press coordinate becomes the circle centre. */
  onErrorReportPlace?: (center: GeographicVertex) => void;
  /** Error-report mode: a press on an obstacle opens the ring at once instead of after the hold delay. */
  isOnObstacle?: (origin: HoldOrigin) => boolean;
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
  let crosshairMode = false;
  let holdMode: HoldMode = 'obstacle';
  let holdSuspended = false;
  let visible = true;
  let controllerPan = false;
  let menuCenter: HoldOrigin | undefined;
  let editingIndex: number | null = null;
  let crosshairState = idleCrosshairDrawingState;

  function coordinate(x: number, y: number): GeographicVertex {
    const { lng, lat } = map.unproject([x, y]);
    return [lng, lat];
  }

  // Register hold suppression first: its release click must never reach the drawing listener.
  const hold = createMapHoldController(canvas, {
    isEnabled: () => visible && !canvas.closest('[inert]') && !crosshairMode && !holdSuspended && drawing.getState().status === 'idle',
    holdDelayAt: (origin) => (holdMode === 'error-report' && options.isOnObstacle?.(origin) ? 0 : undefined),
    onPressStart: ({ x, y }) => { initialVertex = coordinate(x, y); },
    onActivate: () => map.stop(),
    persistent: () => options.variant === 'persistent-donut' && holdMode === 'obstacle',
    twoFinger: () => options.variant === 'two-finger' && holdMode === 'obstacle',
    onMapPan: (dx, dy) => {
      controllerPan = true;
      try { map.panBy([-dx, -dy], { animate: false }); }
      finally { controllerPan = false; }
      if (menuCenter) initialVertex = coordinate(menuCenter.x, menuCenter.y);
    },
    onOpen: (origin) => { menuCenter = origin; options.onHoldChange(origin); },
    onClose: () => { menuCenter = undefined; options.onHoldChange(null); },
    onMove: options.onHoldMove,
    onRelease: (x, y) => {
      if (holdMode === 'error-report') {
        // Same rule as the obstacle menu: only a drag out of the centre into the ring confirms.
        const confirmed = getHoveredRadialSegment({ x, y }, 1, obstacleMenuInnerRadius) !== null;
        if (confirmed && initialVertex) options.onErrorReportPlace?.(initialVertex);
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
    if (crosshairMode || holdMode !== 'obstacle' || holdSuspended || drawing.getState().status !== 'drawing' || event.target !== canvas || pointers.size !== 1 ||
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
    if (crosshairMode || holdMode !== 'obstacle' || holdSuspended || !tap?.released || event.target !== canvas || event.defaultPrevented || event.detail > 1 ||
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

  function cancelGesture() {
    hold.cancel();
    cancelTap();
    initialVertex = undefined;
  }

  function handleMoveStart(event: MapLibreEvent) {
    // MapLibre emits movestart for a resize even when the camera stays still.
    if (!controllerPan && (event.originalEvent || map.isMoving())) cancelGesture();
  }

  function handleBlur(event: Event) { if (event.target === view) { pointers.clear(); cancel(); } }
  function handleLostCapture(event: PointerEvent) {
    if (press?.id === event.pointerId && !press.released) cancelTap();
  }

  function sync(state: DrawingState) {
    if (destroyed) return;
    if (!crosshairMode && !holdSuspended && holdMode === 'obstacle' && state.status === 'drawing' && restoreDoubleClickZoom === undefined) {
      restoreDoubleClickZoom = map.doubleClickZoom.isEnabled();
      map.doubleClickZoom.disable();
    } else if (crosshairMode || holdSuspended || holdMode !== 'obstacle' || state.status !== 'drawing') {
      if (restoreDoubleClickZoom) map.doubleClickZoom.enable();
      restoreDoubleClickZoom = undefined;
      cancelTap();
      lastTouch = undefined;
    }
    if (state.status !== 'drawing') editingIndex = null;
    refreshCrosshair();
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
  map.on('resize', handleResize);
  map.on('move', refreshCrosshair);
  view.addEventListener('keydown', handleKeyDown, capture);
  sync(drawing.getState());

  function crosshairVertex(stop = false): GeographicVertex | undefined {
    if (destroyed || !visible || !crosshairMode || holdMode !== 'obstacle' || holdSuspended || canvas.closest('[inert]')) return;
    if (stop) { cancelGesture(); map.stop(); }
    // The rendered crosshair uses the canvas midpoint in CSS pixels, not padded camera center.
    const { width, height } = canvas.getBoundingClientRect();
    if (width <= 0 || height <= 0) return;
    return coordinate(width / 2, height / 2);
  }

  function refreshCrosshair() {
    const state = drawing.getState();
    const candidate = state.status === 'drawing' ? crosshairVertex() : undefined;
    let targetIndex = editingIndex;
    if (candidate && state.draft && targetIndex === null) {
      const { width, height } = canvas.getBoundingClientRect();
      let nearest = Infinity;
      state.draft.vertices.forEach((vertex, index) => {
        const point = map.project([...vertex]);
        const distance = Math.hypot(point.x - width / 2, point.y - height / 2);
        if (distance < nearest) { nearest = distance; targetIndex = index; }
      });
    }
    const next: CrosshairDrawingState = candidate
      ? { candidate, targetIndex, editing: editingIndex !== null }
      : editingIndex !== null
        ? { candidate: null, targetIndex: editingIndex, editing: true }
        : idleCrosshairDrawingState;
    if (next.targetIndex === crosshairState.targetIndex && next.editing === crosshairState.editing &&
      next.candidate?.[0] === crosshairState.candidate?.[0] && next.candidate?.[1] === crosshairState.candidate?.[1]) return;
    crosshairState = next;
    options.onCrosshairChange?.(next);
  }

  function cancelCrosshairEdit() {
    if (editingIndex === null) return;
    editingIndex = null;
    drawing.cancelVertexMove();
    refreshCrosshair();
  }

  function cancel() { cancelGesture(); cancelCrosshairEdit(); }
  function handleResize() { cancelGesture(); refreshCrosshair(); }
  function handleKeyDown(event: KeyboardEvent) {
    if (event.key === 'Escape' && editingIndex !== null) { event.preventDefault(); cancelCrosshairEdit(); }
  }

  /** Pauses the hold gesture entirely, e.g. while another gesture owns the map. */
  function setHoldSuspended(suspended: boolean) {
    if (destroyed) return;
    holdSuspended = suspended;
    if (suspended) cancel();
    sync(drawing.getState());
  }

  function setHoldMode(mode: HoldMode) {
    if (destroyed || mode === holdMode) return;
    holdMode = mode;
    sync(drawing.getState());
    // An open menu belongs to the previous mode; never let it release into the new one.
    cancel();
  }

  return {
    cancel,
    sync,
    getCrosshairState: () => crosshairState,
    beginCrosshairEdit() {
      if (editingIndex !== null || drawing.getState().status !== 'drawing' || !crosshairVertex(true)) return;
      refreshCrosshair();
      const index = crosshairState.targetIndex;
      if (index === null) return;
      editingIndex = index;
      if (!drawing.beginVertexMove(index)) editingIndex = null;
      refreshCrosshair();
    },
    placeCrosshairEdit() {
      if (editingIndex === null) return;
      const vertex = crosshairVertex(true);
      if (!vertex) return;
      drawing.updateVertexMove(vertex);
      editingIndex = null;
      drawing.commitVertexMove();
      refreshCrosshair();
    },
    cancelCrosshairEdit,
    setVisible(value: boolean) { visible = value; if (!value) cancel(); refreshCrosshair(); },
    panPersistentMap(dx: number, dy: number) { hold.panMap(dx, dy); },
    selectPersistentGeometry(type: ObstacleGeometryType) {
      if (options.variant !== 'persistent-donut' || !menuCenter || !initialVertex || !visible || holdMode !== 'obstacle') return;
      const vertex = initialVertex;
      cancel();
      drawing.start(type, vertex);
    },
    setCrosshairMode(enabled: boolean) {
      if (destroyed || crosshairMode === enabled) return;
      cancel();
      crosshairMode = enabled;
      sync(drawing.getState());
    },
    startAtCrosshair(type: ObstacleGeometryType) {
      if (drawing.getState().status !== 'idle') return;
      const vertex = crosshairVertex(true);
      if (vertex) drawing.start(type, vertex);
    },
    appendAtCrosshair() {
      if (drawing.getState().status !== 'drawing' || editingIndex !== null) return;
      const vertex = crosshairVertex(true);
      if (vertex) drawing.append(vertex);
    },
    setHoldMode,
    setHoldSuspended,
    destroy() {
      if (destroyed) return;
      cancel();
      destroyed = true;
      refreshCrosshair();
      listeners.abort();
      map.off('movestart', handleMoveStart);
      map.off('resize', handleResize);
      map.off('move', refreshCrosshair);
      hold.destroy();
      cancelTap();
      pointers.clear();
      if (restoreDoubleClickZoom) map.doubleClickZoom.enable();
    },
  };
}
