<script lang="ts">
  import type { Draft } from './types';
  import { heightInMeters, formatHeightFromMeters, formatToday, lightingOptions, missingDraftFields } from './types';
  import MiniMap from '../map/MiniMap.svelte';
  import PhotoField from '../reports/PhotoField.svelte';
  import Dropdown from '../reports/Dropdown.svelte';
  import { obstacleTypeChoices, obstacleTypeLabel } from '../reporting/obstacle';
  import { geometryCameraTarget, geometryKind, locationCaption as captionFor, type GeometryCameraTarget } from '../reports/reportGeometry';
  import { drafts } from './mockData';
  import { reports } from '../reports/reportsData';

  const typeOptions = obstacleTypeChoices.map(({ type, label }) => ({ value: type, label }));

  export let draft: Draft;
  export let onBack: () => void = () => {};
  export let onSend: () => void = () => {};
  export let onShowOnMap: ((target: GeometryCameraTarget) => void) | undefined = undefined;

  function updateHeight(raw: string) {
    if (raw.trim() === '') {
      draft.heightAboveGround = 'Not set';
      return;
    }
    const meters = Number(raw);
    draft.heightAboveGround = formatHeightFromMeters(Number.isNaN(meters) ? null : meters);
  }

  function saveDraft() {
    draft.editedDate = formatToday();
    onBack();
  }

  function sendReport() {
    if (!canSend) return;
    const index = drafts.findIndex(d => d.id === draft.id);
    if (index !== -1) drafts.splice(index, 1);
    const meters = heightInMeters(draft.heightAboveGround) ?? 0;
    reports.push({
      id: draft.id,
      name: draft.title,
      obstacleType: draft.category,
      heightFeet: Math.round(meters * 3.28084),
      heightMeters: meters,
      status: 'pending',
      createdDate: draft.createdDate,
      secondaryDate: formatToday(),
      lighting: draft.lighting,
      pilotReportText: draft.pilotReportText,
      reportedByName: draft.reportedByName,
      reportedByOrg: draft.reportedByOrg,
      geometry: draft.geometry,
      photos: draft.photos
    });
    onSend();
  }

  $: geometryType = geometryKind(draft.geometry);
  $: typeLabel = obstacleTypeLabel(draft.category);

  function showOnMap() {
    if (draft.geometry) onShowOnMap?.(geometryCameraTarget(draft.geometry));
  }

  $: missingFields = missingDraftFields(draft);

  $: canSend = missingFields.length === 0;

  $: locationCaption = captionFor(draft.geometry);
</script>

