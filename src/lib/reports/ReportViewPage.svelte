<script lang="ts">
  import { untrack } from 'svelte';
  import LargeTitleHeader from '../components/LargeTitleHeader.svelte';
  import StatusBadge from './StatusBadge.svelte';
  import PhotoField from './PhotoField.svelte';
  import ReportedTable from './ReportedTable.svelte';
  import ReportLocationCard from './ReportLocationCard.svelte';
  import type { ErrorReportRecord } from '../obstacles/errorReport';
  import { lastEditedLabel, type Report } from './reportsData';
  import { reportStore } from './reportStore';
  import { deliverErrorReport } from './errorReportRecords';
  import { reportedChanges, reportedChangesHeading, reportedObstacleRows } from './sentReport';
  import { reportDetailTitle, reportPlaceName } from './reportDetail';
  import type { ReportPhoto } from './photos';

  /**
   * The report detail page for a Ready to send report (#/reports/{id}); the sent state is
   * ReportDetailPage. The reported data as a table, the location (changed only through Edit
   * report), and Edit report / Send for Review. Sized for iPad by the .report-detail styles.
   */
  let { report, record, onback, onedit, onsent }: {
    /** The stored report, kept current, so returning from the edit page shows the edits. */
    report: Report;
    /** Set for an error report: what is wrong, the registered obstacle and reported corrections. */
    record?: ErrorReportRecord;
    onback: () => void;
    onedit: (id: string) => void;
    /** After sending: the page leaves and the list shows the sent confirmation. */
    onsent: (sent: Report) => void;
  } = $props();

  let title = $derived(reportDetailTitle(report));
  let description = $derived(report.pilotReportText.trim());
  let changes = $derived(record ? reportedChanges(record) : []);
  let obstacleRows = $derived(record ? [] : reportedObstacleRows(report, reportPlaceName(report)));

  // An error report's Add photo saves at once: this page has no working copy.
  let photos = $state<ReportPhoto[]>(untrack(() => [...report.photos]));
  $effect(() => {
    const next = photos;
    const current = untrack(() => report);
    if (!untrack(() => record)) return;
    if (next.length !== current.photos.length || next.some((photo, index) => photo.id !== current.photos[index]?.id)) {
      reportStore.updateReport({ ...current, photos: [...next] });
    }
  });

  function sendForReview() {
    const sent = reportStore.submitReport(report.id);
    if (!sent) return;
    if (record) deliverErrorReport(sent);
    onsent(sent);
  }
</script>

