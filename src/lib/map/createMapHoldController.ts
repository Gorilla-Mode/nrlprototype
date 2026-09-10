export interface HoldOrigin {
  x: number;
  y: number;
}

interface MapHoldOptions {
  /** Reset ongoing map gestures/animations before displaying the menu. */
  onActivate: () => void;
  onOpen: (origin: HoldOrigin) => void;
  onClose: () => void;
  /** Pointer position relative to the original press, while the menu is open. */
  onMove?: (x: number, y: number) => void;
  holdDelay?: number;
  movementTolerance?: number;
}

/** Owns the preview gesture only; it never chooses an item or creates map geometry. */
export function createMapHoldController(canvas: HTMLCanvasElement, {
  onActivate,
  onOpen,
  onClose,
  onMove,
  holdDelay = 200,
  movementTolerance = 8,
}: MapHoldOptions) {
  const view = canvas.ownerDocument.defaultView!;
  const listeners = new AbortController();
  const pointers = new Set<number>();
  let press: { id: number; clientX: number; clientY: number; origin: HoldOrigin } | undefined;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let open = false;
  let suppressClick = false;
  let destroyed = false;

  function cancel() {
    clearTimeout(timer);
    timer = undefined;
    const pointerId = press?.id;
    press = undefined;
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
    if (press) {
      if (event.pointerId !== press.id) cancel();
      return;
    }
    // A fresh physical press ends suppression of the previous hold's synthetic click.
    suppressClick = false;
    if (event.target !== canvas || pointers.size !== 1 || !event.isPrimary || event.button !== 0 ||
      event.ctrlKey || event.shiftKey || event.altKey || event.metaKey) return;

    const rect = canvas.getBoundingClientRect();
    press = {
      id: event.pointerId,
      clientX: event.clientX,
      clientY: event.clientY,
      origin: { x: event.clientX - rect.left, y: event.clientY - rect.top },
    };
    timer = setTimeout(() => {
      timer = undefined;
      if (!press || destroyed) return;
      open = true;
      suppressClick = true;
      canvas.setPointerCapture(press.id);
      const origin = press.origin;
      onActivate();
      if (open) onOpen(origin);
    }, holdDelay);
  }

  function handlePointerMove(event: PointerEvent) {
    if (!press || event.pointerId !== press.id) return;
    if (event.buttons === 0) {
      cancel();
    } else if (open) {
      onMove?.(event.clientX - press.clientX, event.clientY - press.clientY);
    } else if (Math.hypot(event.clientX - press.clientX, event.clientY - press.clientY) > movementTolerance) {
      cancel();
    }
  }

  function handlePointerEnd(event: PointerEvent) {
    pointers.delete(event.pointerId);
    if (event.pointerId === press?.id) cancel();
  }

  function handleLostCapture(event: PointerEvent) {
    if (event.pointerId === press?.id) cancel();
  }

  function block(event: Event) {
    if (event.cancelable) event.preventDefault();
    event.stopImmediatePropagation();
  }

  function handleKeyDown(event: KeyboardEvent) {
    if (event.key === 'Escape' && press) {
      block(event);
      cancel();
    } else if (open) {
      block(event);
    }
  }

  function handleBlur() {
    pointers.clear();
    cancel();
  }

  // MapLibre listens to mouse/touch events, including document-level mousemove.
  // Gate those at window capture while open, preserving handler settings and touch-action.
  function handleNavigation(event: Event) {
    if (open) block(event);
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
    destroy() {
      if (destroyed) return;
      destroyed = true;
      listeners.abort();
      pointers.clear();
      cancel();
    },
  };
}
