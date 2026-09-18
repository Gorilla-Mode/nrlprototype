<script lang="ts">
  import { statusTabs, countForStatusTab, type Report, type StatusTabKey } from './reportsData';

  let { reports, active, onselect }: { reports: readonly Report[]; active: StatusTabKey; onselect: (key: StatusTabKey) => void } = $props();
</script>

<div class="reports-header-row reports-status-tabs">
  {#each statusTabs as tab (tab.key)}
    <button type="button" class="reports-status-tab" aria-pressed={tab.key === active} onclick={() => onselect(tab.key)}>
      {tab.label}
      <span class="reports-status-tab-count">{countForStatusTab(reports, tab.key)}</span>
    </button>
  {/each}
</div>
