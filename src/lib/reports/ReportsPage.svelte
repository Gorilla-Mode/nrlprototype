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
    statusFilter = 'pending';
    backToList();
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
    if (key === 'reviewed') return report.status === 'approved' || report.status === 'declined';
    return report.status === key;
  }

  /** dd.mm.yyyy -> a comparable number, for "most recent first" sorting across reports and drafts. */
  function dateSortValue(date: string | undefined): number {
    if (!date) return 0;
    const [day, month, year] = date.split('.').map(Number);
    if (!day || !month || !year) return 0;
    return year * 10000 + month * 100 + day;
  }

  type ListItem =
    | { kind: 'report'; id: string; report: Report; sort: number }
    | { kind: 'draft'; id: string; draft: Draft; sort: number };

  function buildItems(key: StatusTabKey, q: string): ListItem[] {
    const items: ListItem[] = [];

    if (key !== 'draft') {
      for (const report of reports) {
        if (!matchesReportQuery(report, q)) continue;
        if (key !== 'all' && !matchesStatus(report, key)) continue;
        items.push({ kind: 'report', id: report.id, report, sort: dateSortValue(report.secondaryDate ?? report.createdDate) });
      }
    }

    if (key === 'draft' || key === 'all') {
      for (const draft of drafts) {
        if (!matchesDraftQuery(draft, q)) continue;
        items.push({ kind: 'draft', id: draft.id, draft, sort: dateSortValue(draft.editedDate) });
      }
    }

    items.sort((a, b) => b.sort - a.sort);
    return items;
  }

  let draftsCount = $derived(drafts.length);
  let items = $derived(buildItems(statusFilter, query));
  let noun = $derived(statusFilter === 'draft' ? 'drafts' : statusFilter === 'all' ? 'items' : 'reports');
</script>

<svelte:window onkeydown={closeOnEscape} />

{#if view === 'report-detail' && selectedReport}
  <ReportDetailPage report={selectedReport} onback={backToList} />
{:else if view === 'draft-detail' && selectedDraft}
  <DraftDetailPage draft={selectedDraft} onBack={backToList} onSend={draftSent} />
{:else}
  {#key refreshTick}
    <main class="reports-page" aria-label="Reports">
      <header class="reports-header">
        <ReportsHeader {onback} />
        <ReportsToolbar bind:query />
        <StatusTabs {reports} {draftsCount} active={statusFilter} onselect={(key) => statusFilter = key} />
      </header>

      <div class="reports-content">
        <div class="reports-list-meta">
          <p class="reports-list-count">{items.length} {noun}</p>
          <p class="reports-list-sort">Sorted by last edited</p>
        </div>

        {#if items.length === 0}
          <p class="reports-empty">No {noun} match your search.</p>
        {:else}
          <div class="reports-card-grid" class:drafts-grid={statusFilter === 'draft'}>
            {#each items as item (item.kind + '-' + item.id)}
              {#if item.kind === 'report'}
                <ReportCard report={item.report} onopen={openReport} />
              {:else}
                <DraftCard draft={item.draft} onEdit={openDraft} />
              {/if}
            {/each}
          </div>
        {/if}
      </div>
    </main>
  {/key}
{/if}

<style>
  .drafts-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .reports-empty { color: var(--color-text-secondary); font-size: var(--font-size-body); padding: var(--space-8) 0; text-align: center; }

  @media (max-width: 800px) {
    .drafts-grid { grid-template-columns: 1fr; }
  }
</style>