<section class="page">
  <header class="top-bar reports-topbar">
    <div class="reports-header-row reports-topbar-content">
      <button class="reports-back" type="button" aria-label="Back to Reports" on:click={onBack}>
        <svg viewBox="0 0 8 14" fill="none" aria-hidden="true"><path d="M7 1 1 7l6 6" /></svg>
        <span>Reports</span>
      </button>
      <span class="reports-status-badge" data-status="draft">Draft</span>
    </div>
  </header>

  <div class="scroll-area">
    <div class="safe-area">
      <div class="title-block">
        <h1>{draft.title}</h1>
        <div class="subtitle">{#if geometryType}{geometryType} ·{' '}{/if}<strong class="type-highlight">{typeLabel}</strong> · {draft.value}</div>
      </div>
      {#if !canSend}
        <div class="needed-box">
          <div class="needed-title">{missingFields.length} {missingFields.length === 1 ? 'field' : 'fields'} still needed</div>
          <div class="needed-desc muted">Fill in the fields marked in red below, then send.</div>
        </div>
      {/if}

      <div class="fields-row">
        <div class="field-box">
          <div class="field-label" id="draft-type-label">TYPE</div>
          <div class="field-value">
            <Dropdown id="draft-type" labelledby="draft-type-label" options={typeOptions} bind:value={draft.category} />
          </div>
          <div class="field-caption muted">{geometryType ?? 'No'} geometry</div>
        </div>

        <div class="field-box" class:missing={draft.heightAboveGround === 'Not set'}>
          <div class="field-label">HEIGHT ABOVE GROUND</div>
          <div class="field-value height-input-wrap">
            <input
              type="number"
              min="0"
              inputmode="decimal"
              placeholder="Enter height"
              value={heightInMeters(draft.heightAboveGround) ?? ''}
              on:input={(e) => updateHeight(e.currentTarget.value)}
            />
            <span class="unit">m</span>
          </div>
          <div class="field-caption muted">Highest point reported</div>
        </div>

        <div class="field-box">
          <div class="field-label" id="draft-lighting-label">LIGHTING</div>
          <div class="lighting-toggle" role="group" aria-labelledby="draft-lighting-label">
            {#each lightingOptions as option (option.value)}
              <!-- Pressing the chosen answer again clears it: lighting is optional. -->
              <button type="button" aria-pressed={draft.lighting === option.value} class:active={draft.lighting === option.value}
                on:click={() => draft.lighting = draft.lighting === option.value ? null : option.value}>{option.label}</button>
            {/each}
          </div>
          <div class="field-caption muted">Marking on the obstacle</div>
        </div>

        <div class="field-box">
          <div class="field-label">PHOTO</div>
          <PhotoField bind:photos={draft.photos} editable={true} label={draft.title} />
        </div>
      </div>

      <div class="info-card">
        <div class="section-label">DESCRIPTION AND REPORTER</div>
        <hr class="divider" />

        <label class="pilot-label" for="pilot-report">What the pilot reported</label>
        <textarea id="pilot-report" class="pilot-report" bind:value={draft.pilotReportText}></textarea>

        <div class="reporter-row">
          <span class="muted">Reported by</span>
          <span class="reporter-name">{draft.reportedByName} · {draft.reportedByOrg}</span>
        </div>
      </div>

      <div class="two-col">
        <div class="panel">
          <div class="field-label">LOCATION</div>
          <MiniMap geometry={draft.geometry} label={draft.title}
            onshowonmap={onShowOnMap ? showOnMap : undefined} />
          {#if draft.geometry}<div class="map-caption muted">{locationCaption}</div>{/if}
        </div>

        <div class="panel">
          <div class="field-label">ACTIVITY</div>
          <ul class="activity-list">
            <li>
              <span class="dot"></span>
              <div>
                <div class="activity-title">Report created</div>
                <div class="activity-date muted">{draft.createdDate}</div>
              </div>
            </li>
            <li>
              <span class="dot"></span>
              <div>
                <div class="activity-title">Last edited</div>
                <div class="activity-date muted">{draft.editedDate}</div>
              </div>
            </li>
          </ul>
        </div>
      </div>
    </div>
  </div>

  <footer class="bottom-bar">
    <div class="actions">
      <button class="button" on:click={saveDraft}>Save draft</button>
      <button class="button button--primary" disabled={!canSend} on:click={sendReport}>
        <span class="paper-plane">➤</span> Send for Review
      </button>
      <div class="primary-note">
        <div class="note-strong">Goes straight to the NRL reviewer</div>
        <div class="muted">You cannot edit the report after sending</div>
      </div>
    </div>
  </footer>
</section>

<style>
  .page {
    position: fixed; inset: 0; z-index: var(--layer-dialog);
    display: flex; flex-direction: column;
    background: var(--color-background-page);
  }

  .top-bar { flex-shrink: 0; background: var(--color-background-raised); padding-top: var(--safe-area-top); }

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
  .field-box.missing { border-color: var(--color-status-error) }
  .field-label { font-size:11px; font-weight:700; letter-spacing:0.06em; color:var(--color-text-secondary); margin-bottom:6px }
  .field-value { font-size:17px; font-weight:700; color:var(--color-text-primary); display:flex; align-items:center; justify-content:space-between }
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

  .needed-box { border:var(--border-default); border-radius:12px; padding:14px 16px; margin-bottom:20px; background:var(--color-background-raised) }
  .needed-title { font-weight:700; color:var(--color-text-primary); margin-bottom:4px }
  .needed-desc { font-size:14px }

  .info-card { border:var(--border-default); border-radius:12px; padding:16px; margin-bottom:24px; background:var(--color-background-raised) }

  .section-label { font-size:12px; font-weight:700; letter-spacing:0.06em; color:var(--color-text-secondary); margin-top:8px }
  .divider { border:0; height:1px; background:var(--color-border-default); margin:8px 0 16px }

  .pilot-label { display:block; font-size:14px; color:var(--color-text-primary); margin-bottom:8px }
  .pilot-report { width:100%; min-height:70px; resize:vertical; background:var(--color-background-subtle); border:1px solid transparent; border-radius:10px; padding:12px; font:inherit; box-sizing:border-box }

  .reporter-row { display:flex; justify-content:space-between; align-items:center; font-size:14px; margin:14px 0 0 }
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
  .note-strong { font-weight:700; color:var(--color-text-primary) }

  @media (max-width:800px) {
    .two-col { grid-template-columns: 1fr }
  }
</style>
