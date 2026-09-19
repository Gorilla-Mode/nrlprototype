<script lang="ts">
  import { onMount, tick } from 'svelte';
  import HeightWheel from './HeightWheel.svelte';
  import { illuminationLabels, maxPhotos } from './createDetailsController';
  import { obstacleGeometryChoices, obstacleTypeChoices } from './obstacle';
  import ObstacleTypeIcon from './ObstacleTypeIcon.svelte';
  import type { ReportingVariantProps } from './reportingVariantProps';

  let { draft, open, step, totalSteps, busy, error, ontype, onheight, onillumination, onabsence, oncustomtype, ondescription, onphotos, onremovephoto, onsave, oncontinue, onfinish, onback, ondismiss }: ReportingVariantProps = $props();
  let dialog: HTMLDialogElement;
  let heading: HTMLHeadingElement;
  let attachmentInput = $state<HTMLInputElement>();
  let cameraInput = $state<HTMLInputElement>();
  function selectPhotos(event: Event & { currentTarget: HTMLInputElement }) {
    onphotos(Array.from(event.currentTarget.files ?? []));
    event.currentTarget.value = '';
  }
  // Draft edits replace the parent's state; only navigation should move focus.
  let visibleStep = $derived(open ? step : null);
  $effect(() => {
    let cancelled = false;
    if (visibleStep !== null) {
      if (!dialog.open) dialog.showModal();
      void tick().then(() => { if (!cancelled) heading?.focus({ preventScroll: true }); });
    } else dialog.close();
    return () => { cancelled = true; };
  });
  let geometryLabel = $derived(obstacleGeometryChoices.find(({ type }) => type === draft.report.obstacle_position.type)?.label.toLowerCase());
  let pointerOnBackdrop = false;
  function outside(event: MouseEvent) {
    const bounds = dialog.getBoundingClientRect();
    return event.target === dialog && (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom);
  }
  onMount(() => {
    return () => dialog.close();
  });
</script>

