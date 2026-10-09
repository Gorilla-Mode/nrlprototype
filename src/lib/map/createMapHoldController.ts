export interface HoldOrigin {
  x: number;
  y: number;
}

interface MapHoldOptions {
  isEnabled?: () => boolean;
  /** Called synchronously at pointer-down, before the hold delay or map movement. */
  onPressStart?: (origin: HoldOrigin) => void;
  /** Reset ongoing map gestures/animations before displaying the menu. */
  onActivate: () => void;
  onOpen: (origin: HoldOrigin) => void;
  onClose: () => void;
  /** Pointer position relative to the original press, while the menu is open. */
  onMove?: (x: number, y: number) => void;
  /** Final offset from the initial press. Cancellation never calls this. */
  onRelease?: (x: number, y: number) => void;
  /** Opt-in obstacle placement variants; error-report callers leave these off. */
  persistent?: () => boolean;
  twoFinger?: () => boolean;
  /** Map content displacement in CSS pixels beneath the fixed menu. */
  onMapPan?: (dx: number, dy: number) => void;
  holdDelay?: number;
  /** Per-press delay, e.g. 0 to open at once on a target; falls back to `holdDelay`. */
  holdDelayAt?: (origin: HoldOrigin) => number | undefined;
  movementTolerance?: number;
}

