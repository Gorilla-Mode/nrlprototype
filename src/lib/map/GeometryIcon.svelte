<script lang="ts">
  import type { ObstacleGeometryType } from '../reporting/obstacle';
  let { type }: { type: ObstacleGeometryType } = $props();
</script>

{#if type === 'Point'}
  <circle cx="12" cy="12" r="7" />
  <circle cx="12" cy="12" r="2" fill="currentColor" />
{:else if type === 'LineString'}
  <path d="m5 19 6-11 8-3" />
  <circle cx="5" cy="19" r="2" fill="currentColor" />
  <circle cx="19" cy="5" r="2" fill="currentColor" />
{:else}
  <path d="m5 7 10-3 5 12-12 4Z" />
  <circle cx="5" cy="7" r="1.5" fill="currentColor" />
  <circle cx="15" cy="4" r="1.5" fill="currentColor" />
  <circle cx="20" cy="16" r="1.5" fill="currentColor" />
  <circle cx="8" cy="20" r="1.5" fill="currentColor" />
{/if}
