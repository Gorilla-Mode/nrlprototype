<script lang="ts">
  import { statusTabs, countForStatusTab, type Report } from './reportsData';

  let { reports }: { reports: readonly Report[] } = $props();
</script>

<div class="reports-header-row reports-status-tabs">
  {#each statusTabs as tab (tab.key)}
    <button type="button" class="reports-status-tab" aria-pressed={tab.key === 'all'}>
      {tab.label}
      <span class="reports-status-tab-count">{countForStatusTab(reports, tab.key)}</span>
    </button>
  {/each}
</div>
