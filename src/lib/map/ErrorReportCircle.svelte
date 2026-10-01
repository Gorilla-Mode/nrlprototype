<script lang="ts">
  import type { Snippet } from 'svelte';
  import RadialMenu from '../radial-menu/RadialMenu.svelte';
  import type { ScreenPoint } from '../obstacles/registeredObstacles';

  let { center, innerRadius, outerRadius, icon, onmove }: {
    /** Circle centre in map-container pixels. */
    center: ScreenPoint;
    innerRadius: number;
    outerRadius: number;
    icon: Snippet;
    onmove: (x: number, y: number) => void;
  } = $props();

  const keyStep = 16;
  let drag = $state<{ id: number; clientX: number; clientY: number; x: number; y: number } | null>(null);

  function handlePointerDown(event: PointerEvent) {
    if (drag || !event.isPrimary || event.button !== 0) return;
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

<!-- Pointer drag, with arrow keys as the keyboard alternative. -->
<button
  type="button"
  class="error-report-circle"
  class:is-dragging={drag}
  style:--hold-x={`${center.x}px`}
  style:--hold-y={`${center.y}px`}
  aria-label="Error report circle. Drag, or use the arrow keys, to move it over an obstacle"
  onpointerdown={handlePointerDown}
  onpointermove={handlePointerMove}
  onpointerup={handlePointerEnd}
  onpointercancel={handlePointerEnd}
  onlostpointercapture={handlePointerEnd}
  onkeydown={handleKeyDown}
>
  <RadialMenu
    pointer={drag ? { x: 0, y: -outerRadius } : null}
    {innerRadius}
    {outerRadius}
    label="Error report circle"
    items={[{ id: 'error-report', label: 'Report an error', color: 'var(--color-map-error-report)', icon }]}
  />
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
</style>