/** Owns the hold gesture only; the caller resolves the released item. */
export function createMapHoldController(canvas: HTMLCanvasElement, {
  isEnabled = () => true,
  onPressStart,
  onActivate,
  onOpen,
  onClose,
  onMove,
  onRelease,
  persistent = () => false,
  twoFinger = () => false,
  onMapPan,
  holdDelay = 200,
  holdDelayAt,
  movementTolerance = 8,
}: MapHoldOptions) {
  const view = canvas.ownerDocument.defaultView!;
  const listeners = new AbortController();
  const pointers = new Set<number>();
  let press: { id: number; clientX: number; clientY: number; origin: HoldOrigin } | undefined;
  let center: HoldOrigin | undefined;
  let opening = false;
  let centerPress = false;
  let centerDragged = false;
  let panOffset: HoldOrigin = { x: 0, y: 0 };
  const touches = new Map<number, HoldOrigin>();
  let centroid: HoldOrigin | undefined;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let open = false;
  let suppressClick = false;
  let destroyed = false;

  function cancel() {
    clearTimeout(timer);
    timer = undefined;
    const pointerId = press?.id;
    press = undefined;
    centroid = undefined;
    center = undefined;
    if (open) {
      open = false;
      onClose();
    }
    if (pointerId !== undefined && canvas.hasPointerCapture(pointerId)) {
      canvas.releasePointerCapture(pointerId);
    }
  }

  function handlePointerDown(event: PointerEvent) {
    pointers.add(event.pointerId);
    if (event.pointerType === 'touch') touches.set(event.pointerId, { x: event.clientX, y: event.clientY });
    if (open && press && twoFinger() && touches.size === 2 && touches.has(press.id)) {
      centroid = touchCentroid();
      onMove?.(0, 0);
      return;
    }
    if (press) {
      if (event.pointerId !== press.id) cancel();
      return;
    }
    // A fresh physical press ends suppression of the previous hold's synthetic click.
    suppressClick = false;
    if (!isEnabled() || event.target !== canvas || pointers.size !== 1 || !event.isPrimary || event.button !== 0 ||
      event.ctrlKey || event.shiftKey || event.altKey || event.metaKey) return;

    const rect = canvas.getBoundingClientRect();
    opening = !open;
    centerDragged = false;
    panOffset = { x: 0, y: 0 };
    centerPress = open && !!center && Math.hypot(event.clientX - rect.left - center.x, event.clientY - rect.top - center.y) <= 46;
    press = {
      id: event.pointerId,
      clientX: event.clientX,
      clientY: event.clientY,
      origin: open && center ? { ...center } : { x: event.clientX - rect.left, y: event.clientY - rect.top },
    };
    if (open) {
      suppressClick = true;
      canvas.setPointerCapture(press.id);
      return;
    }
    onPressStart?.(press.origin);
    const delay = holdDelayAt?.(press.origin) ?? holdDelay;
    // Opening during pointerdown also blocks the map's own mousedown/touchstart for this press.
    if (delay <= 0) activate();
    else timer = setTimeout(activate, delay);
  }

  function activate() {
    timer = undefined;
    if (!press || destroyed || !isEnabled()) return;
    open = true;
    suppressClick = true;
    canvas.setPointerCapture(press.id);
    const origin = press.origin;
    center = { ...origin };
    onActivate();
    if (open) onOpen(origin);
  }

  function touchCentroid(): HoldOrigin {
    const values = [...touches.values()];
    return { x: values.reduce((sum, value) => sum + value.x, 0) / values.length,
      y: values.reduce((sum, value) => sum + value.y, 0) / values.length };
  }

  function panFromCenter(clientX: number, clientY: number) {
    if (!press) return;
    const x = clientX - press.clientX;
    const y = clientY - press.clientY;
    if (Math.hypot(x, y) > movementTolerance) centerDragged = true;
    if (!centerDragged) return;
    const dx = x - panOffset.x;
    const dy = y - panOffset.y;
    panOffset = { x, y };
    if (dx !== 0 || dy !== 0) onMapPan?.(dx, dy);
  }

  function handlePointerMove(event: PointerEvent) {
    if (touches.has(event.pointerId)) touches.set(event.pointerId, { x: event.clientX, y: event.clientY });
    if (centroid) {
      if (event.buttons === 0) { cancel(); return; }
      const next = touchCentroid();
      onMapPan?.(next.x - centroid.x, next.y - centroid.y);
      centroid = next;
      return;
    }
    if (!press || event.pointerId !== press.id) return;
    if (event.buttons === 0) {
      cancel();
    } else if (open) {
      if (persistent() && !opening && centerPress) {
        panFromCenter(event.clientX, event.clientY);
      } else {
        const rect = canvas.getBoundingClientRect();
        onMove?.(event.clientX - rect.left - press.origin.x, event.clientY - rect.top - press.origin.y);
      }
    } else if (Math.hypot(event.clientX - press.clientX, event.clientY - press.clientY) > movementTolerance) {
      cancel();
    }
  }

  function handlePointerEnd(event: PointerEvent) {
    pointers.delete(event.pointerId);
    touches.delete(event.pointerId);
    if (centroid) {
      if (event.type === 'pointercancel' || event.pointerId === press?.id) { cancel(); return; }
      centroid = undefined;
      const original = press && touches.get(press.id);
      if (original && center) {
        const rect = canvas.getBoundingClientRect();
        onMove?.(original.x - rect.left - center.x, original.y - rect.top - center.y);
      }
      return;
    }
    if (event.pointerId !== press?.id) return;
    const release = open && event.type === 'pointerup' && isEnabled();
    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left - press.origin.x;
    const y = event.clientY - rect.top - press.origin.y;
    if (release && persistent() && !opening && centerPress) {
      panFromCenter(event.clientX, event.clientY);
    }
    if (release && persistent() && ((opening && Math.hypot(x, y) <= 46) || (!opening && centerPress && centerDragged))) {
      const id = press.id;
      press = undefined;
      if (canvas.hasPointerCapture(id)) canvas.releasePointerCapture(id);
      onMove?.(0, 0);
      return;
    }
    const centerTap = persistent() && !opening && centerPress;
    cancel();
    if (release && !centerTap) onRelease?.(x, y);
  }

  function handleLostCapture(event: PointerEvent) {
    if (event.pointerId === press?.id) cancel();
  }

  function block(event: Event) {
    if (event.cancelable) event.preventDefault();
    event.stopImmediatePropagation();
  }

  function handleKeyDown(event: KeyboardEvent) {
    if (event.key === 'Escape' && (press || open)) {
      block(event);
      cancel();
    } else if (open && !persistent()) {
      block(event);
    }
  }

  function handleBlur(event: Event) {
    if (event.target !== view) return;
    pointers.clear();
    touches.clear();
    cancel();
  }

  // MapLibre listens to mouse/touch events, including document-level mousemove.
  // Gate those at window capture while open, preserving handler settings and touch-action.
  function handleNavigation(event: Event) {
    if (open && (press || event.target === canvas)) block(event);
  }

  function handleClick(event: MouseEvent) {
    if (suppressClick && event.target === canvas && event.detail !== 0) block(event);
  }

  function handleContextMenu(event: MouseEvent) {
    if ((open || suppressClick) && event.target === canvas) block(event);
  }

  const capture = { capture: true, signal: listeners.signal };
  view.addEventListener('pointerdown', handlePointerDown, capture);
  view.addEventListener('pointermove', handlePointerMove, capture);
  view.addEventListener('pointerup', handlePointerEnd, capture);
  view.addEventListener('pointercancel', handlePointerEnd, capture);
  canvas.addEventListener('lostpointercapture', handleLostCapture, capture);
  view.addEventListener('keydown', handleKeyDown, capture);
  view.addEventListener('blur', handleBlur, capture);
  view.addEventListener('click', handleClick, capture);
  view.addEventListener('dblclick', handleClick, capture);
  view.addEventListener('contextmenu', handleContextMenu, capture);
  for (const event of ['mousedown', 'mousemove', 'mouseup', 'touchstart', 'touchmove', 'touchend', 'touchcancel', 'wheel', 'keyup']) {
    view.addEventListener(event, handleNavigation, { ...capture, passive: false });
  }

  return {
    cancel,
    panMap(dx: number, dy: number) {
      if (!open || !persistent() || press) return;
      onMapPan?.(dx, dy);
    },
    destroy() {
      if (destroyed) return;
      destroyed = true;
      listeners.abort();
      pointers.clear();
      cancel();
    },
  };
}
