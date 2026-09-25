<script lang="ts">
  import ObstacleReportPanel from './ObstacleReportPanel.svelte';
  import type { ReportingVariantProps } from './reportingVariantProps';

  let props: ReportingVariantProps = $props();
</script>

<ObstacleReportPanel {...props} heightControl="keypad" />
