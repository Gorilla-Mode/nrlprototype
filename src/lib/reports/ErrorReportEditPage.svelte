<script lang="ts">
  import { tick, untrack } from 'svelte';
  import LargeTitleHeader from '../components/LargeTitleHeader.svelte';
  import StatusBadge from './StatusBadge.svelte';
  import MiniMap from '../map/MiniMap.svelte';
  import LocationEditor from '../map/LocationEditor.svelte';
  import PhotoField from './PhotoField.svelte';
  import Dropdown from './Dropdown.svelte';
  import {
    describeEditRequirement, errorReportHeading, formatCoordinates, isValidHeight, reportedLighting,
    type ErrorKind, type ErrorReportAnswers,
  } from '../obstacles/errorReport';
  import { describeMoveFromRegistered, describeOffsetFromRegistered } from '../obstacles/position';
  import { obstacleTypeChoices, type ObstacleType } from '../reporting/obstacle';
  import type { Lighting } from '../drafts/types';
  import { coordinateLabel, type ReportGeometry } from './reportGeometry';
  import { lastEditedLabel, type Report } from './reportsData';
  import { reportStore } from './reportStore';
  import { deliverErrorReport, editedErrorReport } from './errorReportRecords';

  /**
   * The edit page for a Ready to send error report (#/reports/{id}/edit): the new obstacle edit
   * page's header, description, location and footer, with one "What is wrong?" card. Edits stay
   * in this working copy until Save draft or Send for Review.
   */
  let { report, onback, ondone, onsend, ondirtychange }: {
    report: Report;
    /** Back arrow: App asks about unsaved changes first. */
    onback: () => void;
    /** After Save draft: leaves without asking, as nothing is unsaved. */
    ondone: () => void;
    onsend: (sent: Report) => void;
    ondirtychange?: (dirty: boolean) => void;
  } = $props();

  const typeOptions = obstacleTypeChoices.map(({ type, label }) => ({ value: type, label }));
  const lightingOptions: readonly { value: Lighting; label: string }[] = [
    { value: 'yes', label: 'Lit' }, { value: 'no', label: 'Not lit' }, { value: 'unknown', label: 'Unknown' },
  ];

  // Read once: the page edits its own copy.
  const opened = untrack(() => report);
  const record = opened.errorReport!;
  const obstacle = record.obstacle;
  const initial = record.answers;

  /** The rows, in table order, and the answer each one reports. */
  type Field = 'type' | 'height' | 'lighting' | 'position';
  const fieldKinds: Record<Field, ErrorKind> = { type: 'wrong-type', height: 'wrong-height', lighting: 'wrong-lighting', position: 'wrong-position' };
  const fields: readonly Field[] = ['type', 'height', 'lighting', 'position'];

  // "Does not exist" hides the rows but keeps them: switching back restores every value.
  let mode = $state<'wrong' | 'gone'>(initial.errorKinds.includes('does-not-exist') ? 'gone' : 'wrong');
  let checked = $state<Record<Field, boolean>>({
    type: initial.errorKinds.includes('wrong-type'), height: initial.errorKinds.includes('wrong-height'),
    lighting: initial.errorKinds.includes('wrong-lighting'), position: initial.errorKinds.includes('wrong-position'),
  });
  let actualType = $state<ObstacleType | ''>(initial.actualType ?? '');
  let actualHeightM = $state<number | null>(initial.actualHeightM);
  // Prefilled with the opposite of the registered lighting, as the map form reports it.
  let actualLighting = $state<Lighting>(reportedLighting(obstacle, initial));
  let correctedPosition = $state(initial.correctedPosition ? { ...initial.correctedPosition } : null);
  let description = $state(initial.description);
  let photos = $state([...opened.photos]);

  // Only what is shown is reported: "Does not exist" alone, or the checked rows and their values.
  let answers = $derived<ErrorReportAnswers>(mode === 'gone'
    ? { errorKinds: ['does-not-exist'], actualHeightM: null, correctedPosition: null, actualType: null, actualLighting: null, description }
    : {
      errorKinds: fields.filter((field) => checked[field]).map((field) => fieldKinds[field]),
      actualType: checked.type && actualType !== '' ? actualType : null,
      actualHeightM: checked.height ? actualHeightM : null,
      actualLighting: checked.lighting ? actualLighting : null,
      correctedPosition: checked.position ? correctedPosition : null,
      description,
    });
  const key = () => JSON.stringify({ answers, photos: photos.map(({ id }) => id) });
  const openedAs = untrack(key);
  $effect(() => {
    ondirtychange?.(key() !== openedAs);
  });

  const title = errorReportHeading(record);
  let missing = $derived(describeEditRequirement(answers));
  let canSend = $derived(missing === null);
  let noneChecked = $derived(mode === 'wrong' && !fields.some((field) => checked[field]));
  let typeMissing = $derived(mode === 'wrong' && checked.type && actualType === '');
  let heightMissing = $derived(mode === 'wrong' && checked.height && !isValidHeight(actualHeightM));

  // "+4 m vs registered", from the typed height.
  let heightDifference = $derived.by(() => {
    if (!isValidHeight(actualHeightM)) return `Registered ${obstacle.heightM} m`;
    const difference = Math.round((actualHeightM - obstacle.heightM) * 10) / 10;
    return `${difference > 0 ? '+' : ''}${difference} m vs registered`;
  });
  const registeredLine = `Registered in NRL: ${obstacle.type} · ${obstacle.heightM} m · ${obstacle.lit ? 'lit' : 'not lit'} · ID ${obstacle.id}`;

  // The reported position when there is one, else the registered one; the map shows both.
  let moved = $derived(answers.errorKinds.includes('wrong-position') ? answers.correctedPosition ?? null : null);
  let geometry = $derived<ReportGeometry>({ type: 'Point', coordinates: [(moved ?? obstacle).lng, (moved ?? obstacle).lat] });
  let caption = $derived(moved ? `${describeMoveFromRegistered(obstacle, moved)} · ${coordinateLabel(geometry)}` : undefined);

  let editingLocation = $state(false);
  let editLocationButton = $state<HTMLButtonElement>();
  let returnFocus: HTMLElement | undefined;

  // Checking Position without a reported one goes on to the map, as in the error form.
  function positionChanged(event: Event & { currentTarget: HTMLInputElement }) {
    if (event.currentTarget.checked && !correctedPosition) openLocationEditor(event.currentTarget);
  }

  function openLocationEditor(from?: HTMLElement) {
    returnFocus = from ?? editLocationButton;
    editingLocation = true;
  }

  async function closeLocationEditor() {
    editingLocation = false;
    await tick();
    returnFocus?.focus({ preventScroll: true });
  }

  // A point only: the reported position, which also marks the position as wrong.
  function useLocation(next: ReportGeometry) {
    if (next.type === 'Point') {
      const [lng, lat] = next.coordinates;
      correctedPosition = { lat, lng };
      mode = 'wrong';
      checked.position = true;
    }
    void closeLocationEditor();
  }

  function updateHeight(raw: string) {
    const meters = Number(raw);
    actualHeightM = raw.trim() === '' || Number.isNaN(meters) ? null : meters;
  }

  function autosize(field: HTMLTextAreaElement) {
    const fit = () => {
      field.style.height = 'auto';
      field.style.height = `${field.scrollHeight + field.offsetHeight - field.clientHeight}px`;
    };
    fit();
    field.addEventListener('input', fit);
    return { destroy: () => field.removeEventListener('input', fit) };
  }

  // Plain copies: state proxies cannot be cloned or stored.
  const snapshot = () => [$state.snapshot(answers), $state.snapshot(photos)] as const;

  // Save draft always works: complete answers stay Ready to send, incomplete ones move to Drafts.
  function save() {
    const edited = editedErrorReport(opened, ...snapshot());
    if (edited.kind === 'ready') reportStore.markReady(edited.report);
    else reportStore.saveDraft(edited.draft);
    ondone();
  }

  // aria-disabled, not disabled: the button keeps focus and its note says what is missing.
  function send() {
    if (!canSend) return;
    const edited = editedErrorReport(opened, ...snapshot());
    if (edited.kind !== 'ready') return;
    const ready = reportStore.markReady(edited.report);
    const sent = ready && reportStore.submitReport(ready.id);
    if (!sent) return;
    deliverErrorReport(sent);
    onsend(sent);
  }
