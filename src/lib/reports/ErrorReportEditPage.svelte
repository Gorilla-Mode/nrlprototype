<script lang="ts">
  import { tick, untrack } from 'svelte';
  import PageHeader from '../components/PageHeader.svelte';
  import StatusBadge from './StatusBadge.svelte';
  import MiniMap from '../map/MiniMap.svelte';
  import LocationEditor from '../map/LocationEditor.svelte';
  import PhotoField from './PhotoField.svelte';
  import {
    describeHeightDifference, describeLightingCorrection, describeMissingRequirement, errorKindChoices, errorReportHeading,
    isErrorReportValid, isValidHeight, toggleErrorKind, type ErrorKind, type ErrorReportAnswers,
  } from '../obstacles/errorReport';
  import { describeMoveFromRegistered } from '../obstacles/position';
  import { coordinateLabel, type ReportGeometry } from './reportGeometry';
  import { lastEditedLabel, type Report } from './reportsData';
  import { reportStore } from './reportStore';
  import { deliverErrorReport, editedErrorReport } from './errorReportRecords';

  /**
   * The edit page for a Ready to send error report (#/reports/{id}/edit): the new obstacle edit
   * page's layout and controls, with the error form's answers. Edits stay in this working copy
   * until Save draft or Send for Review.
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

  // Read once: the page edits its own copy.
  const opened = untrack(() => report);
  const record = opened.errorReport!;
  const obstacle = record.obstacle;
  let errorKinds = $state<ErrorKind[]>([...record.answers.errorKinds]);
  let actualHeightM = $state<number | null>(record.answers.actualHeightM);
  let correctedPosition = $state(record.answers.correctedPosition ? { ...record.answers.correctedPosition } : null);
  let description = $state(record.answers.description);
  let photos = $state([...opened.photos]);

  let answers = $derived<ErrorReportAnswers>({
    errorKinds, actualHeightM: errorKinds.includes('wrong-height') ? actualHeightM : null,
    correctedPosition: errorKinds.includes('wrong-position') ? correctedPosition : null, description,
  });
  const openedAs = JSON.stringify({ answers: record.answers, photos: opened.photos.map(({ id }) => id) });
  $effect(() => {
    ondirtychange?.(JSON.stringify({ answers, photos: photos.map(({ id }) => id) }) !== openedAs);
  });

  const title = errorReportHeading(record);
  let canSend = $derived(isErrorReportValid(answers));
  let missing = $derived(describeMissingRequirement(answers));
  let heightSelected = $derived(errorKinds.includes('wrong-height'));
  let heightMissing = $derived(heightSelected && !isValidHeight(actualHeightM));

  // The reported position when there is one, else the registered one; the map shows both.
  let moved = $derived(errorKinds.includes('wrong-position') ? correctedPosition : null);
  let geometry = $derived<ReportGeometry>({ type: 'Point', coordinates: [(moved ?? obstacle).lng, (moved ?? obstacle).lat] });
  let caption = $derived(moved ? `${describeMoveFromRegistered(obstacle, moved)} · ${coordinateLabel(geometry)}` : undefined);

  let editingLocation = $state(false);
  let editLocationButton = $state<HTMLButtonElement>();
  let returnFocus: HTMLElement | undefined;

  function toggle(kind: ErrorKind, button: HTMLButtonElement) {
    const selecting = !errorKinds.includes(kind);
    errorKinds = toggleErrorKind(errorKinds, kind);
    if (!errorKinds.includes('wrong-position')) correctedPosition = null;
    // As in the error form: choosing Wrong position goes on to where the obstacle is.
    if (kind === 'wrong-position' && selecting) openLocationEditor(button);
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
      if (!errorKinds.includes('wrong-position')) errorKinds = toggleErrorKind(errorKinds, 'wrong-position');
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

  // Complete answers keep it Ready to send; incomplete ones move it back to Drafts.
  function save() {
    const edited = editedErrorReport(opened, ...snapshot());
    if (edited.kind === 'ready') reportStore.markReady(edited.report);
    else reportStore.saveDraft(edited.draft);
    ondone();
  }

  // aria-disabled, not disabled: the button keeps focus and its note says what is missing.
  function send() {
    const edited = editedErrorReport(opened, ...snapshot());
    if (edited.kind !== 'ready') return;
    const ready = reportStore.markReady(edited.report);
    const sent = ready && reportStore.submitReport(ready.id);
    if (!sent) return;
    deliverErrorReport(sent);
    onsend(sent);
  }

  function focusField(event: MouseEvent, id: string) {
    event.preventDefault();
    document.getElementById(id)?.focus();
  }
</script>

<section class="page">
  {#snippet statusTag()}<StatusBadge status="ready" />{/snippet}
  <PageHeader {title} backLabel="Back to Reports" {onback} actions={statusTag} />

  <div class="scroll-area">
    <div class="safe-area">
      <p class="report-meta">
        Reported by {opened.reportedByName}, {opened.reportedByOrg}
        · Last edited <time datetime={opened.updatedAt}>{lastEditedLabel(opened.updatedAt)}</time>
      </p>
      {#if missing}
        <!-- As on the new obstacle edit page: what is missing, as a link to the field. -->
        <div class="needed-box">
          <p class="needed-title">
            {missing}:
            <a class="needed-link" href={heightMissing ? '#error-height' : '#error-kinds'}
              onclick={(event) => focusField(event, heightMissing ? 'error-height' : 'error-kind-first')}>{heightMissing ? 'Actual height' : 'What is wrong'}</a>
          </p>
        </div>
      {/if}

      <div class="fields-row">
        <div class="field-box" role="group" aria-labelledby="error-kinds-label" id="error-kinds">
          <p class="input-label" id="error-kinds-label">What is wrong</p>
          <div class="kind-list">
            {#each errorKindChoices as choice, index (choice.kind)}
              {@const selected = errorKinds.includes(choice.kind)}
              <button type="button" class="kind" class:selected aria-pressed={selected} id={index === 0 ? 'error-kind-first' : undefined}
                onclick={(event) => toggle(choice.kind, event.currentTarget)}>
                <span class="kind-check" aria-hidden="true">{#if selected}<svg viewBox="0 0 24 24" fill="none"><path d="M6.5 12.5 10.5 16.5 17.5 8" /></svg>{/if}</span>
                <span class="kind-text">
                  {choice.label}
                  {#if choice.kind === 'wrong-lighting' && selected}<span class="kind-detail">{describeLightingCorrection(obstacle.lit)}</span>{/if}
                  {#if choice.kind === 'wrong-position' && selected}<span class="kind-detail">{moved ? describeMoveFromRegistered(obstacle, moved) : 'Position not specified'}</span>{/if}
                </span>
              </button>
            {/each}
          </div>
          <p class="field-help">"Does not exist" cannot be combined with the others</p>
        </div>

        <div class="field-box">
          <label class="input-label" for="error-height">Actual height</label>
          {#if heightSelected}
            <div class="height-input-wrap" class:invalid={heightMissing}>
              <input id="error-height" type="number" min="0" inputmode="decimal" placeholder="Enter height"
                aria-invalid={heightMissing || undefined}
                aria-describedby={heightMissing ? 'error-height-help error-height-error' : 'error-height-help'}
                value={actualHeightM ?? ''} oninput={(event) => updateHeight(event.currentTarget.value)} />
              <span class="unit" aria-hidden="true">m</span>
            </div>
            <p class="field-help" id="error-height-help">
              {isValidHeight(actualHeightM) ? describeHeightDifference(actualHeightM, obstacle.heightM) : `Registered ${obstacle.heightM} m`}
            </p>
            {#if heightMissing}
              <p class="field-error" id="error-height-error">
                <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><circle cx="12" cy="12" r="9" /><path d="M12 7.5v5.5M12 16.5v.01" /></svg>
                Required to send
              </p>
            {/if}
          {:else}
            <p class="field-value muted" id="error-height">Not reported</p>
            <p class="field-help">Select Wrong height to correct it</p>
          {/if}
        </div>

        <div class="field-box">
          <p class="input-label">Registered obstacle</p>
          <p class="field-value">{obstacle.type} · {obstacle.heightM} m · {obstacle.lit ? 'Lit' : 'Not lit'}</p>
          <p class="field-help">In NRL today · ID {obstacle.id}</p>
        </div>
      </div>

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

  .scroll-area { flex: 1; overflow-y: auto; overscroll-behavior: contain; scroll-padding-block: var(--space-6); }
  .safe-area {
    display: flex; flex-direction: column; min-height: 100%; width: 100%;
    max-width: calc(var(--page-content-max) + 2 * var(--page-gutter)); margin: 0 auto; box-sizing: border-box;
    padding: var(--page-content-top) max(var(--page-gutter), var(--safe-area-right)) var(--space-8) max(var(--page-gutter), var(--safe-area-left));
  }
  .safe-area > * { flex: none; }
  .report-meta { margin: 0 0 var(--space-4); color: var(--color-text-secondary); font-size: var(--font-size-body-small); overflow-wrap: anywhere; }

  .needed-box { border: var(--border-default); border-radius: var(--radius-card); padding: var(--space-1) 16px; margin-bottom: 20px; background: var(--color-background-raised); }
  .needed-title { margin: 0; font-weight: 700; color: var(--color-text-primary); line-height: var(--line-height-body); }
  .needed-link { display: inline-flex; align-items: center; min-height: var(--target-size-min); color: var(--color-action-secondary); font-weight: var(--font-weight-semibold); }

  /* Three cards in one row; stacked on phones. */
  .fields-row { display: grid; grid-template-columns: minmax(0, 1fr); gap: 14px; margin-bottom: 16px; }
  @media (min-width: 37.5rem) { .fields-row { grid-template-columns: repeat(3, minmax(0, 1fr)); } }
  .field-box { min-width: 0; overflow-wrap: anywhere; border: var(--border-default); border-radius: var(--radius-card); padding: 14px; background: var(--color-background-raised); }
  .input-label { display: block; margin: 0 0 var(--space-2); font-size: var(--font-size-body); font-weight: var(--font-weight-semibold); color: var(--color-text-primary); }
  .field-value { margin: 0; font-size: var(--font-size-body); color: var(--color-text-primary); }
  .field-value.muted { color: var(--color-text-secondary); }
  .field-help { margin: var(--space-2) 0 0; font-size: var(--font-size-body-small); color: var(--color-text-secondary); }
  .field-error { display: flex; align-items: center; gap: var(--space-1); margin: var(--space-1) 0 0; font-size: var(--font-size-body-small); color: var(--color-status-error); }
  .field-error svg { flex: none; width: var(--icon-size-small); height: var(--icon-size-small); stroke: currentColor; stroke-width: var(--icon-stroke-width); stroke-linecap: round; stroke-linejoin: round; }

  /* What is wrong: one 44 px toggle per answer; the check and aria-pressed say it is chosen, not colour alone. */
  .kind-list { display: flex; flex-direction: column; gap: var(--space-1); }
  .kind {
    display: flex; align-items: center; gap: var(--space-2); min-height: var(--target-size-min); padding: var(--space-1) var(--space-3);
    border: var(--border-strong); border-radius: var(--radius-control); background: var(--color-background-raised);
    color: var(--color-text-primary); font: inherit; font-size: var(--font-size-body-small); text-align: left; cursor: pointer;
  }
  .kind:hover { background: var(--color-map-control-hover); }
  .kind.selected { border-color: var(--color-action-secondary); background: var(--color-action-selected); }
  .kind-check {
    flex: none; display: grid; place-items: center; width: var(--icon-size-default); height: var(--icon-size-default);
    border: var(--border-strong); border-radius: var(--radius-small); background: var(--color-background-raised); color: var(--color-action-secondary);
  }
  .kind.selected .kind-check { border-color: var(--color-action-secondary); }
  .kind-check svg { width: var(--icon-size-small); height: var(--icon-size-small); stroke: currentColor; stroke-width: calc(var(--icon-stroke-width) + 0.5); stroke-linecap: round; stroke-linejoin: round; }
  .kind-text { display: flex; flex-direction: column; min-width: 0; font-weight: var(--font-weight-semibold); }
  .kind-detail { color: var(--color-text-secondary); font-size: var(--font-size-caption); font-weight: var(--font-weight-regular); }

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
