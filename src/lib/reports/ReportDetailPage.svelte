<script lang="ts">
  import { onMount } from 'svelte';
  import StatusBadge from './StatusBadge.svelte';
  import ReportSentDialog from './ReportSentDialog.svelte';
  import { formatLongDate, type Report } from './reportsData';
  import { lightingOptions, lightingSummary, lightingValueLabel, formatToday } from '../drafts/types';
  import MiniMap from '../map/MiniMap.svelte';
  import PhotoField from './PhotoField.svelte';
  import Dropdown from './Dropdown.svelte';
  import { obstacleTypeChoices, obstacleTypeLabel } from '../reporting/obstacle';
  import { geometryCameraTarget, geometryKind, locationCaption as captionFor, type GeometryCameraTarget } from './reportGeometry';

  const typeOptions = obstacleTypeChoices.map(({ type, label }) => ({ value: type, label }));

  export let report: Report;
  export let onback: () => void = () => {};
  export let onshowonmap: ((target: GeometryCameraTarget) => void) | undefined = undefined;

  let editing = false;

  const toggleEditing = () => {
    editing = !editing;
  };

  function updateHeight(raw: string) {
    const meters = Number(raw);
    if (raw.trim() === '' || Number.isNaN(meters)) {
      report.heightMeters = 0;
      report.heightFeet = 0;
      return;
    }
    report.heightMeters = meters;
    report.heightFeet = Math.round(meters * 3.28084);
  }

  function sendForReview() {
    report.status = 'pending';
    report.secondaryDate = formatToday();
    editing = false;
    // Confirmation only; the moment is read here because reports store no time of day.
    sentAt = new Date();
  }

  let scrollArea: HTMLDivElement;
  let sentAt: Date | null = null;

  // The page always opens at its top, and returns there to show the "sent" banner.
  onMount(() => { scrollArea.scrollTop = 0; });

  function closeSentDialog() {
    sentAt = null;
    scrollArea.scrollTop = 0;
  }

  $: geometryType = geometryKind(report.geometry);

  function showOnMap() {
    if (report.geometry) onshowonmap?.(geometryCameraTarget(report.geometry));
  }
  $: typeLabel = obstacleTypeLabel(report.obstacleType);
  $: heightDisplay = `${report.heightFeet} ft (${report.heightMeters} m)`;

  $: locationCaption = captionFor(report.geometry);

  $: descriptionStatus = report.pilotReportText.trim() ? 'Added' : 'Not added';

  $: isReady = report.status === 'ready';
  $: isPending = report.status === 'pending';
  $: isApproved = report.status === 'approved';
  $: isDeclined = report.status === 'declined';
</script>