<dialog bind:this={dialog} aria-labelledby="details-title" aria-describedby="details-step"
  oncancel={(event) => { event.preventDefault(); ondismiss(); }}
  onpointerdown={(event) => { pointerOnBackdrop = outside(event); }}
  onclick={(event) => { if (pointerOnBackdrop && outside(event)) ondismiss(); pointerOnBackdrop = false; }}>
  <div class="details-layout">
  <header>
    <div class="heading-row">
      {#if step === 2}
        <button class="button close" type="button" aria-label="Back to step 1" onclick={onback}>
          <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="m14 6-6 6 6 6" /></svg>
        </button>
      {/if}
      <h1 bind:this={heading} id="details-title" tabindex="-1">{step === 1 ? 'Obstacle Details' : 'Additional Information'}</h1>
      <p id="details-step">Step {step} of {totalSteps} · {geometryLabel}</p>
      <button class="button close" type="button" aria-label="Close obstacle details" onclick={ondismiss}>
        <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18" /></svg>
      </button>
    </div>
    <div class="progress" aria-hidden="true"><span class="active"></span><span class:active={step === 2}></span></div>
  </header>
  <div class="body">
    {#if step === 1}
    <fieldset class="types" disabled={busy}>
      <legend>Obstacle type - Required</legend>
      <div class="type-grid">
        {#each obstacleTypeChoices as choice}
          <label class="type-card" class:selected={draft.type === choice.type}>
            <input class="sr-only" type="radio" name="obstacle-type" value={choice.type} checked={draft.type === choice.type} onchange={() => ontype(choice.type)} />
            <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
              {#if choice.type === 'bridge'}<path d="M3 19V7m18 12V7M3 10h18M3 16c4-7 14-7 18 0M7 10v3m10-3v3" />
              {:else if choice.type === 'airspan'}<path d="M4 21V3m16 18V3M2 6h4m12 0h4M4 7c5 8 11 8 16 0M4 4c5 6 11 6 16 0" />
              {:else if choice.type === 'pole'}<path d="M12 21V3M6 6h12M8 3v6m8-6v6M8 21h8" />
              {:else if choice.type === 'building'}<path d="M5 21V3h14v18M3 21h18M9 7h1m4 0h1m-6 4h1m4 0h1m-5 10v-6h4v6" />
              {:else if choice.type === 'construction'}<ObstacleTypeIcon type={choice.type} />
              {:else}<path d="M12 3 2 21h20L12 3Zm0 6v5m0 3v1" />{/if}
            </svg>
            <span>{choice.label}</span>
          </label>
        {/each}
      </div>
    </fieldset>
    <section aria-labelledby="height-title">
      <h2 id="height-title">Approx Height - Required</h2>
      <HeightWheel value={draft.height} disabled={draft.notPresent || busy} onchange={onheight} />
    </section>
    <section aria-labelledby="options-title">
      <h2 id="options-title">Options - Optional</h2>
      <div class="options-row">
        <button type="button" class="button illumination" disabled={draft.notPresent || busy} onclick={onillumination} aria-label={`Illumination: ${illuminationLabels[draft.illumination]}. Change illumination`}>
          <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
            {#if draft.illumination === 'unknown'}<circle cx="12" cy="12" r="9" /><path d="M9.5 9a2.5 2.5 0 0 1 5 0c0 2-2.5 2-2.5 4m0 3v1" />
            {:else}<path d="M9 18h6m-6 3h6M8 14a6 6 0 1 1 8 0l-1 2H9l-1-2Z" />{#if draft.illumination === 'not-illuminated'}<path d="m3 3 18 18" />{/if}{/if}
          </svg>
          <span aria-live="polite" aria-atomic="true">{illuminationLabels[draft.illumination]}</span>
        </button>
        <button type="button" class="button absence" aria-pressed={draft.notPresent} disabled={busy} onclick={() => onabsence(!draft.notPresent)}>
          <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M8 14a6 6 0 1 1 9-2M8 14l4 7 3-5M3 3l18 18" /></svg>
          Not present
        </button>
      </div>
    </section>
    {:else}
      {#if draft.type === 'other'}
        <label class="text-field">
          <span>Obstacle type - <span class="optional">Optional</span></span>
          <input type="text" placeholder="Custom obstacle type…" value={draft.customType} disabled={busy}
            oninput={(event) => oncustomtype(event.currentTarget.value)} />
        </label>
      {/if}
      <label class="text-field description">
        <span>Description - <span class="optional">Optional</span></span>
        <textarea placeholder="Add any additional information…" value={draft.description} disabled={busy}
          oninput={(event) => ondescription(event.currentTarget.value)}></textarea>
      </label>
      <section class="photos" aria-label="Photos">
        <p id="photo-limit">Photos - Optional · {draft.photos.length} of {maxPhotos}</p>
        {#if draft.photos.length}
          <ul class="photo-list">
            {#each draft.photos as photo, index}
              <li>
                <span class="filename" title={photo.name}>{photo.name}</span>
                <button class="button remove-photo" type="button" aria-label={`Remove photo ${index + 1}: ${photo.name}`}
                  disabled={busy} onclick={() => onremovephoto(index)}>
                  <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18" /></svg>
                </button>
              </li>
            {/each}
          </ul>
        {/if}
        <input bind:this={attachmentInput} type="file" accept="image/*" multiple hidden onchange={selectPhotos} />
        <input bind:this={cameraInput} type="file" accept="image/*" capture="environment" hidden onchange={selectPhotos} />
        <div class="photo-actions">
          <button class="button" type="button" disabled={busy} aria-describedby="photo-limit" onclick={() => attachmentInput?.click()}>Attach photo</button>
          <button class="button" type="button" disabled={busy} aria-describedby="photo-limit" onclick={() => cameraInput?.click()}>Take photo</button>
        </div>
      </section>
    {/if}

  </div>
  <footer>
    {#if error}<p role="alert" class="error">{error}</p>{/if}
    <p id="details-availability" class="sr-only">
      {#if !draft.type}Choose an obstacle type to continue. {/if}
      Details and photos stay in memory for this session.
    </p>
    <div class="footer-actions" aria-busy={busy}>
      <button type="button" class="button" disabled={busy} aria-describedby="details-availability" onclick={onsave}>Save Draft</button>
      {#if step < totalSteps}
        <button type="button" class="button continue" disabled={!draft.type || busy} aria-describedby="details-availability" onclick={oncontinue}>Continue</button>
      {:else}
        <button type="button" class="button continue" disabled={!draft.type || busy} aria-describedby="details-availability" onclick={onfinish}>Finish Report</button>
      {/if}
    </div>
  </footer>
  </div>
</dialog>

<style>
  dialog { width: min(calc(100dvw - var(--map-control-inset-left) - var(--map-control-inset-right)), calc((100dvh - var(--map-control-inset-top) - var(--map-control-inset-bottom)) * var(--details-aspect-ratio))); aspect-ratio: var(--details-aspect-ratio); max-width: none; max-height: none; margin: auto; padding: 0; border: 0; border-radius: var(--radius-dialog); background: var(--color-background-raised); color: var(--color-text-primary); box-shadow: var(--shadow-control); overflow: hidden; container-type: inline-size; }
  dialog[open] { display: flex; }
  dialog::backdrop { background: var(--color-background-scrim); backdrop-filter: blur(var(--details-backdrop-blur)); -webkit-backdrop-filter: blur(var(--details-backdrop-blur)); }
  .details-layout { flex: 1; min-width: 0; display: flex; flex-direction: column; padding: var(--details-inset); gap: var(--details-section-gap); font-size: var(--details-text-size); }
  header, footer { flex: none; }
  .heading-row { display: flex; align-items: center; gap: var(--details-small-gap); }
  h1 { margin: 0; margin-right: auto; font-size: var(--details-title-size); line-height: var(--line-height-tight); }
  h2, legend { margin: 0 0 var(--details-small-gap); font-size: var(--details-caption-size); font-weight: var(--font-weight-regular); color: var(--color-text-secondary); text-transform: uppercase; }
  p { margin: 0; color: var(--color-text-secondary); font-size: var(--details-caption-size); line-height: var(--line-height-body); }
  #details-step { white-space: nowrap; }
  .button { min-height: var(--details-button-height); padding-inline: var(--details-small-gap); gap: var(--details-icon-gap); border: var(--details-border); border-radius: var(--details-control-radius); font-size: inherit; }
  .button:focus-visible { outline-offset: var(--details-focus-offset); }
  .button.close { width: var(--details-close-size); min-height: var(--details-close-size); padding: 0; flex: none; border: 0; }
  svg { width: var(--details-icon-size); height: var(--details-icon-size); stroke: currentColor; stroke-width: var(--icon-stroke-width); stroke-linecap: round; stroke-linejoin: round; flex: none; }
  .progress { display: flex; gap: var(--details-card-gap); margin-top: var(--details-small-gap); }
  .progress span { flex: 1; height: var(--details-progress-height); background: var(--color-border-default); border-radius: var(--radius-pill); }
  .progress .active { background: var(--details-action-background); }
  .body { flex: 1; min-height: 0; display: flex; flex-direction: column; gap: var(--details-section-gap); }
  fieldset { margin: 0; padding: 0; border: 0; min-width: 0; }
  .types { flex: 1; min-height: 0; display: flex; flex-direction: column; }
  .type-grid { flex: 1; min-height: 0; display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); grid-template-rows: repeat(3, minmax(0, 1fr)); gap: var(--details-card-gap); }
  .type-card { position: relative; min-height: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: var(--details-icon-gap); padding: var(--details-small-gap); border: var(--details-border); border-radius: var(--details-control-radius); cursor: pointer; font-weight: var(--font-weight-medium); }
  .type-card svg { width: var(--details-type-icon-size); height: var(--details-type-icon-size); }
  .type-card:hover { background: var(--color-map-control-hover); }
  .type-card.selected { border-color: var(--color-action-secondary); background: var(--color-action-selected); }
  .type-card:has(:focus-visible) { outline: var(--border-width-emphasis) solid var(--color-focus-ring); outline-offset: var(--details-focus-offset); }
  fieldset:disabled .type-card { opacity: var(--opacity-disabled); cursor: default; }
  section { flex: none; }
  .options-row, .footer-actions, .photo-actions { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: var(--details-card-gap); }
  .text-field { display: flex; flex-direction: column; gap: var(--details-small-gap); }
  .optional { color: var(--color-text-secondary); }
  .text-field input, textarea { width: 100%; min-width: 0; border: var(--details-border); border-radius: var(--details-control-radius); padding: var(--details-small-gap); background: var(--color-background-subtle); color: var(--color-text-primary); font: inherit; }
  .text-field input { min-height: var(--details-button-height); }
  .text-field input::placeholder, textarea::placeholder { color: var(--color-text-secondary); opacity: var(--opacity-opaque); }
  .description { flex: 1; min-height: 0; }
  textarea { flex: 1; min-height: 0; resize: none; overflow-y: auto; overscroll-behavior: contain; }
  .photos { display: flex; flex-direction: column; gap: var(--details-small-gap); }
  .photo-list { list-style: none; padding: 0; margin: 0; }
  .photo-list li { display: flex; align-items: center; gap: var(--details-small-gap); min-width: 0; border-bottom: var(--details-border); }
  .filename { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .button.remove-photo { flex: none; width: var(--details-close-size); min-height: var(--details-close-size); padding: 0; border: 0; }
  .options-row .button { background: var(--color-background-subtle); }
  .button.absence[aria-pressed='true'] { border-color: var(--color-status-warning); color: var(--color-status-warning); background: var(--color-status-warning-surface); }
  .button.absence[aria-pressed='true']:hover { border-color: var(--color-text-primary); }
  .button.continue { background: var(--details-action-background); border-color: var(--details-action-background); color: var(--details-action-text); }
  .button.continue:not(:disabled):hover { background: var(--details-action-hover); }
  .button.continue:not(:disabled):active { background: var(--details-action-background); }
  .error { color: var(--color-status-error); margin-bottom: var(--details-small-gap); }
</style>
