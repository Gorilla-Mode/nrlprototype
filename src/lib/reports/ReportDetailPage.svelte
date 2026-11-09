<script lang="ts">
  import { tick } from 'svelte';
  import PageHeader from '../components/PageHeader.svelte';
  import Dialog from '../components/Dialog.svelte';
  import PhotoField from './PhotoField.svelte';
  import ReportedTable from './ReportedTable.svelte';
  import ReportLocationCard from './ReportLocationCard.svelte';
  import { formatShortDate, type Report } from './reportsData';
  import { reportStore } from './reportStore';
  import { reportedChanges, reportedChangesHeading, reportedObstacleRows, sentStatusView } from './sentReport';
  import { reportDetailTitle, reportPlaceName } from './reportDetail';

  /**
   * The report detail page for a sent report: under review, approved, not approved or withdrawn.
   * The Ready to send state is ReportViewPage. Both report types share the status block,
   * description and location; only the title and the table differ. Sized for iPad by .report-detail.
   */
  let { report, onback }: {
    /** The stored report, kept current, so withdrawing shows the new status at once. */
    report: Report;
    onback: () => void;
  } = $props();

  let record = $derived(report.errorReport);
  let title = $derived(reportDetailTitle(report));
  let status = $derived(sentStatusView(report));
  let changes = $derived(record ? reportedChanges(record) : []);
  let obstacleRows = $derived(record ? [] : reportedObstacleRows(report, reportPlaceName(report)));
  let description = $derived(report.pilotReportText.trim());

  // Withdraw: under review only, after confirming; the status block then says Withdrawn.
  let confirmingWithdraw = $state(false);
  let statusTitle = $state<HTMLHeadingElement>();

  async function withdraw() {
    confirmingWithdraw = false;
    if (!reportStore.withdrawReport(report.id)) return;
    await tick();
    statusTitle?.focus({ preventScroll: true });
  }

  // Decorative: the title names the status.
  const icons = {
    info: '<circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" />',
    success: '<path d="M6.5 12.5 10.5 16.5 17.5 8" />',
    warning: '<path d="m7 7 10 10M7 17 17 7" />',
    neutral: '<path d="M9 14 4 9l5-5" /><path d="M4 9h10.5a5.5 5.5 0 0 1 0 11H11" />',
  } as const;
  const stateText = { done: 'done', current: 'current step', upcoming: 'not yet' } as const;
</script>

