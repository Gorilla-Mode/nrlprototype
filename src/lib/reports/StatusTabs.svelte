<script lang="ts">
  import { statusTabs, countForStatusTab, type Report, type StatusTabKey } from './reportsData';

  let { reports, draftsCount, active, onselect }: { reports: readonly Report[]; draftsCount: number; active: StatusTabKey; onselect: (key: StatusTabKey) => void } = $props();

  function countFor(key: StatusTabKey): number {
    if (key === 'all') return reports.length + draftsCount;
    if (key === 'draft') return draftsCount;
    return countForStatusTab(reports, key);
  }
</script>

<div class="reports-header-row reports-status-tabs">
  {#each statusTabs as tab (tab.key)}
    <button type="button" class="reports-status-tab" aria-pressed={tab.key === active} onclick={() => onselect(tab.key)}>
      {tab.label}
      <span class="reports-status-tab-count">{countFor(tab.key)}</span>
    </button>
  {/each}
</div>
