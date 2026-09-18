<script lang="ts">
  import { ObstacleType } from './obstacle';
  let { type }: { type: ObstacleType } = $props();
</script>

{#if type === ObstacleType.AerialSpan}
  <path d="M4 4v16M20 4v16" />
  <path d="M4 11q8 6 16 0" />
{:else if type === ObstacleType.PoleTower}
  <path d="M12 3v18" />
  <path d="M12 4l7 3-7 3" />
{:else if type === ObstacleType.Building}
  <path d="M6 3h12v18H6Z" />
  <path d="M9 7h1M14 7h1M9 11h1M14 11h1M9 15h1M14 15h1" />
{:else if type === ObstacleType.Construction}
  <path d="M4 20l4-8h8l4 8" />
  <path d="M4 20h16" />
  <path d="M8 12h8" />
{:else if type === ObstacleType.Bridge}
  <path d="M9 15a4 4 0 0 1 0-6l2-2a4 4 0 0 1 6 6" />
  <path d="M15 9a4 4 0 0 1 0 6l-2 2a4 4 0 0 1-6-6" />
{:else}
  <path d="M6 12h.01M12 12h.01M18 12h.01" />
{/if}
