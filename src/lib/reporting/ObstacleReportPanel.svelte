<script lang="ts">
  import { onMount, tick, untrack } from 'svelte';
  import { obstacleTypeChoices, obstacleGeometryChoices, ObstacleType } from './obstacle';
  import { displayUnitToMeters, formatHeightLabel, metersToDisplayUnit, type HeightUnit } from './obstacleReportDraft';
  import { maxPhotos, type Illumination } from './createDetailsController';
  import { minObstacleHeightMeters, maxObstacleHeightMeters } from './reporting';
  import type { ReportingVariantProps } from './reportingVariantProps';
  import HeightKeypad from './HeightKeypad.svelte';
  import ObstacleTypeIcon from './ObstacleTypeIcon.svelte';
  import { createHeightPickerController } from './createHeightPickerController';

  let { draft, open, busy, error, ontype, onheight, onillumination, onabsence, oncustomtype, ondescription, onphotos, onremovephoto, ondismiss, onsave, onfinish }: ReportingVariantProps = $props();
  let obstacle = $derived(draft.report);
  let heightUnit = $state<HeightUnit>('m');
  let descriptionEnabled = $state(false);
  let showDescription = $derived(descriptionEnabled || draft.description.length > 0);
  let attachmentInput: HTMLInputElement;
  let cameraInput: HTMLInputElement;
  function toggleDescription() {
    descriptionEnabled = !showDescription;
    if (!descriptionEnabled) ondescription('');
  }
  function selectPhotos(event: Event & { currentTarget: HTMLInputElement }) {
    onphotos(Array.from(event.currentTarget.files ?? []));
    event.currentTarget.value = '';
  }

  const actionIcons = {
    close: 'm6 6 12 12M6 18 18 6',
    lightingCrossed:
      'M9 18h6M10 21h4M8 9a4 4 0 1 1 8 0c0 2-1.5 3-2 4.5-.2.6-.3 1-.3 1.5h-3.4c0-.5-.1-.9-.3-1.5C9.5 12 8 11 8 9ZM4 4l16 16',
    lightingLit:
      'M9 18h6M10 21h4M8 9a4 4 0 1 1 8 0c0 2-1.5 3-2 4.5-.2.6-.3 1-.3 1.5h-3.4c0-.5-.1-.9-.3-1.5C9.5 12 8 11 8 9ZM12 1.5v1.2M4.9 4.9l.85.85M2.3 9h1.2M20.5 9h1.2M19.1 4.9l-.85.85',
    description: 'M12 5v14M5 12h14',
    attachPhoto: 'M4 5h16v14H4ZM8 13l3-3 3 3 3-4M9 9a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z',
    takePhoto: 'M4 8h3l2-2h6l2 2h3v11H4ZM12 17a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z',
    notPresent: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18ZM5 5l14 14',
    pin: 'M12 21s-7-4.35-7-10a7 7 0 0 1 14 0c0 5.65-7 10-7 10Z',
  };

  const heightValues = Array.from(
    { length: maxObstacleHeightMeters - minObstacleHeightMeters + 1 },
    (_, index) => minObstacleHeightMeters + index,
  );

  function lightingLabel(status: Illumination): string {
    if (status === 'unknown') return 'Lighting unknown';
    if (status === 'illuminated') return 'Lighting';
    return 'No lighting';
  }

  let geometryChoice = $derived(
    obstacleGeometryChoices.find((choice) => choice.type === obstacle.obstacle_position.type),
  );
  let pointCount = $derived.by(() => {
    const geometry = obstacle.obstacle_position;
    if (geometry.type === 'Point') return 1;
    if (geometry.type === 'LineString') return geometry.coordinates.length;
    return geometry.coordinates[0].length - 1;
  });

  let dialog: HTMLDialogElement;
  let heading: HTMLHeadingElement;
  let heightTrigger: HTMLButtonElement | undefined;
  let backdropPress = false;
  let descriptionField = $state<HTMLTextAreaElement>();
  let heightItems = new Map<number, HTMLButtonElement>();
  let heightSizer: HTMLSpanElement;
  let heightPicker = $state<ReturnType<typeof createHeightPickerController>>();
  let heightInputOpen = $state(false);

  onMount(() => {
    return () => {
      if (dialog.open) dialog.close();
    };
  });

  // Draft edits replace the parent's state; only opening should move focus.
  let dialogOpen = $derived(open);
  $effect(() => {
    let cancelled = false;
    if (dialogOpen) {
      if (!dialog.open) dialog.showModal();
      void tick().then(() => { if (!cancelled) heading?.focus({ preventScroll: true }); });
    } else {
      dialog.close();
      heightInputOpen = false;
    }
    return () => { cancelled = true; };
  });

  function outside(event: MouseEvent) {
    const bounds = dialog.getBoundingClientRect();
    return event.target === dialog && (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom);
  }

  function resizeDescription() {
    if (!descriptionField) return;
    descriptionField.style.height = 'auto';
    descriptionField.style.height = `${descriptionField.scrollHeight}px`;
  }

  $effect(() => { if (showDescription) resizeDescription(); });

  $effect(() => {
    const picker = heightPicker;
    const value = draft.height;
    if (!open || busy || draft.notPresent || heightInputOpen) {
      untrack(() => picker?.stop());
      return;
    }
    untrack(() => picker?.sync(value));
  });

  function openHeightInput(trigger: HTMLButtonElement) {
    heightPicker?.stop();
    heightTrigger = trigger;
    heightInputOpen = true;
  }

  function closeHeightInput() {
    heightInputOpen = false;
    void tick().then(() => { if (open) (heightItems.get(draft.height) ?? heightTrigger)?.focus({ preventScroll: true }); });
  }

  function confirmHeightInput(value: number) {
    heightPicker?.select(Math.round(displayUnitToMeters(value, heightUnit)));
    closeHeightInput();
  }

  function registerHeightItem(node: HTMLButtonElement, meters: number) {
    heightItems.set(meters, node);
    return { destroy: () => heightItems.delete(meters) };
  }

  function handleHeightWheel(event: WheelEvent) {
    if (draft.notPresent || busy) return;
    event.preventDefault();
    const delta = event.deltaY || event.deltaX;
    if (delta) heightPicker?.select(draft.height + Math.sign(delta));
  }

  function handleHeightKeydown(event: KeyboardEvent) {
    if (draft.notPresent || busy) return;
    const values: Record<string, number> = {
      ArrowLeft: draft.height - 1, ArrowRight: draft.height + 1,
      Home: minObstacleHeightMeters, End: maxObstacleHeightMeters,
    };
    if (!(event.key in values)) return;
    event.preventDefault();
    const next = Math.max(minObstacleHeightMeters, Math.min(maxObstacleHeightMeters, values[event.key]));
    heightPicker?.select(next);
    heightItems.get(next)?.focus({ preventScroll: true });
  }

  function setupHeightPicker(track: HTMLDivElement) {
    const picker = createHeightPickerController({
      track, items: heightItems, getValue: () => draft.height,
      enabled: () => open && !busy && !draft.notPresent,
      onchange: (value) => onheight(value),
      reducedMotion: () => window.matchMedia('(prefers-reduced-motion: reduce)').matches,
      requestFrame: (callback) => requestAnimationFrame(callback),
      cancelFrame: (id) => cancelAnimationFrame(id),
    });
    heightPicker = picker;
    let resizeFrame: number | undefined;
    const observer = new ResizeObserver(() => {
      if (resizeFrame !== undefined) return;
      resizeFrame = requestAnimationFrame(() => {
        resizeFrame = undefined;
        const width = heightSizer.getBoundingClientRect().width;
        if (!open || !width) return;
        track.parentElement?.style.setProperty('--height-item-width', `${width}px`);
        picker.sync(draft.height, true);
      });
    });
    observer.observe(track);
    observer.observe(heightSizer);
    return { destroy() {
      observer.disconnect();
      if (resizeFrame !== undefined) cancelAnimationFrame(resizeFrame);
      picker.stop();
      heightPicker = undefined;
    } };
  }
