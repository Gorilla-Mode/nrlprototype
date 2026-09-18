<script lang="ts">
  import { onMount } from 'svelte';
  import HeightWheel from './HeightWheel.svelte';
  import { illuminationLabels, obstacleTypeChoices, type DetailsDraft } from './createDetailsController';
  import type { ObstacleType } from './obstacle';

  let { draft, busy, error, canSave, canContinue, ontype, onheight, onillumination, onabsence, onsave, oncontinue, ondismiss }: {
    draft: DetailsDraft;
    busy: boolean;
    error: string;
    canSave: boolean;
    canContinue: boolean;
    ontype: (type: ObstacleType) => void;
    onheight: (height: number | null) => void;
    onillumination: () => void;
    onabsence: (notPresent: boolean) => void;
    onsave: () => void;
    oncontinue: () => void;
    ondismiss: () => void;
  } = $props();
  let dialog: HTMLDialogElement;
  let pointerOnBackdrop = false;
  function outside(event: MouseEvent) {
    const bounds = dialog.getBoundingClientRect();
    return event.target === dialog && (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom);
  }
  onMount(() => {
    dialog.showModal();
    return () => dialog.close();
  });
</script>

<dialog bind:this={dialog} aria-labelledby="details-title" aria-describedby="details-step"
  oncancel={(event) => { event.preventDefault(); ondismiss(); }}
  onpointerdown={(event) => { pointerOnBackdrop = outside(event); }}
  onclick={(event) => { if (pointerOnBackdrop && outside(event)) ondismiss(); pointerOnBackdrop = false; }}>
  <header>
    <div class="heading-row">
      <div><p id="details-step">Step 1 of 2</p><h1 id="details-title">Obstacle Details</h1></div>
      <button class="button close" type="button" aria-label="Close obstacle details" onclick={ondismiss}>
        <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18" /></svg>
      </button>
    </div>
    <div class="progress" aria-hidden="true"><span class="active"></span><span></span></div>
  </header>
  <div class="body">
    <fieldset disabled={busy}>
      <legend>Obstacle type <span>Required to continue</span></legend>
      <div class="type-grid">
        {#each obstacleTypeChoices as choice}
          <label class="type-card" class:selected={draft.type === choice.value}>
            <input type="radio" name="obstacle-type" value={choice.value} checked={draft.type === choice.value} onchange={() => ontype(choice.value)} />
            <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
              {#if choice.value === 'bridge'}<path d="M3 19V7m18 12V7M3 10h18M3 16c4-7 14-7 18 0M7 10v3m10-3v3" />
              {:else if choice.value === 'airspan'}<path d="M4 21V3m16 18V3M2 6h4m12 0h4M4 7c5 8 11 8 16 0M4 4c5 6 11 6 16 0" />
              {:else if choice.value === 'pole'}<path d="M12 21V3M6 6h12M8 3v6m8-6v6M8 21h8" />
              {:else if choice.value === 'building'}<path d="M5 21V3h14v18M3 21h18M9 7h1m4 0h1m-6 4h1m4 0h1m-5 10v-6h4v6" />
              {:else}<path d="M12 3 2 21h20L12 3Zm0 6v5m0 3v1" />{/if}
            </svg>
            <span>{choice.label}</span>
          </label>
        {/each}
      </div>
    </fieldset>
    <section aria-labelledby="height-title">
      <div class="section-title"><h2 id="height-title">Height</h2><span>Optional · 0–500 m</span></div>
      <HeightWheel value={draft.height} disabled={draft.notPresent || busy} onchange={onheight} />
    </section>
    <div class="setting-row">
      <div><h2>Illumination</h2><p>Click to cycle through the options.</p></div>
      <button type="button" class="button illumination" disabled={draft.notPresent || busy} onclick={onillumination} aria-label={`Illumination: ${illuminationLabels[draft.illumination]}. Change illumination`}>
        <span aria-live="polite" aria-atomic="true">{illuminationLabels[draft.illumination]}</span>
      </button>
    </div>
    <div class="absence">
      <label class="absence-label"><span>Not present</span><input type="checkbox" role="switch" checked={draft.notPresent} disabled={busy} onchange={(event) => onabsence(event.currentTarget.checked)} /></label>
      {#if draft.notPresent}<p class="warning" role="status">This obstacle no longer exists in reality.</p>{/if}
    </div>
  </div>
  <footer>
    {#if error}<p role="alert" class="error">{error}</p>{/if}
    <p id="details-availability">
      {#if !canSave && !canContinue}Save Draft and Continue are not connected yet. Details stay in memory for this session.
      {:else if !canSave}Save Draft is not connected yet.
      {:else if !canContinue}Continue is not connected yet.
      {:else if !draft.type}Choose an obstacle type to continue.
      {:else}Review your details before continuing.{/if}
    </p>
    <div class="footer-actions" aria-busy={busy}>
      <button type="button" class="button" disabled={!canSave || busy} aria-describedby="details-availability" onclick={onsave}>Save Draft</button>
      <button type="button" class="button button--primary" disabled={!canContinue || !draft.type || busy} aria-describedby="details-availability" onclick={oncontinue}>Continue <span aria-hidden="true">→</span></button>
    </div>
  </footer>
</dialog>

<style>
  dialog { width: min(var(--details-dialog-width), calc(100% - var(--map-control-inset-left) - var(--map-control-inset-right))); max-width: none; max-height: calc(100dvh - var(--map-control-inset-top) - var(--map-control-inset-bottom)); margin: auto; padding: 0; border: var(--border-default); border-radius: var(--radius-dialog); background: var(--color-background-raised); color: var(--color-text-primary); box-shadow: var(--shadow-control); overflow: hidden; }
  dialog[open] { display: flex; flex-direction: column; }
  dialog::backdrop { background: var(--color-background-scrim); backdrop-filter: blur(var(--details-backdrop-blur)); -webkit-backdrop-filter: blur(var(--details-backdrop-blur)); }
  header, footer { flex: none; padding: var(--space-5) var(--space-6); }
  .heading-row, .section-title, .setting-row { display: flex; justify-content: space-between; align-items: center; gap: var(--space-3); }
  h1 { margin: var(--space-1) 0 0; font-size: var(--font-size-heading); line-height: var(--line-height-tight); }
  h2, legend, .absence-label { font-size: var(--font-size-body); font-weight: var(--font-weight-semibold); margin: 0; }
  p { margin: 0; color: var(--color-text-secondary); font-size: var(--font-size-body-small); line-height: var(--line-height-body); }
  .close { width: var(--target-size-min); min-height: var(--target-size-min); padding: 0; flex: none; border: 0; }
  svg { width: var(--icon-size-large); height: var(--icon-size-large); stroke: currentColor; stroke-width: var(--icon-stroke-width); stroke-linecap: round; stroke-linejoin: round; flex: none; }
  .progress { display: flex; gap: var(--space-2); margin-top: var(--space-5); }
  .progress span { flex: 1; height: var(--details-progress-height); background: var(--color-border-default); border-radius: var(--radius-pill); }
  .progress .active { background: var(--color-action-secondary); }
  .body { overflow-y: auto; overscroll-behavior: contain; min-height: 0; padding: var(--space-1) var(--space-6) var(--space-5); display: flex; flex-direction: column; gap: var(--space-5); }
  fieldset { margin: 0; padding: 0; border: 0; min-width: 0; }
  legend { width: 100%; margin-bottom: var(--space-3); }
  legend span, .section-title span { font-size: var(--font-size-caption); color: var(--color-text-secondary); font-weight: var(--font-weight-regular); }
  legend span { float: right; padding-top: var(--space-1); }
  .type-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: var(--space-3); }
  .type-card { min-height: var(--details-type-height); display: flex; align-items: center; gap: var(--space-3); padding: var(--space-3); border: var(--border-strong); border-radius: var(--radius-control); cursor: pointer; font-size: var(--font-size-body-small); }
  .type-card:hover { background: var(--color-map-control-hover); }
  .type-card.selected { border-color: var(--color-action-secondary); background: var(--color-action-selected); color: var(--color-action-secondary); font-weight: var(--font-weight-semibold); }
  .type-card:has(:focus-visible) { outline: var(--border-width-emphasis) solid var(--color-focus-ring); outline-offset: var(--space-1); }
  .type-card input { margin: 0; accent-color: var(--color-action-secondary); }
  fieldset:disabled .type-card { opacity: var(--opacity-disabled); cursor: default; }
  .section-title { margin-bottom: var(--space-3); }
  .setting-row { flex-wrap: wrap; }
  .setting-row p { margin-top: var(--space-1); font-size: var(--font-size-caption); }
  .illumination { min-width: var(--details-illumination-width); }
  .absence { border-top: var(--border-default); padding-top: var(--space-3); }
  .absence-label { min-height: var(--target-size-min); display: flex; justify-content: space-between; align-items: center; cursor: pointer; }
  .absence-label input { width: var(--target-size-min); height: var(--target-size-min); margin: 0; accent-color: var(--color-action-secondary); cursor: pointer; }
  .warning { padding: var(--space-3); border-radius: var(--radius-small); background: var(--color-status-warning-surface); color: var(--color-status-warning); margin-top: var(--space-2); }
  footer { border-top: var(--border-default); }
  footer p { font-size: var(--font-size-caption); margin-bottom: var(--space-3); }
  .error { color: var(--color-status-error); }
  .footer-actions { display: flex; gap: var(--space-3); }
  .footer-actions button { flex: 1; }
  @media (max-width: 37.499rem) {
    header, footer { padding: var(--space-4); }
    .body { padding-inline: var(--space-4); }
    .type-card { gap: var(--space-2); }
  }
</style>
