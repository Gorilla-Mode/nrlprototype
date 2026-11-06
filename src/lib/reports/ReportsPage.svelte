<script lang="ts">
  import { untrack } from 'svelte';
  import ReportsHeader from './ReportsHeader.svelte';
  import ReportsToolbar from './ReportsToolbar.svelte';
  import StatusTabs from './StatusTabs.svelte';
  import ReportCard from './ReportCard.svelte';
  import ReportDetailPage from './ReportDetailPage.svelte';
  import ReportSentDialog from './ReportSentDialog.svelte';
  import BulkSendDialog from './BulkSendDialog.svelte';
  import { sendToKartverket, type ReportSender } from './bulkSend';
  import { isSent, type Report, type StatusTabKey } from './reportsData';
  import { reportStore } from './reportStore';
  import DraftCard from '../drafts/DraftCard.svelte';
  import DraftDetailPage from '../drafts/DraftDetailPage.svelte';
  import type { Draft } from '../drafts/types';
  import { heightInMeters } from '../drafts/types';
  import { geometryKind, type GeometryCameraTarget } from './reportGeometry';
  import { obstacleTypeLabel } from '../reporting/obstacle';
  import { matchesGeometryFilter, matchesHeightFilter, type GeometryKey, type HeightFilterKey } from './filtering';

  let { onback, onshowonmap, sendreport = sendToKartverket, highlightId = null, openId = null }: {
    onback: () => void;
    onshowonmap?: (target: GeometryCameraTarget) => void;
    /** A report just saved elsewhere: listed first and briefly tinted when the page opens. */
    highlightId?: string | null;
    /** A report or draft to open in its detail view when the page opens. */
    openId?: string | null;
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

  let reports = $derived($reportStore.reports);
  let drafts = $derived($reportStore.drafts);

  let view = $state<'list' | 'report-detail' | 'draft-detail'>('list');
  // .raw: the (legacy, non-runes) detail pages edit a working copy in place and
  // save it through the report store, so stored data only changes on save.
  let selectedReport = $state.raw<Report | null>(null);
  let selectedDraft = $state.raw<Draft | null>(null);

  function openReport(report: Report) {
    selectedReport = structuredClone(report);
    view = 'report-detail';
  }

  function openDraft(draft: Draft) {
    selectedDraft = structuredClone(draft);
    view = 'draft-detail';
  }

  function backToList() {
    view = 'list';
    selectedReport = null;
    selectedDraft = null;
  }

  // Read once: opening straight into a report is part of arriving, not of later visits.
  const initialOpenId = untrack(() => openId);
  if (initialOpenId) {
    const report = untrack(() => reports).find((entry) => entry.id === initialOpenId);
    const draft = report ? undefined : untrack(() => drafts).find((entry) => entry.id === initialOpenId);
    if (report) openReport(report);
    else if (draft) openDraft(draft);
  }

  // Confirmation after a draft is sent: the new report and when sending succeeded.
  let sentConfirmation = $state.raw<{ report: Report; at: Date } | null>(null);

  function draftSent(sent: Report) {
    sentConfirmation = { report: sent, at: new Date(sent.sentAt ?? sent.updatedAt) };
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

  // Delivered reports change status at once, so the data stays true even if the page closes.
  function bulkSent(sent: readonly Report[]) {
    for (const report of sent) {
      reportStore.submitReport(report.id);
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
  }

  function viewSentReports() {
    statusFilter = 'sent';
    closeBulkSend(true);
  }

  $effect(() => () => clearTimeout(justSentTimer));

  // Read once: the tint marks what was just saved, not every later visit.
  let justSavedId = $state(untrack(() => highlightId));
  $effect(() => {
    if (!justSavedId) return;
    const duration = Number.parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--report-saved-highlight-duration')) * 1000;
    const timer = setTimeout(() => { justSavedId = null; }, Number.isFinite(duration) ? duration : 0);
    return () => clearTimeout(timer);
  });

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

  /** ISO timestamp -> a comparable number, for "most recent first" sorting across reports and drafts. */
  function dateSortValue(timestamp: string): number {
    const value = Date.parse(timestamp);
    return Number.isNaN(value) ? 0 : value;
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
        items.push({ kind: 'report', id: report.id, report, sort: dateSortValue(report.updatedAt) });
      }
    }

    if (key === 'draft' || key === 'all') {
      for (const draft of drafts) {
        if (!matchesDraftQuery(draft, q)) continue;
        if (!matchesGeometryFilter(geometryKind(draft.geometry), geometries)) continue;
        if (!matchesHeightFilter(heightInMeters(draft.heightAboveGround), heightFilter)) continue;
        items.push({ kind: 'draft', id: draft.id, draft, sort: dateSortValue(draft.updatedAt) });
      }
    }

    const pinned = untrack(() => justSavedId);
    items.sort((a, b) => Number(b.id === pinned) - Number(a.id === pinned) || b.sort - a.sort);
    return items;
  }

  let draftsCount = $derived(drafts.length);
  let items = $derived(buildItems(statusFilter, query, appliedGeometries, appliedHeightFilter));
  let pendingResultCount = $derived(buildItems(statusFilter, query, pendingGeometries, pendingHeightFilter).length);
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
  <DraftDetailPage draft={selectedDraft} onBack={backToList} onSend={draftSent} />
{:else}
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
      {#if reports.length + drafts.length === 0}
        <div class="reports-empty">
          <p>No reports yet</p>
          <button type="button" class="button" onclick={onback}>Back to map</button>
        </div>
      {:else if items.length === 0}
        <p class="reports-empty">No {noun} match your search.</p>
      {:else}
        <div class="reports-card-grid">
          {#each items as item (item.kind + '-' + item.id)}
            {#if item.kind === 'report'}
              <ReportCard report={item.report} onopen={openReport} {selectMode} selected={selectedIds.has(item.report.id)} ontoggleselect={toggleSelected}
                justSent={justSentIds.has(item.report.id)} justSaved={item.report.id === justSavedId} unavailableHint="reports-select-hint" />
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
