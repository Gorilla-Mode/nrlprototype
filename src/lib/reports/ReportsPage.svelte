<script lang="ts">
  import ReportsHeader from './ReportsHeader.svelte';
  import ReportsToolbar from './ReportsToolbar.svelte';
  import StatusTabs from './StatusTabs.svelte';
  import ReportCard from './ReportCard.svelte';
  import { reports } from './reportsData';

  let { onback }: { onback: () => void } = $props();

  function closeOnEscape(event: KeyboardEvent) {
    if (event.key === 'Escape' && !event.defaultPrevented) { event.preventDefault(); onback(); }
  }
</script>

<svelte:window onkeydown={closeOnEscape} />

<main class="reports-page" aria-label="Reports">
  <header class="reports-header">
    <ReportsHeader {onback} />
    <ReportsToolbar />
    <StatusTabs {reports} />
  </header>

  <div class="reports-content">
    <div class="reports-list-meta">
      <p class="reports-list-count">{reports.length} reports</p>
      <p class="reports-list-sort">Sorted by last edited</p>
    </div>

    <div class="reports-card-grid">
      {#each reports as report (report.id)}
        <ReportCard {report} />
      {/each}
    </div>
  </div>
</main>