</script>

<dialog
  class="obstacle-report-dialog dialog-shell report-panel"
  bind:this={dialog}
  aria-labelledby="report-heading"
  oncancel={(event) => { event.preventDefault(); if (heightInputOpen) closeHeightInput(); else ondismiss(); }}
  onpointerdown={(event) => { backdropPress = outside(event); }}
  onclick={(event) => { if (backdropPress && outside(event)) ondismiss(); backdropPress = false; }}
>
  <div class="report-shell" inert={heightInputOpen}>
  <header class="dialog-header report-header">
    <div>
      <h2 id="report-heading" bind:this={heading} tabindex="-1">New obstacle report</h2>
      {#if geometryChoice}
        <p class="report-subtitle" style:color={`var(${geometryChoice.colorToken})`}>
          {geometryChoice.label} Geometry · {pointCount} {pointCount === 1 ? 'point' : 'points'} placed
        </p>
      {/if}
    </div>
    <button type="button" class="menu-close" aria-label="Close report" onclick={ondismiss}>
      <svg class="geometry-icon" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d={actionIcons.close} /></svg>
    </button>
  </header>

  <div class="dialog-content report-content">
    <section>
      <h3 class="section-label">Obstacle Type - Required</h3>
      <div class="type-grid" role="group" aria-label="Obstacle type">
        {#each obstacleTypeChoices as choice (choice.id)}
          <button
            type="button"
            class="type-button"
            class:selected={draft.type === choice.type}
            aria-pressed={draft.type === choice.type}
            disabled={busy}
            onclick={() => ontype(choice.type)}
          >
            <svg class="geometry-icon" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <ObstacleTypeIcon type={choice.type} />
            </svg>
            <span>{choice.label}</span>
          </button>
        {/each}
      </div>
      {#if draft.type === ObstacleType.Other}
        <input
          class="form-control other-type-input"
          type="text"
          placeholder="Specify type" aria-label="Other obstacle type"
          value={draft.customType}
          disabled={busy} oninput={(event) => oncustomtype(event.currentTarget.value)}
        />
      {/if}
    </section>

    <section>
      <div class="section-label-row">
        <h3 class="section-label">Obstacle Height - {draft.notPresent ? 'Disabled' : 'Required'}</h3>
        <button type="button" class="unit-toggle" aria-label="Toggle height unit" disabled={busy} onclick={() => { heightUnit = heightUnit === 'm' ? 'ft' : 'm'; }}>
          {heightUnit}
        </button>
      </div>
      <div class="height-picker" aria-disabled={draft.notPresent || busy}>
        <span bind:this={heightSizer} class="height-item selected height-sizer" aria-hidden="true">{formatHeightLabel(maxObstacleHeightMeters, heightUnit)}</span>
        <div class="height-selection" aria-hidden="true"></div>
        <div
          class="height-track"
          role="listbox"
          tabindex="-1"
          aria-label="Obstacle height"
          aria-disabled={draft.notPresent || busy}
          use:setupHeightPicker
          onwheel={handleHeightWheel}
          onscroll={() => heightPicker?.scroll()}
          onpointerdown={() => heightPicker?.stop()}
          onkeydown={handleHeightKeydown}
        >
          {#each heightValues as meters (meters)}
            <button
              type="button"
              role="option"
              aria-selected={draft.height === meters}
              class="height-item"
              class:selected={draft.height === meters}
              disabled={draft.notPresent || busy}
              tabindex={draft.height === meters ? 0 : -1}
              onclick={(event) => { if (draft.height === meters) openHeightInput(event.currentTarget); else heightPicker?.select(meters); }}
              use:registerHeightItem={meters}
            >
              <span class="height-value">{draft.height === meters ? formatHeightLabel(meters, heightUnit) : metersToDisplayUnit(meters, heightUnit)}</span>
            </button>
          {/each}
        </div>
      </div>
    </section>

    <div class="optional-row" role="group" aria-label="Additional details">
      <button type="button" class="optional-button" data-state={draft.illumination} disabled={draft.notPresent || busy} onclick={onillumination}>
        <svg class="geometry-icon" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d={draft.illumination === 'illuminated' ? actionIcons.lightingLit : actionIcons.lightingCrossed} />
        </svg>
        <span>{lightingLabel(draft.illumination)}</span>
      </button>
      <button
        type="button"
        class="optional-button"
        class:active={showDescription}
        aria-pressed={showDescription}
        disabled={busy} onclick={toggleDescription}
      >
        <svg class="geometry-icon" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d={actionIcons.description} /></svg>
        <span>Description</span>
      </button>
      <button type="button" class="optional-button" disabled={busy} aria-describedby="one-step-photo-limit" onclick={() => attachmentInput.click()}>
        <svg class="geometry-icon" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d={actionIcons.attachPhoto} /></svg>
        <span>Attach photo</span>
      </button>
      <button type="button" class="optional-button" disabled={busy} aria-describedby="one-step-photo-limit" onclick={() => cameraInput.click()}>
        <svg class="geometry-icon" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d={actionIcons.takePhoto} /></svg>
        <span>Take photo</span>
      </button>
      <button
        type="button"
        class="optional-button not-present"
        class:active={draft.notPresent}
        aria-pressed={draft.notPresent}
        disabled={busy} onclick={() => onabsence(!draft.notPresent)}
      >
        <svg class="geometry-icon" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d={actionIcons.notPresent} /></svg>
        <span>Not present</span>
      </button>
    </div>

    <section class="report-photos" aria-label="Photos">
      <input bind:this={attachmentInput} type="file" accept="image/*" multiple hidden onchange={selectPhotos} />
      <input bind:this={cameraInput} type="file" accept="image/*" capture="environment" hidden onchange={selectPhotos} />
      {#if draft.photos.length}
        <ul class="report-photo-list">
          {#each draft.photos as photo, index}
            <li><span title={photo.name}>{photo.name}</span><button type="button" class="button" disabled={busy}
              aria-label={'Remove photo ' + (index + 1) + ': ' + photo.name} onclick={() => onremovephoto(index)}>Remove</button></li>
          {/each}
        </ul>
      {/if}
    </section>

    {#if showDescription}
      <textarea
        bind:this={descriptionField}
        class="form-control description-field"
        placeholder="Add details about the obstacle…"
        value={draft.description}
        aria-label="Description" disabled={busy}
        oninput={(event) => { ondescription(event.currentTarget.value); resizeDescription(); }}
      ></textarea>
    {/if}

    {#if draft.notPresent}
      <p class="not-present-note">This obstacle no longer exists in reality.</p>
    {/if}
  </div>

  <div class="report-feedback">
    {#if error}<p class="report-error" role="alert">{error}</p>{/if}
  </div>
  <footer class="dialog-footer report-footer" aria-busy={busy}>
    <button type="button" class="button" disabled={busy} onclick={onsave}>Save draft</button>
    <button type="button" class="button button--primary" disabled={!draft.type || busy} onclick={onfinish}>
      <svg class="geometry-icon" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d={actionIcons.pin} /><circle cx="12" cy="11" r="2.25" /></svg>
      Finish report
    </button>
  </footer>
  </div>

  {#if heightInputOpen && open && !busy && !draft.notPresent}
    <HeightKeypad value={metersToDisplayUnit(draft.height, heightUnit)} unit={heightUnit}
      max={metersToDisplayUnit(maxObstacleHeightMeters, heightUnit)}
      onconfirm={confirmHeightInput} oncancel={closeHeightInput} />
  {/if}
</dialog>

<style>
  .report-panel {
    width: var(--report-panel-width);
    max-width: none;
    max-height: var(--report-panel-height);
    margin: auto;
    padding: 0;
    border: var(--border-default);
    overflow-y: auto;
    overscroll-behavior: contain;
  }
  .report-header { display: flex; align-items: flex-start; justify-content: space-between; gap: var(--space-3); }
  .report-header h2 { margin: 0; font-size: var(--font-size-heading-small); }
  .report-subtitle { margin: var(--space-1) 0 0; font-size: var(--font-size-body-small); font-weight: var(--font-weight-semibold); }
  .report-content { display: flex; flex-direction: column; gap: var(--space-5); }
  .section-label { margin: 0 0 var(--space-2); font-size: var(--font-size-body-small); font-weight: var(--font-weight-semibold); color: var(--color-text-secondary); }
  .section-label-row { display: flex; align-items: center; justify-content: space-between; }
  .section-label-row .section-label { margin-bottom: 0; }

  .type-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: var(--space-2); }
  .type-button {
    display: flex; flex-direction: column; align-items: center; justify-content: center; gap: var(--space-1);
    min-height: var(--control-height-large); padding: var(--space-3);
    border: var(--border-default); border-radius: var(--radius-control);
    background: var(--color-background-subtle); color: var(--color-text-primary); cursor: pointer;
    font-size: var(--font-size-body-small); font-weight: var(--font-weight-medium);
    transition: background-color var(--duration-default) var(--ease-standard), border-color var(--duration-default) var(--ease-standard), color var(--duration-default) var(--ease-standard);
  }
  .type-button:hover { background: var(--color-map-control-hover); }
  .type-button.selected {
    border-color: var(--color-action-secondary); background: var(--color-action-selected); color: var(--color-action-secondary);
  }
  .other-type-input { margin-top: var(--space-2); }

  .unit-toggle {
    min-height: var(--target-size-min); height: auto; padding-inline: var(--space-2);
    border: var(--border-default); border-radius: var(--radius-pill);
    background: var(--color-background-subtle); color: var(--color-text-secondary);
    font-size: var(--font-size-caption); font-weight: var(--font-weight-semibold); text-transform: uppercase; cursor: pointer;
  }
  .unit-toggle:hover { background: var(--color-map-control-hover); }

  .height-picker {
    /* Replaced by the measured widest label, including its unit and padding. */
    --height-item-width: var(--report-height-item-size);
    position: relative; min-width: 0; overflow: hidden;
    border: var(--border-default); border-radius: var(--radius-control); background: var(--color-background-subtle);
  }
  .height-selection {
    position: absolute; left: 50%; top: 50%; transform: translate(-50%, -50%);
    width: var(--height-item-width, var(--report-height-item-size)); height: var(--report-height-item-size);
    border-radius: var(--radius-small); background: var(--color-background-raised); box-shadow: var(--shadow-surface); pointer-events: none;
  }
  .height-track {
    position: relative; box-sizing: border-box;
    display: flex; gap: var(--space-1); overflow-x: auto; padding: var(--space-2);
    padding-inline: max(0px, calc((100% - var(--height-item-width, var(--report-height-item-size))) / 2)); scroll-snap-type: x mandatory;
    scrollbar-width: none; overscroll-behavior-x: contain; touch-action: pan-x pan-y;
  }
  .height-track::-webkit-scrollbar { display: none; }
  .height-picker[aria-disabled='true'] { opacity: var(--opacity-disabled); }
  .height-track[aria-disabled='true'] { overflow-x: hidden; }
  .height-item {
    position: relative; box-sizing: border-box; flex: none;
    width: var(--height-item-width, var(--report-height-item-size)); min-width: var(--report-height-item-size); height: var(--report-height-item-size);
    padding: var(--space-1) var(--space-2); font-variant-numeric: tabular-nums; white-space: nowrap;
    display: grid; place-items: center; border: 0; border-radius: var(--radius-small);
    background: transparent; color: var(--color-text-disabled); cursor: pointer; font-weight: var(--font-weight-medium);
    scroll-snap-align: center;
  }
  @media (hover: hover) {
    .height-item:not(:disabled):not(.selected):hover { background: var(--color-map-control-hover); }
  }
  .height-item.selected {
    color: var(--color-text-primary); font-weight: var(--font-weight-semibold);
  }
  .height-sizer { position: absolute; width: max-content; visibility: hidden; pointer-events: none; }

  .optional-row { display: grid; grid-template-columns: repeat(5, minmax(0, 1fr)); gap: var(--space-2); }
  .optional-button {
    display: flex; flex-direction: column; align-items: center; justify-content: center; gap: var(--space-1);
    min-height: var(--target-size-min); padding: var(--space-2);
    border: var(--border-default); border-radius: var(--radius-control);
    background: var(--color-background-subtle); color: var(--color-text-secondary); cursor: pointer;
    font-size: var(--font-size-caption); text-align: center;
    transition: background-color var(--duration-default) var(--ease-standard), border-color var(--duration-default) var(--ease-standard), color var(--duration-default) var(--ease-standard);
  }
  .optional-button:not(:disabled):hover { background: var(--color-map-control-hover); }
  .optional-button[data-state='illuminated'] { border-color: var(--color-status-warning); color: var(--color-status-warning); }
  .optional-button[data-state='not-illuminated'] { border-color: var(--color-status-error); color: var(--color-status-error); }
  .optional-button.active { border-color: var(--color-status-success); color: var(--color-status-success); }
  .optional-button.not-present.active { border-color: var(--color-status-warning); color: var(--color-status-warning); }

  .description-field { min-height: 4rem; padding-block: var(--space-3); resize: none; overflow: hidden; }
  .not-present-note {
    margin: 0; padding: var(--space-3); border-radius: var(--radius-control);
    background: var(--color-status-warning-surface); color: var(--color-status-warning); font-size: var(--font-size-body-small);
  }

  .report-photos p, .report-feedback p { margin: 0; color: var(--color-text-secondary); font-size: var(--font-size-body-small); }
  .report-photo-list { list-style: none; margin: 0; padding: 0; }
  .report-photo-list li { display: flex; align-items: center; gap: var(--space-2); border-bottom: var(--border-default); }
  .report-photo-list li span { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .report-feedback { padding-inline: var(--space-6); }
  .report-feedback .report-error { color: var(--color-status-error); }
  .report-footer { display: flex; gap: var(--space-3); }
  .report-footer .button { flex: 1; }

  /* Fluid scaling: every value below ramps continuously between its 375px-viewport
     token and its 1440px-viewport token, so nothing snaps at a breakpoint — it tracks
     the viewport the same way --report-panel-width/--report-panel-height do above. */
  .report-header, .report-footer { padding-block: clamp(var(--space-6), 1.324rem + 0.751vw, var(--space-8)); }
  .report-content { padding-block: 0 clamp(var(--space-6), 1.324rem + 0.751vw, var(--space-8)); gap: clamp(var(--space-5), 1.162rem + 0.376vw, var(--space-6)); }
  .report-header h2 { font-size: clamp(var(--font-size-heading-small), 1.162rem + 0.376vw, var(--font-size-heading)); }
  .section-label { font-size: clamp(var(--font-size-body-small), 0.831rem + 0.188vw, var(--font-size-body)); }
  .type-button { padding: clamp(var(--space-3), 0.662rem + 0.376vw, var(--space-4)); font-size: clamp(var(--font-size-body-small), 0.831rem + 0.188vw, var(--font-size-body)); }
  .optional-button { min-height: clamp(var(--target-size-min), 2.662rem + 0.376vw, var(--control-height-default)); font-size: clamp(var(--font-size-caption), 0.706rem + 0.188vw, var(--font-size-body-small)); }
  .height-item { font-size: var(--font-size-body); }
  .height-item.selected { font-size: clamp(var(--font-size-body), 0.912rem + 0.376vw, var(--font-size-heading-small)); }
  .report-footer .button { min-height: clamp(var(--control-height-default), 2.824rem + 0.751vw, var(--control-height-large)); }

  @media (max-width: 26rem) {
    .type-grid { grid-template-columns: 1fr 1fr; }
    .optional-row { grid-template-columns: repeat(3, 1fr); }
  }
</style>
