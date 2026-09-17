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
</script>

{#if items.length}
  <svg
    class="radial-menu"
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
    fill: var(--radial-surface);
    stroke: var(--color-border-strong);
    stroke-width: var(--radial-border-width);
    transition: d var(--duration-default) var(--ease-standard), fill var(--duration-default) var(--ease-standard);
  }
  .is-hovered .segment {
    fill: color-mix(in srgb, var(--radial-color) var(--radial-tint-strength), var(--radial-surface));
    stroke: var(--radial-color);
    stroke-width: var(--radial-border-width-selected);
  }
  .item {
    color: var(--color-text-primary);
    transform: translate(var(--radial-item-x), var(--radial-item-y));
    transition: transform var(--duration-default) var(--ease-standard);
  }
  .icon { color: var(--radial-color); stroke: currentColor; stroke-width: var(--icon-stroke-width); stroke-linecap: round; stroke-linejoin: round; }
  text { fill: currentColor; font-family: inherit; font-size: var(--font-size-body-small); font-weight: var(--font-weight-semibold); }
  .origin { fill: var(--color-action-secondary); stroke: var(--color-background-raised); stroke-width: var(--radial-border-width-selected); }
</style>
