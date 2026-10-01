<script lang="ts">
  import type { Snippet } from 'svelte';
  import RadialMenu from '../radial-menu/RadialMenu.svelte';
  import MoveIcon from '../icons/MoveIcon.svelte';
  import type { ScreenPoint } from '../obstacles/registeredObstacles';

  let { center, innerRadius, outerRadius, icon, onmove, handle = null }: {
    /** Circle centre in map-container pixels. */
    center: ScreenPoint;
    innerRadius: number;
    outerRadius: number;
    icon: Snippet;
    onmove: (x: number, y: number) => void;
    /**
     * Handle mode: touches pass through to the map, which drags the circle by its centre
     * (see createPositionDragInteraction). Arrow keys still move it.
     */
    handle?: { dragging: boolean } | null;
  } = $props();

  const keyStep = 16;
  let drag = $state<{ id: number; clientX: number; clientY: number; x: number; y: number } | null>(null);
  let dragging = $derived(handle ? handle.dragging : !!drag);

  function handlePointerDown(event: PointerEvent) {
    if (handle || drag || !event.isPrimary || event.button !== 0) return;
    event.preventDefault();
    (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
    drag = { id: event.pointerId, clientX: event.clientX, clientY: event.clientY, x: center.x, y: center.y };
  }

  function handlePointerMove(event: PointerEvent) {
    if (event.pointerId !== drag?.id) return;
    onmove(drag.x + event.clientX - drag.clientX, drag.y + event.clientY - drag.clientY);
  }

  function handlePointerEnd(event: PointerEvent) {
    if (event.pointerId === drag?.id) drag = null;
  }

  function handleKeyDown(event: KeyboardEvent) {
    const step = event.shiftKey ? keyStep * 4 : keyStep;
    const offsets: Record<string, [number, number]> = {
      ArrowUp: [0, -step], ArrowDown: [0, step], ArrowLeft: [-step, 0], ArrowRight: [step, 0],
    };
    const offset = offsets[event.key];
    if (!offset) return;
    event.preventDefault();
    onmove(center.x + offset[0], center.y + offset[1]);
  }
</script>

{#snippet noIcon()}{/snippet}

<!-- Pointer drag, with arrow keys as the keyboard alternative. -->
<button
  type="button"
  class="error-report-circle"
  class:is-dragging={dragging}
  class:is-handle={handle}
  style:--hold-x={`${center.x}px`}
  style:--hold-y={`${center.y}px`}
  aria-label={handle
    ? 'Position circle. Drag its centre, or use the arrow keys, to move it to the correct position'
    : 'Error report circle. Drag, or use the arrow keys, to move it over an obstacle'}
  onpointerdown={handlePointerDown}
  onpointermove={handlePointerMove}
  onpointerup={handlePointerEnd}
  onpointercancel={handlePointerEnd}
  onlostpointercapture={handlePointerEnd}
  onkeydown={handleKeyDown}
>
  <RadialMenu
    pointer={dragging ? { x: 0, y: -outerRadius } : null}
    {innerRadius}
    {outerRadius}
    label="Error report circle"
    items={[handle
      // The pill below replaces the ring's own label, which is hard to read on the map.
      ? { id: 'position', label: '', color: 'var(--color-map-error-report)', icon: noIcon }
      : { id: 'error-report', label: 'Report an error', color: 'var(--color-map-error-report)', icon }]}
  />
  {#if handle}
    <span class="map-label-pill position-pill" style:top={`calc(50% - ${(innerRadius + outerRadius) / 2}px)`}>New position</span>
    <span class="move-handle" aria-hidden="true">
      <svg class="geometry-icon" viewBox="0 0 24 24" fill="none"><MoveIcon /></svg>
    </span>
  {/if}
</button>

<style>
  .error-report-circle {
    position: absolute;
    z-index: var(--layer-map-overlay);
    left: var(--hold-x);
    top: var(--hold-y);
    /* Sized by the SVG; the hit area includes the hover expansion beyond the ring. */
    line-height: 0;
    padding: 0;
    border: 0;
    background: none;
    color: inherit;
    border-radius: var(--radius-round);
    transform: translate(-50%, -50%);
    cursor: grab;
    touch-action: none;
    -webkit-tap-highlight-color: transparent;
  }
  .error-report-circle.is-dragging { cursor: grabbing; }
  /* The map receives every touch; only the keyboard still targets this button. */
  .error-report-circle.is-handle { pointer-events: none; touch-action: auto; }
  .position-pill { position: absolute; left: 50%; transform: translate(-50%, -50%); }
  .move-handle {
    position: absolute;
    left: 50%;
    top: 50%;
    display: grid;
    place-items: center;
    width: var(--target-size-min);
    height: var(--target-size-min);
    border: var(--border-default);
    border-radius: var(--radius-round);
    background: var(--color-background-raised);
    color: var(--color-text-primary);
    box-shadow: var(--shadow-surface);
    transform: translate(-50%, -50%);
    transition: transform var(--duration-default) var(--ease-standard), box-shadow var(--duration-default) var(--ease-standard);
  }
  .is-dragging .move-handle { box-shadow: var(--shadow-control); transform: translate(-50%, -50%) scale(var(--scale-handle-active)); }
  @media (prefers-reduced-motion: reduce) { .move-handle { transition: none; } }
</style>
