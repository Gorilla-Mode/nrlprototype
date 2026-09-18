<script lang="ts">
  import ReportsHeader from './ReportsHeader.svelte';
  import ReportsToolbar from './ReportsToolbar.svelte';
  import StatusTabs from './StatusTabs.svelte';
  import ReportCard from './ReportCard.svelte';
  import ReportDetailPage from './ReportDetailPage.svelte';
  import { reports, type Report, type StatusTabKey } from './reportsData';
  import DraftCard from '../drafts/DraftCard.svelte';
  import DraftDetailPage from '../drafts/DraftDetailPage.svelte';
  import { drafts } from '../drafts/mockData';
  import type { Draft } from '../drafts/types';

  let { onback }: { onback: () => void } = $props();

  let activeTab = $state<'reports' | 'drafts'>('reports');
  let statusFilter = $state<StatusTabKey>('all');
  let query = $state('');

  let view = $state<'list' | 'report-detail' | 'draft-detail'>('list');
  // .raw: these hold a plain reference into the reports/drafts arrays, mutated
  // in place by the (legacy, non-runes) detail pages below. A deep $state proxy
  // here would let those mutations land on a disconnected copy instead.
  let selectedReport = $state.raw<Report | null>(null);
  let selectedDraft = $state.raw<Draft | null>(null);
  // Bumped whenever we return to the list, so it re-reads reports/drafts fresh:
  // those mutate in place from the (non-runes) detail pages, which the plain
  // module-level arrays don't otherwise signal to this component.
  let refreshTick = $state(0);

  function openReport(report: Report) {
    selectedReport = report;
    view = 'report-detail';
  }

  function openDraft(draft: Draft) {
    selectedDraft = draft;
    view = 'draft-detail';
  }

  function backToList() {
    view = 'list';
    selectedReport = null;
    selectedDraft = null;
    refreshTick++;
  }

  function draftSent() {
    activeTab = 'reports';
    statusFilter = 'all';
    backToList();
  }

  function selectTab(tab: 'reports' | 'drafts') {
    activeTab = tab;
  }

  function closeOnEscape(event: KeyboardEvent) {
    if (event.key === 'Escape' && !event.defaultPrevented) { event.preventDefault(); onback(); }
  }

  function matchesReportQuery(report: Report, q: string): boolean {
    const needle = q.trim().toLowerCase();
    if (!needle) return true;
    return report.name.toLowerCase().includes(needle) || report.obstacleType.toLowerCase().includes(needle);
  }

  function matchesDraftQuery(draft: Draft, q: string): boolean {
    const needle = q.trim().toLowerCase();
    if (!needle) return true;
    return draft.title.toLowerCase().includes(needle) || draft.category.toLowerCase().includes(needle);
  }

  function matchesStatus(report: Report, key: StatusTabKey): boolean {
    if (key === 'all') return true;
    if (key === 'reviewed') return report.status === 'approved' || report.status === 'declined';
    return report.status === key;
  }
</script>

<svelte:window onkeydown={closeOnEscape} />

{#if view === 'report-detail' && selectedReport}
  <ReportDetailPage report={selectedReport} onback={backToList} />
{:else if view === 'draft-detail' && selectedDraft}
  <DraftDetailPage draft={selectedDraft} onBack={backToList} onSend={draftSent} />
{:else}
  <main class="reports-page" aria-label="Reports">
    <header class="reports-header">
      <ReportsHeader {onback} {activeTab} onselecttab={selectTab} />
      <ReportsToolbar bind:query />
      {#if activeTab === 'reports'}
        <StatusTabs {reports} active={statusFilter} onselect={(key) => statusFilter = key} />
      {/if}
    </header>

    <div class="reports-content">
      {#key refreshTick}
      {#if activeTab === 'reports'}
        {@const filteredReports = reports.filter((r) => matchesReportQuery(r, query) && matchesStatus(r, statusFilter))}
        <div class="reports-list-meta">
          <p class="reports-list-count">{filteredReports.length} reports</p>
          <p class="reports-list-sort">Sorted by last edited</p>
        </div>

        {#if filteredReports.length === 0}
          <p class="reports-empty">No reports match your search.</p>
        {:else}
          <div class="reports-card-grid">
            {#each filteredReports as report (report.id)}
              <ReportCard {report} onopen={openReport} />
            {/each}
          </div>
        {/if}
      {:else}
        {@const filteredDrafts = drafts.filter((d) => matchesDraftQuery(d, query))}
        <div class="reports-list-meta">
          <p class="reports-list-count">{filteredDrafts.length} drafts</p>
          <p class="reports-list-sort">Sorted by last edited</p>
        </div>

        {#if filteredDrafts.length === 0}
          <p class="reports-empty">No drafts match your search.</p>
        {:else}
          <div class="reports-card-grid drafts-grid">
            {#each filteredDrafts as draft (draft.id)}
              <DraftCard {draft} onEdit={openDraft} />
            {/each}
          </div>
        {/if}
      {/if}
      {/key}
    </div>
  </main>
{/if}

<style>
  .drafts-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .reports-empty { color: var(--color-text-secondary); font-size: var(--font-size-body); padding: var(--space-8) 0; text-align: center; }

  @media (max-width: 800px) {
    .drafts-grid { grid-template-columns: 1fr; }
  }
</style>
