<script lang="ts">
  import { tick } from 'svelte';
  import type { Draft } from './types';
  import { draftType, heightInMeters, formatHeightFromMeters, missingDraftFields, type Lighting } from './types';
  import type { ObstacleType } from '../reporting/obstacle';
  import MiniMap from '../map/MiniMap.svelte';
  import PageHeader from '../components/PageHeader.svelte';
  import StatusBadge from '../reports/StatusBadge.svelte';
  import LocationEditor from '../map/LocationEditor.svelte';
  import PhotoField from '../reports/PhotoField.svelte';
  import Dropdown from '../reports/Dropdown.svelte';
  import { obstacleGeometryChoices, obstacleTypeChoices } from '../reporting/obstacle';
  import { coordinateLabel, type ReportGeometry } from '../reports/reportGeometry';
  import { draftToReport, reportStore } from '../reports/reportStore';
  import { formatShortDate, obstacleHeading, type Report } from '../reports/reportsData';

  const typeOptions = obstacleTypeChoices.map(({ type, label }) => ({ value: type, label }));
  // Same stored values as before; only the labels say what each answer means.
  const lightingChoices: readonly { value: Lighting; label: string }[] = [
    { value: 'yes', label: 'Yes, lit' },
    { value: 'no', label: 'No, not lit' },
    { value: 'unknown', label: 'Unknown' },
  ];

  /** A working copy; edits reach the report store only through Save draft or Send. */
  export let draft: Draft;
  /** The tag in the header: a draft, or a Ready to send report opened for editing. */
  export let status: 'draft' | 'ready' = 'draft';
  /** Back arrow: may ask about unsaved changes first. */
  export let onBack: () => void = () => {};
  /** After Save draft: leaves without asking, as nothing is unsaved. */
  export let onDone: () => void = () => {};
  export let onSend: (report: Report) => void = () => {};
  /** Whether the form differs from what was opened; App asks before leaving unsaved edits. */
  export let ondirtychange: (dirty: boolean) => void = () => {};

  const openedAs = JSON.stringify(draft);
  $: ondirtychange(JSON.stringify(draft) !== openedAs);

  function updateHeight(raw: string) {
    if (raw.trim() === '') {
      draft.heightAboveGround = 'Not set';
      return;
    }
    const meters = Number(raw);
    draft.heightAboveGround = formatHeightFromMeters(Number.isNaN(meters) ? null : meters);
  }

  // A draft with every required field filled in is complete, so saving makes it Ready to send.
  function saveDraft() {
    if (canSend) reportStore.markReady(draftToReport(draft));
    else reportStore.saveDraft(draft);
    onDone();
  }

  // aria-disabled, not disabled: the button stays focusable and its note explains why; it never sends while fields are missing.
  function sendReport() {
    if (!canSend) return;
    const ready = reportStore.markReady(draftToReport(draft));
    const sent = ready && reportStore.submitReport(ready.id);
    if (sent) onSend(sent);
  }

  // Not answered stays null; the list shows a placeholder until one is chosen.
  let lightingChoice: Lighting | '' = draft.lighting ?? '';
  $: draft.lighting = lightingChoice === '' ? null : lightingChoice;

  // About three lines to start, growing with what is typed.
  function autosize(field: HTMLTextAreaElement) {
    const fit = () => {
      field.style.height = 'auto';
      field.style.height = `${field.scrollHeight + field.offsetHeight - field.clientHeight}px`;
    };
    fit();
    field.addEventListener('input', fit);
    return { destroy: () => field.removeEventListener('input', fit) };
  }

  const timeFormat = new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit' });
  /** "13:16" when edited today, otherwise the date. */
  function editedLabel(timestamp: string): string {
    const date = new Date(timestamp);
    if (Number.isNaN(date.getTime())) return timestamp;
    const today = new Date();
    const sameDay = date.getFullYear() === today.getFullYear() && date.getMonth() === today.getMonth() && date.getDate() === today.getDate();
    return sameDay ? timeFormat.format(date) : formatShortDate(timestamp);
  }

  // No type stays empty ("Select type") until one is chosen; nothing defaults to Other.
  let typeChoice: ObstacleType | '' = draftType(draft) ?? '';
  $: if (typeChoice !== '') {
    draft.category = typeChoice;
    if (draft.typeMissing) draft.typeMissing = false;
  }
  $: chosenType = typeChoice === '' ? null : typeChoice;
  // The name is optional; without one the page is titled like its card, "Untitled obstacle" without a type.
  $: titleMuted = !draft.title && chosenType === null;
  $: title = draft.title || (chosenType === null ? 'Untitled obstacle' : obstacleHeading(chosenType, heightInMeters(draft.heightAboveGround)));

  // The location editor opens over this page; only "Use this location" changes the working copy.
  let editingLocation = false;
  let editLocationButton: HTMLButtonElement | undefined;

  function openLocationEditor() {
    editingLocation = true;
  }

  async function closeLocationEditor() {
    editingLocation = false;
    await tick();
    editLocationButton?.focus({ preventScroll: true });
  }

  function useLocation(geometry: ReportGeometry) {
    draft.geometry = geometry;
    void closeLocationEditor();
  }

  $: missingFields = missingDraftFields(draft);

  $: canSend = missingFields.length === 0;
  $: heightMissing = missingFields.includes('height above ground');
  $: typeMissing = missingFields.includes('obstacle type');

  /** Each missing field's link text and the control it moves focus to; the list comes from missingDraftFields. */
  const fieldTargets: Record<string, { label: string; id: string }> = {
    'obstacle type': { label: 'Obstacle type', id: 'draft-type' },
    'height above ground': { label: 'Height above ground', id: 'draft-height' },
  };
  $: missingTargets = missingFields.map((field) => fieldTargets[field] ?? { label: field, id: '' });
  // "Add obstacle type and height above ground to send", from the same list.
  $: missingNote = `Add ${joinFields(missingFields)} to send`;

  function joinFields(fields: readonly string[]): string {
    if (fields.length <= 1) return fields[0] ?? '';
    return `${fields.slice(0, -1).join(', ')} and ${fields[fields.length - 1]}`;
  }

  function focusField(event: MouseEvent, id: string) {
    event.preventDefault();
    document.getElementById(id)?.focus();
  }

  // The drawing tool's word for the geometry, shown with the coordinates in Location.
  $: geometryLabel = obstacleGeometryChoices.find(({ type }) => type === draft.geometry?.type)?.label;
  $: coordinates = coordinateLabel(draft.geometry);
  $: locationCaption = [geometryLabel, coordinates].filter(Boolean).join(' · ');
