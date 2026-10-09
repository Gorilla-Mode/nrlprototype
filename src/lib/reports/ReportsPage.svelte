<script lang="ts">
  import ReportsHeader from './ReportsHeader.svelte';
  import ReportsToolbar from './ReportsToolbar.svelte';
  import StatusTabs from './StatusTabs.svelte';
  import ReportCard from './ReportCard.svelte';
  import ReportDetailPage from './ReportDetailPage.svelte';
  import ReportSentDialog from './ReportSentDialog.svelte';
  import BulkSendDialog from './BulkSendDialog.svelte';
  import { markSent, sendToKartverket, type ReportSender } from './bulkSend';
  import { isSent, reports, type Report, type StatusTabKey } from './reportsData';
  import DraftCard from '../drafts/DraftCard.svelte';
  import DraftDetailPage from '../drafts/DraftDetailPage.svelte';
  import { drafts } from '../drafts/mockData';
  import type { Draft } from '../drafts/types';
  import { formatToday, heightInMeters } from '../drafts/types';
  import { geometryKind, type GeometryCameraTarget } from './reportGeometry';
  import { obstacleTypeLabel } from '../reporting/obstacle';
  import { matchesGeometryFilter, matchesHeightFilter, type GeometryKey, type HeightFilterKey } from './filtering';

  let { onback, onshowonmap, sendreport = sendToKartverket }: {
    onback: () => void;
    onshowonmap?: (target: GeometryCameraTarget) => void;
    /** Delivers one selected report; the prototype default always succeeds. */
    sendreport?: ReportSender;
  } = $props();

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

  // Confirmation after a draft is sent: the new report and when sending succeeded.
  let sentConfirmation = $state.raw<{ report: Report; at: Date } | null>(null);

  function draftSent() {
    const sent = reports.find((report) => report.id === selectedDraft?.id);
    if (sent) sentConfirmation = { report: sent, at: new Date() };
    statusFilter = 'sent';
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

  // Bulk send: the selected Ready reports while the dialog is open, and which were sent.
  let bulkReports = $state.raw<Report[] | null>(null);
  let bulkSentIds = new Set<string>();
  let justSentIds = $state<Set<string>>(new Set());
  let justSentTimer: ReturnType<typeof setTimeout> | undefined;
  let readySelectedCount = $derived(reports.filter((report) => selectedIds.has(report.id) && report.status === 'ready').length);

  function sendSelected() {
    bulkSentIds = new Set();
    bulkReports = reports.filter((report) => selectedIds.has(report.id) && report.status === 'ready');
  }

  // Delivered reports change status at once, so the data stays true even if the page
  // closes; the list behind the modal only re-reads it when the dialog closes.
  function bulkSent(sent: readonly Report[]) {
    const today = formatToday();
    for (const report of sent) {
      markSent(report, today);
      bulkSentIds.add(report.id);
    }
  }

  function closeBulkSend(attempted: boolean) {
    bulkReports = null;
    if (!attempted) return;
    selectMode = false;
    selectedIds = new Set();
    justSentIds = new Set(bulkSentIds);
    clearTimeout(justSentTimer);
    const duration = Number.parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--report-sent-highlight-duration')) * 1000;
    justSentTimer = setTimeout(() => { justSentIds = new Set(); }, Number.isFinite(duration) ? duration : 0);
    refreshTick++;
  }

  function viewSentReports() {
    statusFilter = 'sent';
    closeBulkSend(true);
  }

  $effect(() => () => clearTimeout(justSentTimer));

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
    if (event.key !== 'Escape' || event.defaultPrevented) return;
    event.preventDefault();
    // This window listener runs before the Filter panel's own, so close the panel here
    // instead of leaving the page.
    if (filterPanelOpen) dismissFilterPanel();
    else onback();
  }

  function matchesReportQuery(report: Report, q: string): boolean {
    const needle = q.trim().toLowerCase();
    if (!needle) return true;
    return report.name.toLowerCase().includes(needle) || obstacleTypeLabel(report.obstacleType).toLowerCase().includes(needle);
  }

  function matchesDraftQuery(draft: Draft, q: string): boolean {
    const needle = q.trim().toLowerCase();
    if (!needle) return true;
    return draft.title.toLowerCase().includes(needle) || obstacleTypeLabel(draft.category).toLowerCase().includes(needle);
  }

  function matchesStatus(report: Report, key: StatusTabKey): boolean {
    if (key === 'sent') return isSent(report);
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
        if (!matchesGeometryFilter(geometryKind(report.geometry), geometries)) continue;
        if (!matchesHeightFilter(report.heightMeters, heightFilter)) continue;
        items.push({ kind: 'report', id: report.id, report, sort: dateSortValue(report.secondaryDate ?? report.createdDate) });
      }
    }

    if (key === 'draft' || key === 'all') {
      for (const draft of drafts) {
        if (!matchesDraftQuery(draft, q)) continue;
        if (!matchesGeometryFilter(geometryKind(draft.geometry), geometries)) continue;
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
  let subtitle = $derived.by(() => {
    const kind = statusFilter === 'draft' ? 'draft' : 'report';
    return `${items.length} ${items.length === 1 ? kind : kind + 's'} · sorted by last edited`;
  });
</script>

<svelte:window onkeydown={closeOnEscape} />

{#if view === 'report-detail' && selectedReport}
  <ReportDetailPage report={selectedReport} onback={backToList} {onshowonmap} />
{:else if view === 'draft-detail' && selectedDraft}
  <DraftDetailPage draft={selectedDraft} onBack={backToList} onSend={draftSent} onShowOnMap={onshowonmap} />
{:else}
  {#key refreshTick}
    <main class="reports-page" class:reports-select-active={selectMode} aria-label="Reports">
      <ReportsHeader {onback} {subtitle}>
        <ReportsToolbar
          bind:query
          {selectMode} ontoggleselect={toggleSelectMode}
          filterOpen={filterPanelOpen} {filterActive}
          bind:pendingGeometries bind:pendingHeightFilter {pendingResultCount}
          onopenfilter={openFilterPanel} onresetfilter={resetPendingFilters} onapplyfilter={applyFilters} ondismissfilter={dismissFilterPanel}
        />
        <StatusTabs {reports} {draftsCount} active={statusFilter} onselect={(key) => statusFilter = key} />
      </ReportsHeader>

      <div class="reports-content">
        {#if items.length === 0}
          <p class="reports-empty">No {noun} match your search.</p>
        {:else}
          <div class="reports-card-grid">
            {#each items as item (item.kind + '-' + item.id)}
              {#if item.kind === 'report'}
                <ReportCard report={item.report} onopen={openReport} {selectMode} selected={selectedIds.has(item.report.id)} ontoggleselect={toggleSelected}
                  justSent={justSentIds.has(item.report.id)} unavailableHint="reports-select-hint" />
              {:else}
                <DraftCard draft={item.draft} onEdit={openDraft} {selectMode} unavailableHint="reports-select-hint" />
              {/if}
            {/each}
          </div>
        {/if}
      </div>

      {#if selectMode}
        <p id="reports-select-hint" class="sr-only">Only reports that are Ready to send can be selected.</p>
        <div class="reports-select-bar" role="region" aria-label="Selection">
          <div class="reports-select-bar-content">
            <span class="reports-select-count" aria-live="polite">{readySelectedCount} selected</span>
            <button type="button" class="button button--primary reports-select-send" disabled={readySelectedCount === 0} onclick={sendSelected}>
              Send ({readySelectedCount})
            </button>
          </div>
        </div>
      {/if}
    </main>
  {/key}
  {#if bulkReports}
    <BulkSendDialog reports={bulkReports} send={sendreport} onsent={bulkSent} onclose={closeBulkSend} onviewsent={viewSentReports} />
  {/if}
  {#if sentConfirmation}
    <ReportSentDialog report={sentConfirmation.report} sentAt={sentConfirmation.at}
      onbacktoreports={() => (sentConfirmation = null)} onclose={() => (sentConfirmation = null)} />
  {/if}
{/if}

<style>
  .reports-empty { color: var(--color-text-secondary); font-size: var(--font-size-body); padding: var(--space-8) 0; text-align: center; }

</style>
