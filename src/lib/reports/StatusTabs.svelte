<script lang="ts">
  import { statusTabs, countForStatusTab, type Report, type StatusTabKey } from './reportsData';

  let { reports, draftsCount, active, onselect }: { reports: readonly Report[]; draftsCount: number; active: StatusTabKey; onselect: (key: StatusTabKey) => void } = $props();
  const name = $props.id();

  function countFor(key: StatusTabKey): number {
    if (key === 'all') return reports.length + draftsCount;
    if (key === 'draft') return draftsCount;
    return countForStatusTab(reports, key);
  }
</script>

<!-- Designsystemet filter chips: one radio group, so exactly one status is shown at a time. -->
<div class="reports-header-row reports-status-tabs" role="radiogroup" aria-label="Show reports">
  {#each statusTabs as tab (tab.key)}
    <label class="ds-chip reports-status-tab" data-color="brand1">
      <input type="radio" {name} value={tab.key} checked={tab.key === active} onchange={() => onselect(tab.key)} />
      {tab.label}
      <span class="reports-status-tab-count">{countFor(tab.key)}</span>
    </label>
  {/each}
</div>