</script>

<section class="page">
  {#snippet statusTag()}<StatusBadge {status} />{/snippet}
  <PageHeader {title} {titleMuted} backLabel="Back to Reports" onback={onBack} actions={statusTag}>
    <!-- Who reported it and when, from the report itself; replaces the Activity box. -->
    <p class="report-meta">
      Reported by {draft.reportedByName} · {draft.reportedByOrg}
      · Created <time datetime={draft.createdAt}>{formatShortDate(draft.createdAt)}</time>
      · Last edited <time datetime={draft.updatedAt}>{editedLabel(draft.updatedAt)}</time>
    </p>
  </PageHeader>

  <div class="scroll-area">
    <div class="safe-area">
      {#if !canSend}
        <!-- Names the missing fields as links to them; never refers to colour. -->
        <div class="needed-box">
          <p class="needed-title">
            {missingFields.length} {missingFields.length === 1 ? 'field' : 'fields'} still needed before you can send:
            {#each missingTargets as target, index (target.id)}{#if index > 0}{', '}{/if}<a class="needed-link" href={`#${target.id}`} on:click={(event) => focusField(event, target.id)}>{target.label}</a>{/each}
          </p>
        </div>
      {/if}

      <div class="fields-row">
        <div class="field-box">
          <!-- The same words as the summary and the note by Send. -->
          <label class="input-label" id="draft-type-label" for="draft-type">Obstacle type</label>
          <Dropdown id="draft-type" labelledby="draft-type-label" options={typeOptions} bind:value={typeChoice} placeholder="Select type"
            invalid={typeMissing} describedby={typeMissing ? 'draft-type-error' : undefined} />
          {#if typeMissing}
            <p class="field-error" id="draft-type-error">
              <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><circle cx="12" cy="12" r="9" /><path d="M12 7.5v5.5M12 16.5v.01" /></svg>
              Required to send
            </p>
          {/if}
        </div>

        <div class="field-box">
          <label class="input-label" for="draft-height">Height above ground</label>
          <!-- A missing height is marked on the field itself, with a reason under it. -->
          <div class="height-input-wrap" class:invalid={heightMissing}>
            <input
              id="draft-height"
              type="number"
              min="0"
              inputmode="decimal"
              placeholder="Enter height"
              aria-invalid={heightMissing || undefined}
              aria-describedby={heightMissing ? 'draft-height-help draft-height-error' : 'draft-height-help'}
              value={heightInMeters(draft.heightAboveGround) ?? ''}
              on:input={(e) => updateHeight(e.currentTarget.value)}
            />
            <span class="unit" aria-hidden="true">m</span>
          </div>
          <p class="field-help" id="draft-height-help">Highest point reported</p>
          {#if heightMissing}
            <p class="field-error" id="draft-height-error">
              <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><circle cx="12" cy="12" r="9" /><path d="M12 7.5v5.5M12 16.5v.01" /></svg>
              Required to send
            </p>
          {/if}
        </div>

        <div class="field-box">
          <label class="input-label" id="draft-lighting-label" for="draft-lighting">Lighting</label>
          <Dropdown id="draft-lighting" labelledby="draft-lighting-label" describedby="draft-lighting-help"
            options={lightingChoices} bind:value={lightingChoice} placeholder="Not set" />
          <p class="field-help" id="draft-lighting-help">Is the obstacle lit?</p>
        </div>
      </div>

      <section class="info-card" aria-labelledby="description-heading">
        <h2 class="section-heading" id="description-heading">Description and photo (optional)</h2>
        <hr class="divider" />

        <label class="pilot-label" for="pilot-report">What the pilot reported</label>
        <textarea id="pilot-report" class="pilot-report" rows="3" use:autosize bind:value={draft.pilotReportText}></textarea>

        <div class="photo-row">
          <PhotoField bind:photos={draft.photos} editable={true} label={title} showOptional={false} />
        </div>
      </section>

      <section class="location-panel panel" aria-labelledby="location-heading">
          <div class="location-heading">
            <h2 class="section-heading" id="location-heading">Location</h2>
            {#if draft.geometry}<button type="button" class="card-cta-link edit-location" bind:this={editLocationButton} on:click={openLocationEditor}>Edit location</button>{/if}
          </div>
          <MiniMap geometry={draft.geometry} label={title} onedit={draft.geometry ? openLocationEditor : undefined} />
          {#if draft.geometry}<div class="map-caption muted">{locationCaption}</div>{/if}
      </section>
    </div>
  </div>

  <footer class="bottom-bar">
    <div class="actions">
      <button class="ds-button" data-variant="secondary" data-color="neutral" on:click={saveDraft}>Save draft</button>
      <!-- The note belongs to Send: right-aligned beside it, above it when narrow. -->
      <div class="send-group">
        <div class="send-note" id="send-note">
          {#if canSend}
            <div class="note-strong">Goes straight to the NRL reviewer</div>
            <div class="muted">You cannot edit the report after sending</div>
          {:else}
            <div class="note-strong">{missingNote}</div>
          {/if}
        </div>
        <button class="ds-button send-button" data-variant="primary" data-color="brand1" aria-describedby="send-note" aria-disabled={canSend ? undefined : 'true'} on:click={sendReport}>
          <span class="paper-plane">➤</span> Send for Review
        </button>
      </div>
    </div>
  </footer>
  {#if editingLocation && draft.geometry}
    <LocationEditor geometry={draft.geometry} onuse={useLocation} oncancel={closeLocationEditor} />
  {/if}
</section>

<style>
  .page {
    position: fixed; inset: 0; z-index: var(--layer-dialog);
    display: flex; flex-direction: column;
    background: var(--color-background-page);
  }


  .muted { color:var(--color-text-secondary) }

  /* The bar sits below the scroll area, never over it; the padding keeps a focused field clear of its edge. */
  .scroll-area { flex:1; overflow-y:auto; overscroll-behavior:contain; scroll-padding-block:var(--space-6); }
  /* At least the scroll area's height, so the location card can take the room left above the bar. */
  .safe-area { display:flex; flex-direction:column; min-height:100%; width:100%; max-width:calc(var(--page-content-max) + 2 * var(--page-gutter)); margin:0 auto; padding:var(--page-content-top) max(var(--page-gutter), var(--safe-area-right)) var(--space-8) max(var(--page-gutter), var(--safe-area-left)); box-sizing:border-box; }
  .safe-area > * { flex:none; }

  /* Type, height and lighting in one row; stacked on phones. */
  .fields-row { display:grid; grid-template-columns: minmax(0,1fr); gap:14px; margin-bottom:16px }
  @media (min-width:37.5rem) { .fields-row { grid-template-columns: repeat(3, minmax(0,1fr)) } }
  /* min-width: 0 lets a grid card shrink to its column; long text wraps instead of overflowing. */
  .field-box { min-width:0; overflow-wrap:anywhere; border:var(--border-default); border-radius:var(--radius-card); padding:14px; background:var(--color-background-raised) }
  /* The three top fields: sentence-case labels, regular-weight values, help at the same place under each field. */
  .input-label { display:block; margin-bottom:var(--space-2); font-size:var(--font-size-body); font-weight:var(--font-weight-semibold); color:var(--color-text-primary) }
  .field-help { margin:var(--space-2) 0 0; font-size:var(--font-size-body-small); color:var(--color-text-secondary) }
  .field-error { display:flex; align-items:center; gap:var(--space-1); margin:var(--space-1) 0 0; font-size:var(--font-size-body-small); color:var(--color-status-error) }
  .field-error svg { flex:none; width:var(--icon-size-small); height:var(--icon-size-small); stroke:currentColor; stroke-width:var(--icon-stroke-width); stroke-linecap:round; stroke-linejoin:round }

  /* Same height, frame, radius and padding as the lists beside it; "m" ends --space-3 from the right, in line with their arrows. */
  .height-input-wrap {
    display:flex; align-items:center; gap:var(--space-2); box-sizing:border-box;
    height:var(--control-height-default); padding:0 var(--space-3);
    border:var(--border-strong); border-radius:var(--radius-control); background:var(--color-background-raised);
  }
  .height-input-wrap.invalid { border-color:var(--color-status-error) }
  .height-input-wrap:focus-within { outline:var(--border-width-emphasis) solid var(--color-focus-ring); outline-offset:var(--space-1) }
  .height-input-wrap input {
    width:100%; border:0; background:transparent; padding:0; margin:0;
    font:inherit; font-size:var(--font-size-body); font-weight:var(--font-weight-regular); color:var(--color-text-primary);
    -moz-appearance:textfield; appearance:textfield;
  }
  .height-input-wrap input::-webkit-outer-spin-button,
  .height-input-wrap input::-webkit-inner-spin-button { -webkit-appearance:none; margin:0 }
  .height-input-wrap input:focus { outline:none }
  /* text-secondary on the raised surface is well over 4.5:1. */
  .height-input-wrap input::placeholder { color:var(--color-text-secondary); font-weight:var(--font-weight-regular); opacity:1 }
  .height-input-wrap .unit { flex:none; color:var(--color-text-secondary); font-size:var(--font-size-body); font-weight:var(--font-weight-regular) }


  .needed-box { border:var(--border-default); border-radius:var(--radius-card); padding:var(--space-1) 16px; margin-bottom:20px; background:var(--color-background-raised) }
  .needed-title { margin:0; font-weight:700; color:var(--color-text-primary); line-height:var(--line-height-body) }
  /* 44 px tall targets inside the sentence. */
  .needed-link { display:inline-flex; align-items:center; min-height:var(--target-size-min); color:var(--color-action-secondary); font-weight:var(--font-weight-semibold) }

  .info-card { border:var(--border-default); border-radius:var(--radius-card); padding:16px; margin-bottom:24px; background:var(--color-background-raised) }

  /* Section headings: like the field labels, sentence case, semibold and dark, one step larger. */
  .section-heading { margin:0; font-size:var(--font-size-heading-small); font-weight:var(--font-weight-semibold); line-height:var(--line-height-tight); color:var(--color-text-primary) }
  .divider { border:0; height:1px; background:var(--color-border-default); margin:8px 0 16px }

  .pilot-label { display:block; font-size:14px; color:var(--color-text-primary); margin-bottom:8px }
  /* A visible frame (--border-strong, at least 3:1), about three lines, growing as it fills; the global focus ring stays. */
  .pilot-report {
    width:100%; resize:none; overflow:hidden; box-sizing:border-box; padding:12px;
    border:var(--border-strong); border-radius:var(--radius-control); background:var(--color-background-raised);
    font:inherit; line-height:var(--line-height-body); color:var(--color-text-primary);
  }
  .photo-row { margin-top:var(--space-4) }

  .panel { border:var(--border-default); border-radius:var(--radius-card); padding:14px; background:var(--color-background-raised) }
  /* Full width where Activity was, with a taller map. */
  /* The map is at least --report-edit-map-height and grows into any room left above the bottom bar. */
  .location-panel { flex:1 0 auto; display:flex; flex-direction:column; --reports-mini-map-height: var(--report-edit-map-height); margin-bottom:var(--space-4) }
  .location-panel :global(.mini-map) { flex:1 0 auto; height:auto; min-height:var(--report-edit-map-height) }
  /* Under the title row, on the header's width and gutters, so it lines up with the content. */
  .report-meta {
    box-sizing:border-box; max-width:calc(var(--page-content-max) + 2 * var(--page-gutter)); margin:0 auto;
    padding:0 max(var(--page-gutter), var(--safe-area-right)) var(--space-3) max(var(--page-gutter), var(--safe-area-left));
    color:var(--color-text-secondary); font-size:var(--font-size-body-small); overflow-wrap:anywhere;
  }

  .map-caption { font-size:12px; margin-top:8px }
  .location-heading { display:flex; align-items:center; justify-content:space-between; gap:var(--space-2) }
  .edit-location { min-height:var(--target-size-min); margin-block:calc(-1 * var(--space-3)); padding:0; border:0; background:none; font-size:var(--font-size-body-small); cursor:pointer }

  .bottom-bar { flex-shrink:0; background:var(--color-background-raised); border-top:var(--border-default); }
  .actions { width:100%; max-width:calc(var(--page-content-max) + 2 * var(--page-gutter)); margin:0 auto; padding:var(--space-4) max(var(--page-gutter), var(--safe-area-right)) max(var(--space-4), var(--safe-area-bottom)) max(var(--page-gutter), var(--safe-area-left)); box-sizing:border-box; display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:var(--space-3) var(--space-4) }
  .paper-plane { transform:rotate(45deg); display:inline-block }
  .send-group { display:flex; align-items:center; justify-content:flex-end; flex-wrap:wrap; gap:var(--space-2) var(--space-4); margin-left:auto }
  .send-note { text-align:right; font-size:12px }
  .note-strong { font-weight:700; color:var(--color-text-primary) }
  /* Every bar and photo control is a 44 px target; Send looks disabled while fields are missing but keeps focus. */
  .bottom-bar .ds-button, .photo-row :global(button) { min-height:var(--target-size-min) }
  .send-button[aria-disabled='true'] { opacity:var(--opacity-disabled); cursor:not-allowed }

</style>
