<script lang="ts">
  import type { Obstacle } from './obstacle';
  import { emptyObstacleReportDraft, type ObstacleReportDraft } from './obstacleReportDraft';
  import ObstacleReportPanel from './ObstacleReportPanel.svelte';
  import ObstacleReportSummary from './ObstacleReportSummary.svelte';

  let { obstacle, oncancel, onclose }: {
    obstacle: Obstacle;
    oncancel: () => void;
    onclose: () => void;
  } = $props();

  let step = $state<'form' | 'summary'>('form');
  let mode = $state<'draft' | 'finished'>('draft');
  let draft = $state<ObstacleReportDraft>(emptyObstacleReportDraft);
</script>

{#if step === 'form'}
  <ObstacleReportPanel
    {obstacle}
    {draft}
    onchange={(next) => { draft = next; }}
    {oncancel}
    onsavedraft={() => { mode = 'draft'; step = 'summary'; }}
    onfinish={() => { mode = 'finished'; step = 'summary'; }}
  />
{:else}
  <ObstacleReportSummary {obstacle} {draft} {mode} {onclose} />
{/if}
