<script lang="ts">
  import { tick } from 'svelte';
  import PageHeader from '../components/PageHeader.svelte';
  import Dialog from '../components/Dialog.svelte';
  import MiniMap from '../map/MiniMap.svelte';
  import PhotoField from './PhotoField.svelte';
  import { formatShortDate, reportPageTitle, type Report } from './reportsData';
  import { reportStore } from './reportStore';
  import { reportedChanges, reportedChangesHeading, reportedObstacleRows, sentStatusView, type ReportedChange, type ReportedField } from './sentReport';
  import { geometryCameraTarget, type GeometryCameraTarget } from './reportGeometry';

  /**
   * The read-only page for a sent report: under review, approved, not approved or withdrawn.
   * Ready reports have their own page (ReportViewPage). Both report types share the status
   * block, description and location; only the title and the second card differ.
   */
  let { report, onback, onshowonmap }: {
    /** The stored report, kept current, so withdrawing shows the new status at once. */
    report: Report;
    onback: () => void;
    onshowonmap?: (target: GeometryCameraTarget) => void;
  } = $props();

  let record = $derived(report.errorReport);
  let title = $derived(reportPageTitle(report));
  let status = $derived(sentStatusView(report));
  let changes = $derived(record ? reportedChanges(record) : []);
  let obstacleRows = $derived(record ? [] : reportedObstacleRows(report));
  let description = $derived(report.pilotReportText.trim());
  let registered = $derived(record?.answers.errorKinds.includes('wrong-position') && record.answers.correctedPosition
    ? { lat: record.obstacle.lat, lng: record.obstacle.lng } : null);

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

