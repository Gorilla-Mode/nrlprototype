import type { Map } from 'maplibre-gl';
import type { DrawingController, DrawingState } from '../reporting/createDrawingController.js';
import type { ScreenPoint } from '../obstacles/registeredObstacles.js';
import type { GeographicVertex } from '../reporting/obstacle.js';
import type { PlacementEditingVariantId } from './placementEditing.js';

export interface EditableVertexHandle extends ScreenPoint {
  readonly index: number;
}

/** Resolve in CSS pixels, including a 44 px diameter target. Stable ties favour vertex order. */
export function nearestEditableVertex(handles: readonly EditableVertexHandle[], point: ScreenPoint): EditableVertexHandle | undefined {
  let nearest: EditableVertexHandle | undefined;
  let distance = 22;
  for (const handle of handles) {
    const next = Math.hypot(handle.x - point.x, handle.y - point.y);
    if (next <= 22 && (!nearest || next < distance)) { nearest = handle; distance = next; }
  }
  return nearest;
}

export function createVertexEditingInteraction(map: Map, drawing: DrawingController, options: {
  variant: PlacementEditingVariantId;
  onHandlesChange: (handles: readonly EditableVertexHandle[]) => void;
}) {
  const canvas = map.getCanvas();
  const view = canvas.ownerDocument.defaultView!;
  const listeners = new AbortController();
  const pointers = new Set<number>();
  let enabled = true;
  let destroyed = false;
  let suppressClick = false;
  let handles: readonly EditableVertexHandle[] = [];
  let timer: ReturnType<typeof setTimeout> | undefined;
  let press: { id: number; index: number; x: number; y: number; offset: ScreenPoint; original: GeographicVertex; active: boolean } | undefined;
  let keyboardIndex: number | undefined;
  let restoreGestures: (() => void) | undefined;

  function available() {
    return !destroyed && enabled && options.variant !== 'default' && !canvas.closest('[inert]') &&
      drawing.getState().status === 'drawing';
  }

  function refresh() {
    const next = available() ? drawing.getState().draft!.vertices.map((vertex, index) => {
      const point = map.project([...vertex]);
      return { index, x: point.x, y: point.y };
    }) : [];
    if (next.length === handles.length && next.every((handle, index) =>
      handle.index === handles[index].index && handle.x === handles[index].x && handle.y === handles[index].y)) return;
    handles = next;
    options.onHandlesChange(handles);
  }

  function block(event: Event) {
    if (event.cancelable) event.preventDefault();
    event.stopImmediatePropagation();
  }

  function suppressGestures() {
    map.stop();
    const handlers = [map.dragPan, map.dragRotate, map.touchZoomRotate, map.touchPitch,
      map.scrollZoom, map.boxZoom, map.doubleClickZoom, map.keyboard];
    const enabledHandlers = handlers.filter((handler) => handler.isEnabled());
    for (const handler of enabledHandlers) handler.disable();
    restoreGestures = () => { for (const handler of enabledHandlers) handler.enable(); };
  }

  function end(commit: boolean) {
    clearTimeout(timer);
    timer = undefined;
    const previous = press;
    press = undefined;
    const moving = previous?.active || keyboardIndex !== undefined;
    keyboardIndex = undefined;
    if (moving) {
      if (commit) drawing.commitVertexMove();
      else drawing.cancelVertexMove();
    }
    restoreGestures?.();
    restoreGestures = undefined;
    if (previous && canvas.hasPointerCapture(previous.id)) canvas.releasePointerCapture(previous.id);
    refresh();
  }

  function activate() {
    timer = undefined;
    if (!press || !available()) { end(false); return; }
    press.active = true;
    suppressGestures();
    if (!drawing.beginVertexMove(press.index)) { end(false); return; }
    canvas.setPointerCapture(press.id);
  }

  function down(event: PointerEvent) {
    pointers.add(event.pointerId);
    if (pointers.size > 1) { end(false); return; }
    suppressClick = false;
    if (!available() || event.target !== canvas || !event.isPrimary || event.button !== 0 ||
      event.ctrlKey || event.shiftKey || event.altKey || event.metaKey) return;
    if (keyboardIndex !== undefined) end(true);
    refresh();
    const rect = canvas.getBoundingClientRect();
    const point = { x: event.clientX - rect.left, y: event.clientY - rect.top };
    const handle = nearestEditableVertex(handles, point);
    if (!handle) return;
    suppressClick = true;
    press = { id: event.pointerId, index: handle.index, x: event.clientX, y: event.clientY,
      offset: { x: handle.x - point.x, y: handle.y - point.y },
      original: drawing.getState().draft!.vertices[handle.index], active: false };
    // Consume the vertex press for the append listener; map mouse/touch navigation remains available until activation.
    event.stopImmediatePropagation();
    if (options.variant === 'two-finger') activate();
    else timer = setTimeout(activate, 200);
  }

  function move(event: PointerEvent) {
    if (!press || press.id !== event.pointerId) return;
    if (!available() || (event.buttons === 0 && event.type !== 'pointerup')) { end(false); return; }
    if (!press.active) {
      if (Math.hypot(event.clientX - press.x, event.clientY - press.y) > 8) end(false);
      return;
    }
    if (event.clientX === press.x && event.clientY === press.y) {
      drawing.updateVertexMove(press.original);
      return;
    }
    const rect = canvas.getBoundingClientRect();
    const coordinate = map.unproject([event.clientX - rect.left + press.offset.x, event.clientY - rect.top + press.offset.y]);
    drawing.updateVertexMove([coordinate.lng, coordinate.lat]);
  }

  function up(event: PointerEvent) {
    pointers.delete(event.pointerId);
    if (press?.id !== event.pointerId) return;
    if (event.type === 'pointerup' && press.active) move(event);
    end(event.type === 'pointerup');
  }

  function lost(event: PointerEvent) { if (press?.id === event.pointerId) end(false); }
  function cancel() { end(false); }
  function blur(event: Event) { if (event.target === view) { pointers.clear(); cancel(); } }
  function navigation(event: Event) { if (press?.active || keyboardIndex !== undefined) block(event); }
  function click(event: MouseEvent) { if (suppressClick && event.target === canvas && event.detail !== 0) block(event); }
  function key(event: KeyboardEvent) { if (event.key === 'Escape' && (press || keyboardIndex !== undefined)) { block(event); cancel(); } }
  function cameraMove() { if (press && !press.active) end(false); refresh(); }

  const capture = { capture: true, signal: listeners.signal };
  view.addEventListener('pointerdown', down, capture);
  view.addEventListener('pointermove', move, capture);
  view.addEventListener('pointerup', up, capture);
  view.addEventListener('pointercancel', up, capture);
  canvas.addEventListener('lostpointercapture', lost, capture);
  view.addEventListener('blur', blur, capture);
  view.addEventListener('resize', cancel, capture);
  view.addEventListener('keydown', key, capture);
  view.addEventListener('click', click, capture);
  view.addEventListener('dblclick', click, capture);
  view.addEventListener('contextmenu', click, capture);
  for (const name of ['mousedown', 'mousemove', 'mouseup', 'touchstart', 'touchmove', 'touchend', 'touchcancel', 'wheel']) {
    view.addEventListener(name, navigation, { ...capture, passive: false });
  }
  map.on('move', cameraMove);
  map.on('resize', cancel);

  return {
    sync(state: DrawingState) {
      if (state.status !== 'drawing' && (press || keyboardIndex !== undefined)) end(false);
      refresh();
    },
    setEnabled(value: boolean) { enabled = value; if (!value) cancel(); refresh(); },
    cancel,
    keyDown(index: number, event: KeyboardEvent) {
      if (event.key === 'Escape') { event.preventDefault(); cancel(); return; }
      const step = event.shiftKey ? 64 : 16;
      const offsets: Record<string, ScreenPoint> = {
        ArrowUp: { x: 0, y: -step }, ArrowDown: { x: 0, y: step },
        ArrowLeft: { x: -step, y: 0 }, ArrowRight: { x: step, y: 0 },
      };
      const offset = offsets[event.key];
      if (!offset || !available()) return;
      event.preventDefault();
      if (keyboardIndex !== index) {
        end(true);
        suppressGestures();
        keyboardIndex = index;
        if (!drawing.beginVertexMove(index)) { end(false); return; }
      }
      const handle = handles.find((handle) => handle.index === index);
      if (!handle) return;
      const coordinate = map.unproject([handle.x + offset.x, handle.y + offset.y]);
      drawing.updateVertexMove([coordinate.lng, coordinate.lat]);
    },
    keyUp(event: KeyboardEvent) { if (event.key.startsWith('Arrow')) end(true); },
    finishKeyboardMove() { if (keyboardIndex !== undefined) end(true); },
    destroy() {
      if (destroyed) return;
      destroyed = true;
      listeners.abort();
      map.off('move', cameraMove);
      map.off('resize', cancel);
      pointers.clear();
      cancel();
    },
  };
}