<section class="page report-detail">
  {#snippet statusChip()}
    {#if status}<span class="ds-tag reports-status-badge sent-chip" data-size="sm" data-tone={status.tone}>{#if status.key === 'under_review'}<svg viewBox="0 0 24 24" fill="none" aria-hidden="true">{@html icons.info}</svg>{/if}{status.chipLabel}</span>{/if}
  {/snippet}
  <PageHeader {title} backLabel="Back to reports" {onback} actions={statusChip} />

  <div class="scroll-area">
    <div class="safe-area">
      <p class="report-meta">
        Reported by {report.reportedByName}, {report.reportedByOrg}
        · Sent <time datetime={report.sentAt}>{formatShortDate(report.sentAt)}</time>
      </p>

      <!-- Portrait: one column. Wider than 1200 px: these on the left, Location sticky on the right. -->
      <div class="report-detail-content">

      {#if status}
        <section class="report-detail-card status-block" data-tone={status.tone} aria-label="Status">
          <div class="status-summary">
            <span class="status-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none">{@html icons[status.tone]}</svg></span>
            <div class="status-text">
              <h2 class="status-title" tabindex="-1" bind:this={statusTitle}>{status.title}</h2>
              <p>{status.text}</p>
            </div>
            {#if status.canWithdraw}
              <button type="button" class="ds-button status-action" data-variant="secondary" data-color="neutral" onclick={() => { confirmingWithdraw = true; }}>Withdraw report</button>
            {/if}
          </div>
          {#if status.comment}
            <div class="reviewer-comment">
              <h3>Comment from reviewer</h3>
              <p>{status.comment}</p>
            </div>
          {/if}
          <ol class="timeline" data-steps={status.steps.length}>
            {#each status.steps as step (step.label)}
              <li class="timeline-step" data-state={step.state} aria-current={step.state === 'current' ? 'step' : undefined}>
                <span class="timeline-dot" aria-hidden="true">
                  {#if step.state === 'done'}<svg viewBox="0 0 24 24" fill="none"><path d="M6.5 12.5 10.5 16.5 17.5 8" /></svg>{/if}
                </span>
                <span class="timeline-label">{step.label}<span class="sr-only">, {stateText[step.state]}</span></span>
                <span class="timeline-detail">{step.detail}</span>
              </li>
            {/each}
          </ol>
        </section>
      {/if}

      {#if record}
        {#if changes.length}<ReportedTable id="sent-changes-heading" heading={reportedChangesHeading(changes.length)} rows={changes} withCurrent={true} />{/if}
      {:else}
        <ReportedTable id="sent-obstacle-heading" heading="Reported obstacle" rows={obstacleRows} withCurrent={false} />
      {/if}

      <!-- Read-only, always shown: what the pilot wrote and the photos, or that there are none. -->
      <section class="report-detail-card" aria-labelledby="sent-description-heading">
        <h2 class="report-detail-card-heading" id="sent-description-heading">Description and photos</h2>
        {#if description}<p class="description">{description}</p>{:else}<p class="description muted">No description added</p>{/if}
        <div class="photo-row">
          {#if report.photos.length}
            <PhotoField photos={report.photos} editable={false} label={title} thumbSize="large" />
          {:else}
            <p class="muted">No photos added</p>
          {/if}
        </div>
      </section>

      <ReportLocationCard {report} label={title} />
      </div>
    </div>
  </div>

  {#if confirmingWithdraw}
    <Dialog title="Withdraw this report?" role="alertdialog" onclose={() => { confirmingWithdraw = false; }}>
      <p>It will not be reviewed and can't be undone.</p>
      {#snippet primary()}
        <button type="button" class="ds-button dialog-action-primary" data-variant="primary" onclick={withdraw}>Withdraw</button>
      {/snippet}
      {#snippet secondary()}
        <button type="button" class="ds-button dialog-action-secondary" data-variant="tertiary" data-color="brand1" onclick={() => { confirmingWithdraw = false; }}>Cancel</button>
      {/snippet}
    </Dialog>
  {/if}
</section>

<style>
  .page {
    position: fixed; inset: 0; z-index: var(--layer-dialog);
    display: flex; flex-direction: column;
    background: var(--color-background-page);
  }
  .scroll-area { flex: 1; overflow-y: auto; overscroll-behavior: contain; }
  /* The draft and Ready pages' content width. */
  .safe-area {
    width: 100%; max-width: calc(var(--page-content-max) + 2 * var(--page-gutter)); margin: 0 auto; box-sizing: border-box;
    padding: var(--page-content-top) max(var(--page-gutter), var(--safe-area-right)) var(--space-8) max(var(--page-gutter), var(--safe-area-left));
  }
  .report-meta { margin: 0 0 var(--detail-card-gap); color: var(--color-text-secondary); overflow-wrap: anywhere; }

  /* One colour per status, from the status roles; the chip and the block agree. */
  [data-tone='info'] { --tone-surface: var(--color-status-info-surface); --tone-color: var(--color-status-info); }
  [data-tone='success'] { --tone-surface: var(--color-status-success-surface); --tone-color: var(--color-status-success); }
  [data-tone='warning'] { --tone-surface: var(--color-status-warning-surface); --tone-color: var(--color-status-warning); }
  [data-tone='neutral'] { --tone-surface: var(--color-status-draft-surface); --tone-color: var(--color-status-draft); }
  .sent-chip { --dsc-tag-background: var(--tone-surface); --dsc-tag-color: var(--tone-color); }
  .sent-chip svg { width: var(--sent-chip-icon-size); height: var(--sent-chip-icon-size); }

  /* Cards, headings, the table and the two-column layout come from .report-detail in stylesheet.css. */

  /* Status block: a neutral card like the others; colour only in the icon circle and the timeline. */
  .status-summary { display: flex; align-items: flex-start; flex-wrap: wrap; gap: var(--space-3) var(--space-4); }
  .status-icon {
    flex: none; display: grid; place-items: center;
    width: var(--sent-status-icon-size); height: var(--sent-status-icon-size);
    border-radius: var(--radius-round); background: var(--tone-surface); color: var(--tone-color);
  }
  .status-icon svg, .timeline-dot svg { width: var(--icon-size-default); height: var(--icon-size-default); stroke: currentColor; stroke-width: var(--icon-stroke-width); stroke-linecap: round; stroke-linejoin: round; }
  .status-text { flex: 1 1 14rem; min-width: 0; }
  .status-title { margin: 0; color: var(--color-text-primary); font-size: var(--detail-font-size-card-heading); font-weight: var(--font-weight-semibold); line-height: var(--line-height-tight); }
  .status-title:focus:not(:focus-visible) { outline: none; }
  .status-text p { margin: var(--space-1) 0 0; color: var(--color-text-primary); font-size: var(--detail-font-size-body); line-height: var(--line-height-body); }
  .status-action { flex: none; min-height: var(--target-size-min); margin-left: auto; background: var(--color-background-raised); }

  .reviewer-comment { margin-top: var(--space-4); padding: var(--space-3) var(--space-4); border-radius: var(--radius-control); background: var(--color-background-subtle); }
  .reviewer-comment h3 { margin: 0; color: var(--color-text-secondary); font-size: var(--detail-font-size-helper); font-weight: var(--font-weight-semibold); }
  .reviewer-comment p { margin: var(--space-1) 0 0; color: var(--color-text-primary); font-size: var(--detail-font-size-body); line-height: var(--line-height-body); white-space: pre-line; overflow-wrap: anywhere; }

  /* Dots at the start of each column, label and date under them; lines run from dot to dot,
     coloured up to the current step, grey after it. */
  /* Four steps, or three for a withdrawn report. */
  .timeline { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); margin: var(--space-5) 0 0; padding: 0; list-style: none; }
  .timeline[data-steps='3'] { grid-template-columns: repeat(3, minmax(0, 1fr)); }
  .timeline-step { position: relative; display: flex; flex-direction: column; align-items: flex-start; gap: var(--space-1); min-width: 0; padding-inline-end: var(--space-2); text-align: left; }
  .timeline-step + .timeline-step::before {
    content: ''; position: absolute; top: calc(var(--icon-size-large) / 2 - var(--border-width-emphasis) / 2);
    right: 100%; width: calc(100% - var(--icon-size-large));
    height: var(--border-width-emphasis); background: var(--tone-color);
  }
  .timeline-step[data-state='upcoming']::before { background: var(--color-border-strong); }
  .timeline-dot {
    display: grid; place-items: center; box-sizing: border-box;
    width: var(--icon-size-large); height: var(--icon-size-large); margin-bottom: var(--space-1);
    border: var(--border-width-emphasis) solid var(--tone-color); border-radius: var(--radius-round);
    background: var(--color-background-raised);
  }
  .timeline-dot svg { width: var(--icon-size-small); height: var(--icon-size-small); }
  .timeline-step[data-state='done'] .timeline-dot { background: var(--tone-color); color: var(--color-text-inverse); }
  .timeline-step[data-state='current'] .timeline-dot::after { content: ''; width: var(--space-2); height: var(--space-2); border-radius: var(--radius-round); background: var(--tone-color); }
  .timeline-step[data-state='upcoming'] .timeline-dot { border-color: var(--color-border-strong); }
  .timeline-label { color: var(--color-text-primary); font-size: var(--detail-font-size-label); font-weight: var(--font-weight-semibold); overflow-wrap: anywhere; }
  .timeline-detail { color: var(--color-text-secondary); font-size: var(--detail-font-size-helper); overflow-wrap: anywhere; }

  /* The reported table (.reported-table) is styled in stylesheet.css, shared with the error report edit page. */

  .description { margin: 0; color: var(--color-text-primary); font-size: var(--detail-font-size-body); line-height: var(--line-height-body); white-space: pre-line; overflow-wrap: anywhere; }
  .photo-row { margin-top: var(--space-4); }
  .photo-row p { margin: 0; font-size: var(--detail-font-size-body); }
  .muted { color: var(--color-text-secondary); }
  .photo-row :global(button) { min-height: var(--target-size-min); }

</style>