<section class="page">
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

      {#if status}
        <section class="card status-block" data-tone={status.tone} aria-label="Status">
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

      <!-- One table for both report types; a new obstacle has no "In NRL today" column. -->
      {#snippet reportedTable(id: string, heading: string, rows: readonly (ReportedField & Partial<ReportedChange>)[], withCurrent: boolean)}
        <section class="card" aria-labelledby={id}>
          <h2 class="card-heading" {id}>{heading}</h2>
          <table class="changes">
            <thead>
              <tr><th scope="col">Field</th>{#if withCurrent}<th scope="col">In NRL today</th>{/if}<th scope="col">Reported</th></tr>
            </thead>
            <tbody>
              {#each rows as row (row.field)}
                <tr>
                  <th scope="row">{row.field}</th>
                  {#if withCurrent}<td class="current">{#if row.struck}<s>{row.current}</s>{:else}{row.current}{/if}</td>{/if}
                  <td class="reported"><strong>{row.reported}</strong>{#if row.note}<span class="note">{row.note}</span>{/if}</td>
                </tr>
              {/each}
            </tbody>
          </table>
        </section>
      {/snippet}
      {#if record}
        {#if changes.length}{@render reportedTable('sent-changes-heading', reportedChangesHeading(changes.length), changes, true)}{/if}
      {:else}
        {@render reportedTable('sent-obstacle-heading', 'Reported obstacle', obstacleRows, false)}
      {/if}

      <!-- Read-only, always shown: what the pilot wrote and the photos, or that there are none. -->
      <section class="card" aria-labelledby="sent-description-heading">
        <h2 class="card-heading" id="sent-description-heading">Description and photos</h2>
        {#if description}<p class="description">{description}</p>{:else}<p class="description muted">No description added</p>{/if}
        <div class="photo-row">
          {#if report.photos.length}
            <PhotoField photos={report.photos} editable={false} label={title} thumbSize="large" />
          {:else}
            <p class="muted">No photos added</p>
          {/if}
        </div>
      </section>

      <section class="card" aria-labelledby="sent-location-heading">
        <div class="location-heading">
          <h2 class="card-heading" id="sent-location-heading">Location</h2>
          {#if onshowonmap && report.geometry}
            {@const geometry = report.geometry}
            <button type="button" class="card-cta-link location-action" onclick={() => onshowonmap(geometryCameraTarget(geometry))}>Show on map</button>
          {/if}
        </div>
        <!-- The shared report map, full width; its caption gives the coordinates. -->
        <MiniMap geometry={report.geometry} label={title} {registered} />
      </section>
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
    display: flex; flex-direction: column; gap: var(--space-4);
  }
  .report-meta { margin: 0; color: var(--color-text-secondary); font-size: var(--font-size-body-small); overflow-wrap: anywhere; }

  /* One colour per status, from the status roles; the chip and the block agree. */
  [data-tone='info'] { --tone-surface: var(--color-status-info-surface); --tone-color: var(--color-status-info); }
  [data-tone='success'] { --tone-surface: var(--color-status-success-surface); --tone-color: var(--color-status-success); }
  [data-tone='warning'] { --tone-surface: var(--color-status-warning-surface); --tone-color: var(--color-status-warning); }
  [data-tone='neutral'] { --tone-surface: var(--color-status-draft-surface); --tone-color: var(--color-status-draft); }
  .sent-chip { --dsc-tag-background: var(--tone-surface); --dsc-tag-color: var(--tone-color); }
  .sent-chip svg { width: var(--sent-chip-icon-size); height: var(--sent-chip-icon-size); }

  .card { min-width: 0; border: var(--border-default); border-radius: var(--radius-card); padding: var(--space-4); background: var(--color-background-raised); }
  .card-heading {
    margin: 0 0 var(--space-3); color: var(--color-text-secondary);
    font-size: var(--font-size-caption); font-weight: var(--font-weight-semibold); line-height: var(--line-height-tight);
    /* Small caps: the font has no small-caps glyphs, so small uppercase as on the other report cards. */
    text-transform: uppercase; letter-spacing: var(--sent-heading-tracking);
  }

  /* Status block: a neutral card like the others; colour only in the icon circle and the timeline. */
  .status-summary { display: flex; align-items: flex-start; flex-wrap: wrap; gap: var(--space-3) var(--space-4); }
  .status-icon {
    flex: none; display: grid; place-items: center;
    width: var(--sent-status-icon-size); height: var(--sent-status-icon-size);
    border-radius: var(--radius-round); background: var(--tone-surface); color: var(--tone-color);
  }
  .status-icon svg, .timeline-dot svg { width: var(--icon-size-default); height: var(--icon-size-default); stroke: currentColor; stroke-width: var(--icon-stroke-width); stroke-linecap: round; stroke-linejoin: round; }
  .status-text { flex: 1 1 14rem; min-width: 0; }
  .status-title { margin: 0; color: var(--color-text-primary); font-size: var(--font-size-body); font-weight: var(--font-weight-semibold); line-height: var(--line-height-tight); }
  .status-title:focus:not(:focus-visible) { outline: none; }
  .status-text p { margin: var(--space-1) 0 0; color: var(--color-text-primary); font-size: var(--font-size-body-small); line-height: var(--line-height-body); }
  .status-action { flex: none; min-height: var(--target-size-min); margin-left: auto; background: var(--color-background-raised); }

  .reviewer-comment { margin-top: var(--space-4); padding: var(--space-3) var(--space-4); border-radius: var(--radius-control); background: var(--color-background-subtle); }
  .reviewer-comment h3 { margin: 0; color: var(--color-text-secondary); font-size: var(--font-size-body-small); font-weight: var(--font-weight-semibold); }
  .reviewer-comment p { margin: var(--space-1) 0 0; color: var(--color-text-primary); line-height: var(--line-height-body); white-space: pre-line; overflow-wrap: anywhere; }

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
  .timeline-label { color: var(--color-text-primary); font-size: var(--font-size-body-small); font-weight: var(--font-weight-semibold); overflow-wrap: anywhere; }
  .timeline-detail { color: var(--color-text-secondary); font-size: var(--font-size-caption); overflow-wrap: anywhere; }

  /* Reported change(s): old value muted, reported value bold. */
  .changes { width: 100%; border-collapse: collapse; font-size: var(--font-size-body-small); }
  /* One Field width on both report types, so their tables line up. */
  .changes thead th:first-child { width: var(--sent-field-column-width); }
  .changes th, .changes td { padding: var(--space-2) var(--space-3) var(--space-2) 0; border-top: var(--border-default); text-align: left; vertical-align: top; overflow-wrap: anywhere; }
  .changes thead th { border-top: 0; padding-top: 0; color: var(--color-text-secondary); font-weight: var(--font-weight-semibold); }
  .changes tbody th { color: var(--color-text-primary); font-weight: var(--font-weight-semibold); }
  .changes .current { color: var(--color-text-secondary); }
  .changes .reported { color: var(--color-text-primary); }
  .changes strong { font-weight: var(--font-weight-semibold); }
  .note { display: block; margin-top: var(--space-1); color: var(--color-text-secondary); font-size: var(--font-size-caption); font-weight: var(--font-weight-regular); }

  .description { margin: 0; color: var(--color-text-primary); line-height: var(--line-height-body); white-space: pre-line; overflow-wrap: anywhere; }
  .photo-row { margin-top: var(--space-4); }
  .photo-row p { margin: 0; }
  .muted { color: var(--color-text-secondary); }
  .photo-row :global(button) { min-height: var(--target-size-min); }

  .location-heading { display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: var(--space-2); margin-bottom: var(--space-3); }
  .location-heading .card-heading { margin: 0; }
  .location-action { min-height: var(--target-size-min); margin-block: calc(-1 * var(--space-3)); padding: 0; border: 0; background: none; font-size: var(--font-size-body-small); cursor: pointer; }
</style>
