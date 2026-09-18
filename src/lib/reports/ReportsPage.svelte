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
  import { formatToday, geometryTypeFor, heightInMeters } from '../drafts/types';
  import { matchesGeometryFilter, matchesHeightFilter, type GeometryKey, type HeightFilterKey } from './filtering';

  let { onback }: { onback: () => void } = $props();

  let statusFilter = $state<StatusTabKey>('all');
  let query = $state('');

  let selectMode = $state(false);
  let selectedIds = $state<Set<string>>(new Set());

  let filterPanelOpen = $state(false);
  let appliedGeometries = $state<Set<GeometryKey>>(new Set());
  let appliedHeightFilter = $state<HeightFilterKey>('any');
  let pendingGeometries = $state<Set<GeometryKey>>(new Set());
  let pendingHeightFilter = $state<HeightFilterKey>('any');

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

  function toggleSelectMode() {
    selectMode = !selectMode;
    if (!selectMode) selectedIds = new Set();
  }

  function toggleSelected(report: Report) {
    const next = new Set(selectedIds);
    if (next.has(report.id)) next.delete(report.id);
    else next.add(report.id);
    selectedIds = next;
  }

  function sendSelected() {
    const today = formatToday();
    for (const report of reports) {
      if (selectedIds.has(report.id) && report.status === 'ready') {
        report.status = 'pending';
        report.secondaryDate = today;
      }
    }
    selectedIds = new Set();
    selectMode = false;
    refreshTick++;
  }

  function openFilterPanel() {
    pendingGeometries = new Set(appliedGeometries);
    pendingHeightFilter = appliedHeightFilter;
    filterPanelOpen = true;
  }

  function resetPendingFilters() {
    pendingGeometries = new Set();
    pendingHeightFilter = 'any';
  }

  function applyFilters() {
    appliedGeometries = new Set(pendingGeometries);
    appliedHeightFilter = pendingHeightFilter;
    filterPanelOpen = false;
  }

  function dismissFilterPanel() {
    filterPanelOpen = false;
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

  function buildItems(key: StatusTabKey, q: string, geometries: Set<GeometryKey>, heightFilter: HeightFilterKey): ListItem[] {
    const items: ListItem[] = [];

    if (key !== 'draft') {
      for (const report of reports) {
        if (!matchesReportQuery(report, q)) continue;
        if (key !== 'all' && !matchesStatus(report, key)) continue;
        if (!matchesGeometryFilter(geometryTypeFor(report.obstacleType), geometries)) continue;
        if (!matchesHeightFilter(report.heightMeters, heightFilter)) continue;
        items.push({ kind: 'report', id: report.id, report, sort: dateSortValue(report.secondaryDate ?? report.createdDate) });
      }
    }

    if (key === 'draft' || key === 'all') {
      for (const draft of drafts) {
        if (!matchesDraftQuery(draft, q)) continue;
        if (!matchesGeometryFilter(geometryTypeFor(draft.category), geometries)) continue;
        if (!matchesHeightFilter(heightInMeters(draft.heightAboveGround), heightFilter)) continue;
        items.push({ kind: 'draft', id: draft.id, draft, sort: dateSortValue(draft.editedDate) });
      }
    }

    items.sort((a, b) => b.sort - a.sort);
    return items;
  }

  // reports/drafts mutate in place from detail pages and bulk actions, which
  // plain (non-$state) module arrays don't signal on their own: read
  // refreshTick here so these explicitly recompute whenever it's bumped.
  let draftsCount = $derived.by(() => { refreshTick; return drafts.length; });
  let items = $derived.by(() => { refreshTick; return buildItems(statusFilter, query, appliedGeometries, appliedHeightFilter); });
  let pendingResultCount = $derived.by(() => { refreshTick; return buildItems(statusFilter, query, pendingGeometries, pendingHeightFilter).length; });
  let filterActive = $derived(appliedGeometries.size > 0 || appliedHeightFilter !== 'any');
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
        <ReportsToolbar
          bind:query
          {selectMode} selectedCount={selectedIds.size} ontoggleselect={toggleSelectMode} onsend={sendSelected}
          filterOpen={filterPanelOpen} {filterActive}
          bind:pendingGeometries bind:pendingHeightFilter {pendingResultCount}
          onopenfilter={openFilterPanel} onresetfilter={resetPendingFilters} onapplyfilter={applyFilters} ondismissfilter={dismissFilterPanel}
        />
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
                <ReportCard report={item.report} onopen={openReport} {selectMode} selected={selectedIds.has(item.report.id)} ontoggleselect={toggleSelected} />
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
