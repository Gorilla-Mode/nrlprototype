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
      <g class="subdivision" class:is-hovered={hoveredIndex === index} class:is-muted={hoveredIndex !== null && hoveredIndex !== index} data-item-id={item.id}>
        <path class="segment" d={segment.path} fill={item.color} fill-rule="evenodd" />
        <g class="item" style:transform={`translate(${segment.x}px, ${segment.y}px)`} aria-hidden="true">
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
  .radial-menu {
    display: block;
    overflow: visible;
    pointer-events: none;
    user-select: none;
  }

  .segment {
    fill-opacity: 0.62;
    stroke: var(--color-radial-border);
    stroke-width: 0.8;
    transition: d 140ms ease-out;
  }

  .subdivision {
    transition: filter 140ms ease-out;
  }

  .is-muted {
    filter: brightness(0.8);
  }

  .item {
    color: var(--color-radial-foreground);
    filter: drop-shadow(var(--shadow-radial-item));
    transition: transform 140ms ease-out;
  }

  .icon {
    stroke: currentColor;
    stroke-width: 1.8;
    stroke-linecap: round;
    stroke-linejoin: round;
  }

  text {
    fill: currentColor;
    font-family: inherit;
    font-size: 12px;
    font-weight: 600;
  }

  .origin {
    fill: var(--color-radial-origin);
  }

  @media (prefers-reduced-motion: reduce) {
    .subdivision,
    .segment,
    .item {
      transition: none;
    }
  }
</style>