<section class="page">
  <header class="top-bar reports-topbar">
    <div class="reports-header-row reports-topbar-content">
      <button class="reports-back" type="button" aria-label="Back to Reports" on:click={onback}>
        <svg viewBox="0 0 8 14" fill="none" aria-hidden="true"><path d="M7 1 1 7l6 6" /></svg>
        <span>Reports</span>
      </button>
      <StatusBadge status={report.status} />
    </div>
  </header>

  <div class="scroll-area" bind:this={scrollArea}>
    <div class="safe-area">
      {#if isPending}
        <div class="sent-banner" role="status">
          <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M3 12 21 4l-6 17-3-7-9-2ZM12 14l3-3" /></svg>
          <p><strong>Sent for review on {formatLongDate(report.secondaryDate)}.</strong> This report can no longer be edited.</p>
        </div>
      {/if}
      <div class="title-block">
        <h1>{report.name}</h1>
        <div class="subtitle">{#if geometryType}{geometryType} ·{' '}{/if}<strong class="type-highlight">{typeLabel}</strong> · {heightDisplay}</div>
      </div>
      <div class="fields-row">
        <div class="field-box">
          {#if editing}
            <div class="field-label" id="report-type-label">TYPE</div>
            <div class="field-value">
              <Dropdown id="report-type" labelledby="report-type-label" options={typeOptions} bind:value={report.obstacleType} />
            </div>
          {:else}
            <div class="field-label">TYPE</div>
            <div class="field-value">{typeLabel}</div>
          {/if}
          <div class="field-caption muted">{geometryType ?? 'No'} geometry</div>
        </div>

        <div class="field-box">
          <div class="field-label">HEIGHT ABOVE GROUND</div>
          {#if editing}
            <div class="field-value height-input-wrap">
              <input
                type="number"
                min="0"
                inputmode="decimal"
                placeholder="Enter height"
                value={report.heightMeters}
                on:input={(e) => updateHeight(e.currentTarget.value)}
              />
              <span class="unit">m</span>
            </div>
          {:else}
            <div class="field-value">{heightDisplay}</div>
          {/if}
          <div class="field-caption muted">Highest point reported</div>
        </div>

        <div class="field-box">
          <div class="field-label" id="report-lighting-label">LIGHTING</div>
          {#if editing}
            <div class="lighting-toggle" role="group" aria-labelledby="report-lighting-label">
              {#each lightingOptions as option (option.value)}
                <!-- Pressing the chosen answer again clears it: lighting is optional. -->
                <button type="button" aria-pressed={report.lighting === option.value} class:active={report.lighting === option.value}
                  on:click={() => report.lighting = report.lighting === option.value ? null : option.value}>{option.label}</button>
              {/each}
            </div>
          {:else}
            <div class="field-value">{lightingValueLabel(report.lighting)}</div>
          {/if}
          <div class="field-caption muted">Marking on the obstacle</div>
        </div>

        <div class="field-box">
          <div class="field-label">PHOTO</div>
          <PhotoField bind:photos={report.photos} editable={editing} label={report.name} />
        </div>
      </div>

      <div class="ready-card" class:declined={isDeclined}>
        {#if isReady}
          <div class="ready-title">Ready to send for review</div>
          <div class="ready-desc muted">Everything the reviewer needs is filled in.</div>
        {:else if isPending}
          <div class="ready-title">Sent for review</div>
          <div class="ready-desc muted">Sent to the NRL reviewer. You'll be notified about the outcome.</div>
        {:else if isApproved}
          <div class="ready-title">Approved</div>
          <div class="ready-desc muted">Reviewed by {report.reviewer}. This obstacle has been added to the register.</div>
        {:else}
          <div class="ready-title">Declined</div>
          <div class="ready-desc muted">Reviewed by {report.reviewer}. This report was not added to the register.</div>
        {/if}

        <div class="summary-grid">
          <div class="summary-item">
            <div class="summary-label">Geometry drawn on map</div>
            <div class="summary-value muted">{locationCaption}</div>
          </div>
          <div class="summary-item">
            <div class="summary-label">Height above ground</div>
            <div class="summary-value muted">{heightDisplay}</div>
          </div>
          <div class="summary-item">
            <div class="summary-label">Lighting</div>
            <div class="summary-value muted">{lightingSummary(report.lighting)}</div>
          </div>
          <div class="summary-item">
            <div class="summary-label">Description</div>
            <div class="summary-value muted">{descriptionStatus}</div>
          </div>
        </div>
      </div>

      <div class="info-card">
        <div class="section-label">DESCRIPTION AND REPORTER</div>
        <hr class="divider" />

        {#if editing}
          <label class="pilot-label" for="pilot-report">What the pilot reported</label>
          <textarea id="pilot-report" class="pilot-report-input" bind:value={report.pilotReportText}></textarea>
        {:else}
          <div class="pilot-label">What the pilot reported</div>
          <p class="pilot-report">{report.pilotReportText}</p>
        {/if}

        <div class="reporter-row">
          <span class="muted">Reported by</span>
          <span class="reporter-name">{report.reportedByName} · {report.reportedByOrg}</span>
        </div>
      </div>

      <div class="two-col">
        <div class="panel">
          <div class="field-label">LOCATION</div>
          <MiniMap geometry={report.geometry} label={report.name}
            onshowonmap={onshowonmap ? showOnMap : undefined} />
          {#if report.geometry}<div class="map-caption muted">{locationCaption}</div>{/if}
        </div>

        <div class="panel">
          <div class="field-label">ACTIVITY</div>
          <ul class="activity-list">
            <li>
              <span class="dot"></span>
              <div>
                <div class="activity-title">Report created</div>
                <div class="activity-date muted">{report.createdDate}</div>
              </div>
            </li>
            <li>
              <span class="dot"></span>
              <div>
                {#if isReady}
                  <div class="activity-title">Last edited</div>
                  <div class="activity-date muted">{report.secondaryDate}</div>
                {:else if isPending}
                  <div class="activity-title">Sent for review</div>
                  <div class="activity-date muted">{report.secondaryDate}</div>
                {:else}
                  <div class="activity-title">Reviewed by {report.reviewer}</div>
                {/if}
              </div>
            </li>
          </ul>
        </div>
      </div>
    </div>
  </div>

  <!-- Sent reports explain their state in the banner at the top instead. -->
  {#if !isPending}
    <footer class="bottom-bar">
      <div class="actions">
        {#if isReady}
          <button class="button" on:click={toggleEditing}>{editing ? 'Done editing' : 'Edit report'}</button>
          <button class="button button--primary" on:click={sendForReview}>
            <span class="paper-plane">➤</span> Send for Review
          </button>
          <div class="primary-note">
            <div class="note-strong">Goes straight to the NRL reviewer</div>
            <div class="muted">You cannot edit the report after sending</div>
          </div>
        {:else}
          <div class="pending-note">
            <div class="note-strong">{isApproved ? 'Approved' : 'Declined'} by {report.reviewer}</div>
            <div class="muted">This report has been reviewed and closed</div>
          </div>
        {/if}
      </div>
    </footer>
  {/if}

  {#if sentAt}
    <ReportSentDialog {report} {sentAt} onbacktoreports={onback} onclose={closeSentDialog} />
  {/if}
</section>

<style>
  .page {
    position: fixed; inset: 0; z-index: var(--layer-dialog);
    display: flex; flex-direction: column;
    background: var(--color-background-page);
  }

  .top-bar { flex-shrink: 0; background: var(--color-background-raised); padding-top: var(--safe-area-top); }

  .sent-banner { display:flex; align-items:flex-start; gap:var(--space-3); margin-bottom:var(--space-5); padding:var(--space-3) var(--space-4); border:var(--border-default); border-left:var(--border-width-emphasis) solid var(--color-status-info); border-radius:var(--radius-control); background:var(--color-status-info-surface); color:var(--color-text-primary) }
  .sent-banner svg { flex:none; width:var(--icon-size-default); height:var(--icon-size-default); margin-top:var(--space-1); color:var(--color-status-info); stroke:currentColor; stroke-width:var(--icon-stroke-width); stroke-linecap:round; stroke-linejoin:round }
  .sent-banner p { margin:0; font-size:var(--font-size-body); line-height:var(--line-height-body) }
  .sent-banner strong { font-weight:var(--font-weight-semibold) }
  .title-block { margin-bottom: var(--space-6) }
  h1 { margin:0 0 var(--space-1); font-size:var(--reports-title-size); font-weight:var(--font-weight-semibold); letter-spacing:var(--faq-title-tracking); line-height:var(--line-height-tight); color:var(--color-text-primary) }
  .subtitle { color:var(--color-text-secondary); font-size:var(--font-size-body-small) }
  .type-highlight { font-weight:700; color:var(--color-text-primary) }
  .muted { color:var(--color-text-secondary) }

  .scroll-area { flex:1; overflow-y:auto; overscroll-behavior:contain; }
  .safe-area { width:100%; max-width:var(--layout-content-max); margin:0 auto; padding:var(--space-6) var(--map-control-inset-right) var(--space-8) var(--map-control-inset-left); box-sizing:border-box; }

  /* Four cards in a row on large screens, 2 × 2 on iPad and phones. */
  .fields-row { display:grid; grid-template-columns: repeat(2, minmax(0,1fr)); gap:14px; margin-bottom:16px }
  @media (min-width:68.75rem) { .fields-row { grid-template-columns: repeat(4, minmax(0,1fr)) } }
  /* Phone-width cards are too narrow for three answers side by side. */
  @media (max-width:37.499rem) { .lighting-toggle { flex-direction:column } }
  .field-box { border:var(--border-default); border-radius:12px; padding:14px; background:var(--color-background-raised) }
  .field-label { font-size:11px; font-weight:700; letter-spacing:0.06em; color:var(--color-text-secondary); margin-bottom:6px }
  .field-value { font-size:17px; font-weight:700; color:var(--color-text-primary) }
  .field-caption { font-size:12px; margin-top:4px }

  .height-input-wrap { display:flex; align-items:baseline; gap:6px }
  .height-input-wrap input {
    width:100%; border:0; background:transparent; padding:0; margin:0;
    font:inherit; font-size:17px; font-weight:700; color:var(--color-text-primary);
    -moz-appearance:textfield; appearance:textfield;
  }
  .height-input-wrap input::-webkit-outer-spin-button,
  .height-input-wrap input::-webkit-inner-spin-button { -webkit-appearance:none; margin:0 }
  .height-input-wrap input:focus { outline:none }
  .height-input-wrap .unit { color:var(--color-text-secondary); font-weight:600; font-size:14px }


  .lighting-toggle { display:flex; gap:var(--space-1) }
  .lighting-toggle button {
    flex:1; min-width:0; min-height:var(--target-size-min); padding:0; border-radius:10px; border:var(--border-default);
    background:var(--color-background-raised); font-weight:700; font-size:var(--font-size-body-small);
    color:var(--color-text-primary); cursor:pointer;
  }
  .lighting-toggle button.active {
    background:var(--color-action-selected); border-color:var(--color-action-secondary); color:var(--color-action-secondary);
  }

  .ready-card { border:var(--border-default); border-radius:12px; padding:16px; margin-bottom:24px; background:var(--color-background-raised) }
  .ready-card.declined { border-color: var(--color-status-error) }
  .ready-title { font-weight:700; font-size:17px; color:var(--color-text-primary) }
  .ready-desc { font-size:14px; margin-top:2px }

  .summary-grid { display:grid; grid-template-columns: 1fr 1fr; gap:16px 24px; margin-top:16px }
  .summary-label { font-weight:700; font-size:14px; color:var(--color-text-primary) }
  .summary-value { font-size:13px; margin-top:2px }

  .info-card { border:var(--border-default); border-radius:12px; padding:16px; margin-bottom:24px; background:var(--color-background-raised) }

  .section-label { font-size:12px; font-weight:700; letter-spacing:0.06em; color:var(--color-text-secondary); margin-top:8px }
  .divider { border:0; height:1px; background:var(--color-border-default); margin:8px 0 16px }

  .pilot-label { display:block; font-size:14px; color:var(--color-text-primary); margin-bottom:8px }
  .pilot-report { margin:0; font-size:15px; line-height:1.5; color:var(--color-text-primary) }
  .pilot-report-input { width:100%; min-height:70px; resize:vertical; background:var(--color-background-subtle); border:1px solid transparent; border-radius:10px; padding:12px; font:inherit; font-size:15px; box-sizing:border-box }

  .reporter-row { display:flex; justify-content:space-between; align-items:center; font-size:14px; margin:14px 0 0; padding-top:14px; border-top:var(--border-default) }
  .reporter-name { font-weight:700; color:var(--color-text-primary) }

  .two-col { display:grid; grid-template-columns: 1fr 1fr; gap:16px }
  .panel { border:var(--border-default); border-radius:12px; padding:14px; background:var(--color-background-raised) }

  .map-caption { font-size:12px; margin-top:8px }

  .activity-list { list-style:none; margin:8px 0 0; padding:0; display:flex; flex-direction:column; gap:14px }
  .activity-list li { display:flex; align-items:flex-start; gap:10px }
  .dot { width:8px; height:8px; border-radius:50%; background:var(--color-border-strong); margin-top:6px; flex-shrink:0 }
  .activity-title { font-weight:700; font-size:14px; color:var(--color-text-primary) }
  .activity-date { font-size:12px; margin-top:2px }

  .bottom-bar { flex-shrink:0; background:var(--color-background-raised); border-top:var(--border-default); }
  .actions { width:100%; max-width:var(--layout-content-max); margin:0 auto; padding:var(--space-4) var(--map-control-inset-right) max(var(--space-4), var(--safe-area-bottom)) var(--map-control-inset-left); box-sizing:border-box; display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:var(--space-3) var(--space-4) }
  .paper-plane { transform:rotate(45deg); display:inline-block }
  /* Full-width row under both buttons, so the note never shifts them. */
  .primary-note { flex-basis:100%; text-align:center; font-size:12px }
  .pending-note { font-size:12px }
  .note-strong { font-weight:700; color:var(--color-text-primary) }

  @media (max-width:800px) {
    .two-col { grid-template-columns: 1fr }
    .summary-grid { grid-template-columns: 1fr }
  }
</style>
