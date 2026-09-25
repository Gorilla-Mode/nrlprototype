<script lang="ts">
  import { createRadialSegments, getHoveredRadialSegment, type RadialMenuProps } from './radialMenu';

  let {
    items,
    innerRadius = 46,
    outerRadius = 112,
    hoverExpansion = 12,
    pointer = null,
    label = 'Radial menu preview',
  }: RadialMenuProps = $props();

  // Keep expanded paths and their stroke inside the SVG viewport for Safari.
  let viewportRadius = $derived(outerRadius + Math.max(0, hoverExpansion) + 1);
  let segments = $derived(createRadialSegments(items.length, innerRadius, outerRadius));
  let expandedSegments = $derived(createRadialSegments(items.length, innerRadius, outerRadius + hoverExpansion));
  let hoveredIndex = $derived(getHoveredRadialSegment(pointer, items.length, innerRadius));
  // Set from 0 (black), through 0.5 (original item color), to 1 (white).
  const RADIAL_LUMA = 0.3;
  const boundedLuma = Math.min(1, Math.max(0, RADIAL_LUMA));
  const radialLumaMix = `${Math.abs(boundedLuma - 0.5) * 200}%`;
  const radialLumaTarget = boundedLuma < 0.5 ? 'var(--palette-black)' : 'var(--palette-neutral-0)';
</script>

{#if items.length}
  <svg
    class="radial-menu"
    style:--radial-luma-mix={radialLumaMix}
    style:--radial-luma-target={radialLumaTarget}
    width={viewportRadius * 2}
    height={viewportRadius * 2}
    viewBox={`${-viewportRadius} ${-viewportRadius} ${viewportRadius * 2} ${viewportRadius * 2}`}
    role="img"
    aria-label={`${label}: ${items.map((item) => item.label).join(', ')}`}
  >
    {#each items as item, index (item.id)}
      {@const segment = hoveredIndex === index ? expandedSegments[index] : segments[index]}
      <g class="subdivision" class:is-hovered={hoveredIndex === index} class:is-muted={hoveredIndex !== null && hoveredIndex !== index} data-item-id={item.id} style:--radial-color={item.color}>
        <path class="segment" d={segment.path} fill={item.color} fill-rule="evenodd" />
        <g class="item" style:--radial-item-x={`${segment.x}px`} style:--radial-item-y={`${segment.y}px`} aria-hidden="true">
          <svg class="icon" x="-12" y="-20" width="24" height="24" viewBox="0 0 24 24" fill="none">
            {@render item.icon()}
          </svg>
          <text text-anchor="middle" y="18">{item.label}</text>
        </g>
      </g>
    {/each}
    <circle class="origin" r="7" aria-hidden="true" />
  </svg>
{/if}

<style>
  .radial-menu { display: block; overflow: visible; pointer-events: none; user-select: none; }
  .segment {
    fill: color-mix(in srgb, var(--radial-color) calc(100% - var(--radial-luma-mix)), var(--radial-luma-target) var(--radial-luma-mix));
    fill-opacity: var(--radial-fill-opacity);
    stroke: var(--color-border-strong);
    stroke-width: var(--radial-border-width);
    transition: d var(--duration-default) var(--ease-standard), fill-opacity var(--duration-default) var(--ease-standard);
  }
  .is-hovered .segment {
    stroke: var(--radial-color);
    stroke-width: var(--radial-border-width-selected);
  }
  .item {
    color: var(--color-text-primary);
    transform: translate(var(--radial-item-x), var(--radial-item-y));
    transition: transform var(--duration-default) var(--ease-standard);
  }
  .icon {
    color: var(--radial-color);
    stroke: currentColor;
    stroke-width: var(--icon-stroke-width);
    stroke-linecap: round;
    stroke-linejoin: round;
    filter: drop-shadow(0 0 1px var(--radial-halo-color));
  }
  text {
    fill: currentColor;
    stroke: var(--radial-halo-color);
    stroke-width: var(--radial-halo-width);
    stroke-linejoin: round;
    paint-order: stroke fill;
    font-family: inherit;
    font-size: var(--font-size-body-small);
    font-weight: var(--font-weight-semibold);
  }
  .origin { fill: var(--color-action-secondary); stroke: var(--color-background-raised); stroke-width: var(--radial-border-width-selected); }
</style>