</script>

<section class="page">
  {#snippet statusTag()}<StatusBadge status="ready" />{/snippet}
  <div class="scroll-area">
    <!-- The shared large-title header: "‹ Report" back to the report's page, the tag, the title and meta line. -->
    <LargeTitleHeader {title} backText="Report" backLabel="Back to report" {onback} actions={statusTag}>
      <p class="report-meta">
        Reported by {opened.reportedByName}, {opened.reportedByOrg}
        · Last edited <time datetime={opened.updatedAt}>{lastEditedLabel(opened.updatedAt)}</time>
      </p>
    </LargeTitleHeader>
    <div class="safe-area">
      <section class="info-card" aria-labelledby="error-what-heading">
        <h2 class="section-heading" id="error-what-heading">What is wrong?</h2>
        <p class="registered-line">{registeredLine}</p>
        <hr class="divider" />

        <div class="reports-segmented mode-switch" role="group" aria-labelledby="error-what-heading">
          <button type="button" class="reports-segment" aria-pressed={mode === 'wrong'} onclick={() => { mode = 'wrong'; }}>Information is wrong</button>
          <button type="button" class="reports-segment" aria-pressed={mode === 'gone'} onclick={() => { mode = 'gone'; }}>Does not exist</button>
        </div>

        {#if mode === 'wrong'}
          <table class="reported-table what-table">
            <thead>
              <tr>
                <th scope="col" class="check-col"><span class="sr-only">Wrong</span></th>
                <th scope="col" class="reported-field">Field</th><th scope="col">In NRL today</th><th scope="col">Reported</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td class="check-col"><label class="check-target"><input type="checkbox" id="error-check-type" bind:checked={checked.type} /></label></td>
                <th scope="row"><label class="field-name" for="error-check-type">Type</label></th>
                <td class="current">{obstacle.type}</td>
                <td class="reported">
                  {#if checked.type}
                    <span class="sr-only" id="error-type-label">Reported type</span>
                    <Dropdown id="error-type" labelledby="error-type-label" options={typeOptions} bind:value={actualType} placeholder="Select type"
                      invalid={typeMissing} describedby={typeMissing ? 'error-type-error' : undefined} />
                    {#if typeMissing}<span class="field-error" id="error-type-error">Required to send</span>{/if}
                  {:else}<span class="current">Correct</span>{/if}
                </td>
              </tr>
              <tr>
                <td class="check-col"><label class="check-target"><input type="checkbox" id="error-check-height" bind:checked={checked.height} /></label></td>
                <th scope="row"><label class="field-name" for="error-check-height">Height</label></th>
                <td class="current">{obstacle.heightM} m</td>
                <td class="reported">
                  {#if checked.height}
                    <div class="height-row">
                      <div class="height-input-wrap" class:invalid={heightMissing}>
                        <input id="error-height" type="number" min="0" inputmode="decimal" placeholder="Height" aria-label="Reported height"
                          aria-invalid={heightMissing || undefined} aria-describedby="error-height-help"
                          value={actualHeightM ?? ''} oninput={(event) => updateHeight(event.currentTarget.value)} />
                        <span class="unit" aria-hidden="true">m</span>
                      </div>
                      <span class="reported-note" id="error-height-help">{heightMissing ? 'Required to send' : heightDifference}</span>
                    </div>
                  {:else}<span class="current">Correct</span>{/if}
                </td>
              </tr>
              <tr>
                <td class="check-col"><label class="check-target"><input type="checkbox" id="error-check-lighting" bind:checked={checked.lighting} /></label></td>
                <th scope="row"><label class="field-name" for="error-check-lighting">Lighting</label></th>
                <td class="current">{obstacle.lit ? 'Lit' : 'Not lit'}</td>
                <td class="reported">
                  {#if checked.lighting}
                    <span class="sr-only" id="error-lighting-label">Reported lighting</span>
                    <Dropdown id="error-lighting" labelledby="error-lighting-label" options={lightingOptions} bind:value={actualLighting} />
                  {:else}<span class="current">Correct</span>{/if}
                </td>
              </tr>
              <tr>
                <td class="check-col"><label class="check-target"><input type="checkbox" id="error-check-position" bind:checked={checked.position} onchange={positionChanged} /></label></td>
                <th scope="row"><label class="field-name" for="error-check-position">Position</label></th>
                <td class="current">{formatCoordinates(obstacle)}</td>
                <td class="reported">
                  {#if checked.position}
                    <strong>{correctedPosition ? formatCoordinates(correctedPosition) : 'Not set'}</strong>
                    <span class="reported-note">
                      {#if correctedPosition}{describeOffsetFromRegistered(obstacle, correctedPosition)} ·{' '}{/if}<button type="button" class="card-cta-link map-link"
                        onclick={(event) => openLocationEditor(event.currentTarget)}>Edit in map</button>
                    </span>
                  {:else}<span class="current">Correct</span>{/if}
                </td>
              </tr>
            </tbody>
          </table>
          {#if noneChecked}<p class="field-error table-error" role="status">Select at least one field that is wrong</p>{/if}
        {:else}
          <table class="reported-table what-table">
            <thead>
              <tr><th scope="col" class="reported-field">Field</th><th scope="col">In NRL today</th><th scope="col">Reported</th></tr>
            </thead>
            <tbody>
              <tr>
                <th scope="row">Obstacle</th>
                <td class="current"><s>{obstacle.type} · {obstacle.heightM} m · ID {obstacle.id}</s></td>
                <td class="reported"><strong>Does not exist</strong></td>
              </tr>
            </tbody>
          </table>
          <p class="reported-note">The obstacle will be reported as removed. Height, lighting and position aren't needed.</p>
        {/if}
      </section>

      <section class="info-card" aria-labelledby="error-description-heading">
        <h2 class="section-heading" id="error-description-heading">Description and photo (optional)</h2>
        <hr class="divider" />
        <label class="pilot-label" for="error-description">What the pilot reported</label>
        <textarea id="error-description" class="pilot-report" rows="3" use:autosize bind:value={description}></textarea>
        <div class="photo-row">
          <PhotoField bind:photos editable={true} label={title} showOptional={false} />
        </div>
      </section>

      <section class="location-panel panel" aria-labelledby="error-location-heading">
        <div class="location-heading">
          <h2 class="section-heading" id="error-location-heading">Location</h2>
          <button type="button" class="card-cta-link edit-location" bind:this={editLocationButton} onclick={() => openLocationEditor()}>Edit location</button>
        </div>
        <!-- The reported position beside the registered one, and how far it moves. -->
        <MiniMap {geometry} label={title} registered={moved ? { lat: obstacle.lat, lng: obstacle.lng } : null} {caption}
          onedit={() => openLocationEditor()} />
      </section>
    </div>
  </div>

  <footer class="bottom-bar">
    <div class="actions">
      <button type="button" class="ds-button" data-variant="secondary" data-color="neutral" onclick={save}>Save draft</button>
      <div class="send-group">
        <div class="send-note" id="error-send-note">
          {#if canSend}
            <div class="note-strong">Goes straight to the NRL reviewer</div>
            <div class="muted">You cannot edit the report after sending</div>
          {:else}
            <div class="note-strong">{missing}</div>
          {/if}
        </div>
        <button type="button" class="ds-button send-button" data-variant="primary" data-color="brand1" aria-describedby="error-send-note"
          aria-disabled={canSend ? undefined : 'true'} onclick={send}>
          <span class="paper-plane" aria-hidden="true">➤</span> Send for Review
        </button>
      </div>
    </div>
  </footer>
  {#if editingLocation}
    <LocationEditor {geometry} onuse={useLocation} oncancel={closeLocationEditor} pointOnly />
  {/if}
</section>

<style>
  /* The new obstacle edit page's layout and styles (DraftDetailPage). */
  .page {
    position: fixed; inset: 0; z-index: var(--layer-dialog);
    display: flex; flex-direction: column;
    background: var(--color-background-page);
  }
  .muted { color: var(--color-text-secondary); }

  .scroll-area { flex: 1; overflow-y: auto; overscroll-behavior: contain; scroll-padding-block: calc(var(--large-title-bar-height) + var(--space-6)) var(--space-6); /* clear of the sticky bar */ }
  .safe-area {
    display: flex; flex-direction: column; min-height: 100%; width: 100%;
    max-width: calc(var(--page-content-max) + 2 * var(--page-gutter)); margin: 0 auto; box-sizing: border-box;
    padding: var(--page-content-top) max(var(--page-gutter), var(--safe-area-right)) var(--space-8) max(var(--page-gutter), var(--safe-area-left));
  }
  .safe-area > * { flex: none; }
  .report-meta { margin: var(--space-1) 0 0; color: var(--color-text-secondary); font-size: var(--font-size-body-small); overflow-wrap: anywhere; }

  /* What is wrong?: the registered obstacle, the mode, then the reported table (stylesheet .reported-table). */
  .registered-line { margin: var(--space-1) 0 0; color: var(--color-text-secondary); font-size: var(--font-size-body-small); overflow-wrap: anywhere; }
  .mode-switch { margin-bottom: var(--space-4); }
  .mode-switch .reports-segment { flex: 1; }
  .what-table { margin-bottom: var(--space-2); }
  .what-table td, .what-table th { vertical-align: middle; }
  .what-table thead th { vertical-align: bottom; }
  .what-table .check-col { width: var(--target-size-min); padding-right: 0; }
  /* Phones: four columns are tight, so the Field column takes only what it needs and words wrap whole. */
  @media (max-width: 37.499rem) {
    .what-table thead th.reported-field { width: auto; }
    .what-table th, .what-table td { overflow-wrap: normal; }
  }
  /* The checkbox's 44 px target; the field name beside it is a second label for the same box. */
  .check-target { display: grid; place-items: center; width: var(--target-size-min); height: var(--target-size-min); margin-inline-start: calc(-1 * var(--space-3)); cursor: pointer; }
  .check-target input { width: var(--icon-size-default); height: var(--icon-size-default); margin: 0; accent-color: var(--color-action-secondary); cursor: pointer; }
  .field-name { display: flex; align-items: center; min-height: var(--target-size-min); cursor: pointer; }
  .height-row { display: flex; flex-wrap: wrap; align-items: center; gap: var(--space-1) var(--space-3); }
  .height-row .height-input-wrap { width: var(--sent-field-column-width); }
  .height-row .reported-note { margin-top: 0; }
  .map-link { display: inline-flex; align-items: center; min-height: var(--target-size-min); margin-block: calc(-1 * var(--space-3)); padding: 0; border: 0; background: none; font-size: inherit; cursor: pointer; }
  .table-error { margin: 0 0 var(--space-2); }
  .field-error { display: flex; align-items: center; gap: var(--space-1); margin-top: var(--space-1); font-size: var(--font-size-body-small); color: var(--color-status-error); }

  .height-input-wrap {
    display: flex; align-items: center; gap: var(--space-2); box-sizing: border-box;
    height: var(--control-height-default); padding: 0 var(--space-3);
    border: var(--border-strong); border-radius: var(--radius-control); background: var(--color-background-raised);
  }
  .height-input-wrap.invalid { border-color: var(--color-status-error); }
  .height-input-wrap:focus-within { outline: var(--border-width-emphasis) solid var(--color-focus-ring); outline-offset: var(--space-1); }
  .height-input-wrap input {
    width: 100%; border: 0; background: transparent; padding: 0; margin: 0;
    font: inherit; font-size: var(--font-size-body); color: var(--color-text-primary);
    -moz-appearance: textfield; appearance: textfield;
  }
  .height-input-wrap input::-webkit-outer-spin-button,
  .height-input-wrap input::-webkit-inner-spin-button { -webkit-appearance: none; margin: 0; }
  .height-input-wrap input:focus { outline: none; }
  .height-input-wrap input::placeholder { color: var(--color-text-secondary); opacity: 1; }
  .height-input-wrap .unit { flex: none; color: var(--color-text-secondary); font-size: var(--font-size-body); }

  .info-card { border: var(--border-default); border-radius: var(--radius-card); padding: 16px; margin-bottom: 24px; background: var(--color-background-raised); }
  .section-heading { margin: 0; font-size: var(--font-size-heading-small); font-weight: var(--font-weight-semibold); line-height: var(--line-height-tight); color: var(--color-text-primary); }
  .divider { border: 0; height: 1px; background: var(--color-border-default); margin: 8px 0 16px; }
  .pilot-label { display: block; font-size: 14px; color: var(--color-text-primary); margin-bottom: 8px; }
  .pilot-report {
    width: 100%; resize: none; overflow: hidden; box-sizing: border-box; padding: 12px;
    border: var(--border-strong); border-radius: var(--radius-control); background: var(--color-background-raised);
    font: inherit; line-height: var(--line-height-body); color: var(--color-text-primary);
  }
  .photo-row { margin-top: var(--space-4); }

  .panel { border: var(--border-default); border-radius: var(--radius-card); padding: 14px; background: var(--color-background-raised); }
  .location-panel { margin-bottom: var(--space-4); }
  .location-heading { display: flex; align-items: center; justify-content: space-between; gap: var(--space-2); }
  .edit-location { min-height: var(--target-size-min); margin-block: calc(-1 * var(--space-3)); padding: 0; border: 0; background: none; font-size: var(--font-size-body-small); cursor: pointer; }

  .bottom-bar { flex-shrink: 0; background: var(--color-background-raised); border-top: var(--border-default); }
  .actions {
    width: 100%; max-width: calc(var(--page-content-max) + 2 * var(--page-gutter)); margin: 0 auto; box-sizing: border-box;
    padding: var(--space-4) max(var(--page-gutter), var(--safe-area-right)) max(var(--space-4), var(--safe-area-bottom)) max(var(--page-gutter), var(--safe-area-left));
    display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: var(--space-3) var(--space-4);
  }
  .paper-plane { transform: rotate(45deg); display: inline-block; }
  .send-group { display: flex; align-items: center; justify-content: flex-end; flex-wrap: wrap; gap: var(--space-2) var(--space-4); margin-left: auto; }
  .send-note { text-align: right; font-size: 12px; }
  .note-strong { font-weight: 700; color: var(--color-text-primary); }
  .bottom-bar .ds-button, .photo-row :global(button) { min-height: var(--target-size-min); }
  .send-button[aria-disabled='true'] { opacity: var(--opacity-disabled); cursor: not-allowed; }
</style>
