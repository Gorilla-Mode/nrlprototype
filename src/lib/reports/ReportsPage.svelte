<script lang="ts">
  import { tick, untrack } from 'svelte';
  import ReportsHeader from './ReportsHeader.svelte';
  import ReportsToolbar from './ReportsToolbar.svelte';
  import ReportFilters from './ReportFilters.svelte';
  import StatusTabs from './StatusTabs.svelte';
  import ReportCard from './ReportCard.svelte';
  import ReportDetailPage from './ReportDetailPage.svelte';
  import ReportSentDialog from './ReportSentDialog.svelte';
  import BulkSendDialog from './BulkSendDialog.svelte';
  import { sendToKartverket, type ReportSender } from './bulkSend';
  import { isSent, type Report, type StatusTabKey } from './reportsData';
  import { reportStore, reportToDraft } from './reportStore';
  import { deliverErrorReport } from './errorReportRecords';
  import { errorReportHeading } from '../obstacles/errorReport';
  import DraftCard from '../drafts/DraftCard.svelte';
  import DraftDetailPage from '../drafts/DraftDetailPage.svelte';
  import type { Draft } from '../drafts/types';
  import { draftType, heightInMeters } from '../drafts/types';
  import { geometryKind, type GeometryCameraTarget } from './reportGeometry';
  import { obstacleTypeLabel } from '../reporting/obstacle';
  import { matchesGeometryFilter, matchesHeightFilter, type GeometryKey, type HeightFilterKey } from './filtering';

  let { onback, onshowonmap, sendreport = sendToKartverket, highlightId = null, openId = null, filter = 'all', onediterrorreport,
    editId = null, onopenedit, onexitedit, oneditdirty }: {
    onback: () => void;
    onshowonmap?: (target: GeometryCameraTarget) => void;
    /** A report just saved elsewhere: listed first and briefly tinted when the page opens. */
    highlightId?: string | null;
    /** A report or draft to open in its detail view when the page opens. */
    openId?: string | null;
    /** Status tab chosen when the page opens. */
    filter?: StatusTabKey;
    /** An error report's draft or Ready report is edited in the error form on the map. */
    onediterrorreport?: (id: string) => void;
    /** The draft or Ready report whose edit page is open, from #/reports/{id}/edit. */
    editId?: string | null;
    /** Opens an edit page by its URL. */
    onopenedit?: (id: string) => void;
    /** Leaves the edit page; `saved` skips the unsaved-changes question. */
    onexitedit?: (saved: boolean) => void;
    /** Whether the open edit page has unsaved changes. */
    oneditdirty?: (dirty: boolean) => void;
    /** Delivers one selected report; the prototype default always succeeds. */
    sendreport?: ReportSender;
  } = $props();

  // Read once: the opening tab is part of arriving, not of later visits.
  let statusFilter = $state<StatusTabKey>(untrack(() => filter));
  let query = $state('');

  let selectMode = $state(false);
  let selectedIds = $state<Set<string>>(new Set());

  // Filter chips apply at once and combine with the status chip and the search.
  let appliedGeometries = $state<Set<GeometryKey>>(new Set());
  let appliedHeightFilter = $state<HeightFilterKey>('any');

  let reports = $derived($reportStore.reports);
  let drafts = $derived($reportStore.drafts);

  let view = $state<'list' | 'report-detail'>('list');
  // .raw: the (legacy, non-runes) detail page edits a working copy in place and
  // saves it through the report store, so stored data only changes on save.
  let selectedReport = $state.raw<Report | null>(null);

  function openReport(report: Report) {
    selectedReport = structuredClone(report);
    view = 'report-detail';
  }

  // Drafts open on their edit page; error drafts in the error form on the map.
  function openDraft(draft: Draft) {
    if (draft.errorReport) { onediterrorreport?.(draft.id); return; }
    onopenedit?.(draft.id);
  }

  // Edit report on a Ready report: the list stays behind the edit page, so returning never
  // shows a detail page holding the copy from before the edit.
  function editReport(id: string) {
    backToList();
    onopenedit?.(id);
  }

  function backToList() {
    view = 'list';
    selectedReport = null;
  }

  /** The edit page's working copy: a draft, or a Ready report opened as a draft. Error reports are edited on the map. */
  function editableCopy(id: string): { draft: Draft; status: 'draft' | 'ready' } | null {
    const draft = drafts.find((entry) => entry.id === id);
    if (draft) return draft.errorReport ? null : { draft: structuredClone(draft), status: 'draft' };
    const report = reports.find((entry) => entry.id === id);
    if (report?.status === 'ready' && !report.errorReport) return { draft: reportToDraft(structuredClone(report), true), status: 'ready' };
    return null;
  }

  // Made once per id: later store changes never replace the form being edited.
  let editing = $derived.by(() => {
    const id = editId;
    return id ? untrack(() => editableCopy(id)) : null;
  });

  // An edit URL for something that cannot be edited (sent, or unknown) falls back to the list.
  $effect(() => {
    if (editId && !editing) untrack(() => onexitedit?.(true));
  });

  // Read once: opening straight into a report is part of arriving, not of later visits.
  const initialOpenId = untrack(() => openId);
  if (initialOpenId) {
    const report = untrack(() => reports).find((entry) => entry.id === initialOpenId);
    const draft = report ? undefined : untrack(() => drafts).find((entry) => entry.id === initialOpenId);
    if (report) openReport(report);
    // An error draft has no detail page; it is listed first and highlighted instead of leaving the page.
    // A draft opens on its edit URL once the page is in place.
    else if (draft && !draft.errorReport) void tick().then(() => openDraft(draft));
  }

  // Confirmation after a draft is sent: the new report and when sending succeeded.
  let sentConfirmation = $state.raw<{ report: Report; at: Date } | null>(null);

  function draftSent(sent: Report) {
    onexitedit?.(true);
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
      const submitted = reportStore.submitReport(report.id);
      if (submitted) deliverErrorReport(submitted);
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

  function closeOnEscape(event: KeyboardEvent) {
    // An open filter menu handles its own Escape first and prevents this one.
    if (event.key !== 'Escape' || event.defaultPrevented) return;
    event.preventDefault();
    if (editId) onexitedit?.(false);
    else onback();
  }

  function matchesReportQuery(report: Report, q: string): boolean {
    const needle = q.trim().toLowerCase();
    if (!needle) return true;
    if (report.errorReport) return errorReportHeading(report.errorReport).toLowerCase().includes(needle);
    return report.name.toLowerCase().includes(needle) || obstacleTypeLabel(report.obstacleType).toLowerCase().includes(needle);
  }

  function matchesDraftQuery(draft: Draft, q: string): boolean {
    const needle = q.trim().toLowerCase();
    if (!needle) return true;
    if (draft.errorReport) return errorReportHeading(draft.errorReport).toLowerCase().includes(needle);
    const type = draftType(draft);
    return draft.title.toLowerCase().includes(needle) || (type ? obstacleTypeLabel(type) : 'Untitled obstacle').toLowerCase().includes(needle);
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
  // What search and filters leave across every status, so each status chip counts what it would list.
  let matching = $derived(buildItems('all', query, appliedGeometries, appliedHeightFilter));
  let matchingReports = $derived(matching.flatMap((item) => (item.kind === 'report' ? [item.report] : [])));
  let matchingDraftsCount = $derived(matching.filter((item) => item.kind === 'draft').length);
  let filterActive = $derived(appliedGeometries.size > 0 || appliedHeightFilter !== 'any');

  function clearFilters() {
    appliedGeometries = new Set();
    appliedHeightFilter = 'any';
  }
  let noun = $derived(statusFilter === 'draft' ? 'drafts' : statusFilter === 'all' ? 'items' : 'reports');
  // The counts are in the tabs, so the line only says how the list is sorted; the count is still announced.
  const subtitle = 'Sorted by last edited';
  let announcement = $derived.by(() => {
    const kind = statusFilter === 'draft' ? 'draft' : 'report';
    return `${items.length} ${items.length === 1 ? kind : kind + 's'}`;
  });
</script>

<svelte:window onkeydown={closeOnEscape} />

{#if editId && editing}
  {#key editId}
    <DraftDetailPage draft={editing.draft} status={editing.status} onBack={() => onexitedit?.(false)} onDone={() => onexitedit?.(true)}
      onSend={draftSent} ondirtychange={(dirty) => oneditdirty?.(dirty)} />
  {/key}
{:else if view === 'report-detail' && selectedReport}
  <ReportDetailPage report={selectedReport} onback={backToList} {onshowonmap} onediterror={onediterrorreport} onedit={editReport} />
{:else}
  <main class="reports-page" class:reports-select-active={selectMode} aria-label="Reports">
    {#snippet filters()}<ReportFilters bind:geometries={appliedGeometries} bind:heightFilter={appliedHeightFilter} />{/snippet}
    <ReportsHeader {onback} {subtitle} {announcement}>
      <ReportsToolbar bind:query {selectMode} ontoggleselect={toggleSelectMode} {filters} />
      {#if filterActive}
        <div class="reports-header-row reports-filter-clear-row">
          <button type="button" class="reports-filter-clear card-cta-link" onclick={clearFilters}>Clear filters</button>
        </div>
      {/if}
      <StatusTabs reports={matchingReports} draftsCount={matchingDraftsCount} active={statusFilter} onselect={(key) => statusFilter = key} />
    </ReportsHeader>

    <div class="reports-content">
      {#if reports.length + drafts.length === 0}
        <div class="reports-empty">
          <p>No reports yet</p>
          <button type="button" class="ds-button" data-variant="secondary" data-color="neutral" onclick={onback}>Back to map</button>
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
              <DraftCard draft={item.draft} onEdit={openDraft} {selectMode} justSaved={item.draft.id === justSavedId} unavailableHint="reports-select-hint" />
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
          <button type="button" class="ds-button reports-select-send" data-variant="primary" disabled={readySelectedCount === 0} onclick={sendSelected}>
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
      onprimary={() => (sentConfirmation = null)} onclose={() => (sentConfirmation = null)} />
  {/if}
{/if}

<style>
  .reports-empty { color: var(--color-text-secondary); font-size: var(--font-size-body); padding: var(--space-8) 0; text-align: center; }

</style>
