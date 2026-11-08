<script lang="ts">
  import { statusTabs, countForStatusTab, type Report, type StatusTabKey } from './reportsData';

  let { reports, draftsCount, active, onselect }: {
    /** The reports and drafts count left after search and filters, so each tab shows what it would list. */
    reports: readonly Report[];
    draftsCount: number;
    active: StatusTabKey;
    onselect: (key: StatusTabKey) => void;
  } = $props();

  function countFor(key: StatusTabKey): number {
    if (key === 'all') return reports.length + draftsCount;
    if (key === 'draft') return draftsCount;
    return countForStatusTab(reports, key);
  }
</script>

<!-- Status tabs: toggle buttons, one pressed at a time. Pressed shows in blue text and an
     underline, so colour is never the only cue. A thin rule under the row separates the list. -->
<div class="reports-status-rule">
  <div class="reports-header-row reports-status-tabs" role="group" aria-label="Show reports">
    {#each statusTabs as tab (tab.key)}
      <button type="button" class="reports-status-tab" aria-pressed={tab.key === active} onclick={() => onselect(tab.key)}>
        {tab.label}
        <span class="reports-status-tab-count">{countFor(tab.key)}</span>
      </button>
    {/each}
  </div>
</div>
