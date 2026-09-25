<script lang="ts">
  import ObstacleDetails from './ObstacleDetails.svelte';
  import type { ReportingVariantProps } from './reportingVariantProps';

  let props: ReportingVariantProps = $props();
</script>

<ObstacleDetails {...props} heightControl="keypad" />