<section class="page report-detail">
  {#snippet statusTag()}<StatusBadge status={report.status} />{/snippet}
  <div class="scroll-area">
    <!-- The shared large-title header: "‹ Reports" and the tag in the bar, the title and who reported it below. -->
    <LargeTitleHeader {title} backText="Reports" backLabel="Back to reports" {onback} actions={statusTag} wide>
      <p class="report-meta">
        Reported by {report.reportedByName}, {report.reportedByOrg}
        · Last edited <time datetime={report.updatedAt}>{lastEditedLabel(report.updatedAt)}</time>
      </p>
    </LargeTitleHeader>
    <div class="safe-area">
      <!-- Portrait: one column. Wider than 1200 px: these on the left, Location sticky on the right. -->
      <div class="report-detail-content">
        {#if record}
          {#if changes.length}<ReportedTable id="view-changes-heading" heading={reportedChangesHeading(changes.length)} rows={changes} withCurrent={true} />{/if}
        {:else}
          <ReportedTable id="view-obstacle-heading" heading="Reported obstacle" rows={obstacleRows} withCurrent={false} />
        {/if}

        <section class="report-detail-card" aria-labelledby="view-description-heading">
          <h2 class="report-detail-card-heading" id="view-description-heading">Description and photo</h2>
          {#if record}
            <!-- Error reports keep Add photo here, saved at once. -->
            {#if description}<p class="description">{description}</p>{:else}<p class="muted empty">No description added</p>{/if}
            <div class="photo-row with-text">
              <PhotoField bind:photos editable={true} label={title} showOptional={false} />
            </div>
          {:else}
            {#if description}<p class="description">{description}</p>{/if}
            {#if report.photos.length}
              <div class="photo-row" class:with-text={!!description}>
                <PhotoField photos={report.photos} editable={false} label={title} />
              </div>
            {/if}
            {#if !description && !report.photos.length}<p class="muted empty">No description or photo added</p>{/if}
          {/if}
        </section>

        <ReportLocationCard {report} label={title} />
      </div>
    </div>
  </div>

  <footer class="bottom-bar">
    <div class="actions">
      <button type="button" class="ds-button" data-variant="secondary" data-color="neutral" onclick={() => onedit(report.id)}>Edit report</button>
      <!-- The note belongs to Send: right-aligned beside it, above it when narrow. -->
      <div class="send-group">
        <div class="send-note" id="view-send-note">
          <div class="note-strong">Goes straight to the NRL reviewer</div>
          <div class="muted">You cannot edit the report after sending</div>
        </div>
        <button type="button" class="ds-button" data-variant="primary" data-color="brand1" aria-describedby="view-send-note" onclick={sendForReview}>
          <span class="paper-plane" aria-hidden="true">➤</span> Send for Review
        </button>
      </div>
    </div>
  </footer>
</section>

<style>
  /* The page frame and footer; cards, table and layout come from .report-detail in stylesheet.css. */
  .page {
    position: fixed; inset: 0; z-index: var(--layer-dialog);
    display: flex; flex-direction: column;
    background: var(--color-background-page);
  }
  .muted { color: var(--color-text-secondary); }

  /* The bar sits below the scroll area, never over it. */
  .scroll-area { flex: 1; overflow-y: auto; overscroll-behavior: contain; scroll-padding-block: calc(var(--large-title-bar-height) + var(--space-6)) var(--space-6); /* clear of the sticky bar */ }
  .safe-area {
    width: 100%; max-width: calc(var(--page-content-max) + 2 * var(--page-gutter)); margin: 0 auto; box-sizing: border-box;
    padding: var(--page-content-top) max(var(--page-gutter), var(--safe-area-right)) var(--space-8) max(var(--page-gutter), var(--safe-area-left));
  }
  .report-meta { margin: var(--space-1) 0 0; color: var(--color-text-secondary); overflow-wrap: anywhere; }

  .description { margin: 0; color: var(--color-text-primary); font-size: var(--detail-font-size-body); line-height: var(--line-height-body); white-space: pre-line; overflow-wrap: anywhere; }
  .empty { margin: 0; font-size: var(--detail-font-size-body); }
  .photo-row.with-text { margin-top: var(--space-4); }

  .bottom-bar { flex-shrink: 0; background: var(--color-background-raised); border-top: var(--border-default); }
  .actions {
    width: 100%; max-width: calc(var(--page-content-max) + 2 * var(--page-gutter)); margin: 0 auto; box-sizing: border-box;
    padding: var(--space-4) max(var(--page-gutter), var(--safe-area-right)) max(var(--space-4), var(--safe-area-bottom)) max(var(--page-gutter), var(--safe-area-left));
    display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: var(--space-3) var(--space-4);
  }
  /* Wider than 1200 px the footer's actions follow the content's width. */
  @media (min-width: 75.0625rem) { .actions { max-width: var(--detail-wide-max); } }
  .paper-plane { transform: rotate(45deg); display: inline-block; }
  .send-group { display: flex; align-items: center; justify-content: flex-end; flex-wrap: wrap; gap: var(--space-2) var(--space-4); margin-left: auto; }
  .send-note { text-align: right; font-size: var(--detail-font-size-helper); }
  .note-strong { font-weight: 700; color: var(--color-text-primary); }
  .bottom-bar .ds-button, .photo-row :global(button) { min-height: var(--target-size-min); }
</style>
