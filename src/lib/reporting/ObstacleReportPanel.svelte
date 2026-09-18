<script lang="ts">
  import { onMount } from 'svelte';
  import { obstacleTypeChoices, obstacleGeometryChoices, ObstacleType, type Obstacle } from './obstacle';
  import {
    canFinishReport,
    cycleLighting,
    defaultObstacleHeightMeters,
    displayUnitToMeters,
    formatHeightLabel,
    maxObstacleHeightMeters,
    metersToDisplayUnit,
    minObstacleHeightMeters,
    setDescription,
    setHeight,
    setObstacleType,
    setOtherTypeLabel,
    toggleDescription,
    toggleHeightUnit,
    toggleNotPresent,
    type LightingStatus,
    type ObstacleReportDraft,
  } from './obstacleReportDraft';
  import ObstacleTypeIcon from './ObstacleTypeIcon.svelte';

  let { obstacle, draft, onchange, oncancel, onsavedraft, onfinish }: {
    obstacle: Obstacle;
    draft: ObstacleReportDraft;
    onchange: (draft: ObstacleReportDraft) => void;
    oncancel: () => void;
    onsavedraft: () => void;
    onfinish: () => void;
  } = $props();

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
    backspace: 'M8 6h11a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H8l-5-6 5-6ZM12 10l4 4M16 10l-4 4',
    confirm: 'M5 13l4 4L19 7',
  };

  const heightValues = Array.from(
    { length: maxObstacleHeightMeters - minObstacleHeightMeters + 1 },
    (_, index) => minObstacleHeightMeters + index,
  );

  function lightingLabel(status: LightingStatus): string {
    if (status === 'unknown') return 'Lighting unknown';
    if (status === 'lit') return 'Lighting';
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
  let descriptionField = $state<HTMLTextAreaElement>();
  let heightTrack = $state<HTMLDivElement>();
  let heightItems = new Map<number, HTMLButtonElement>();
  let scrollSettleTimer: ReturnType<typeof setTimeout> | undefined;
  let heightInputOpen = $state(false);
  let heightInputValue = $state('');
  let heightInputField = $state<HTMLInputElement>();

  onMount(() => {
    dialog.showModal();
    return () => { if (dialog.open) dialog.close(); };
  });

  function resizeDescription() {
    if (!descriptionField) return;
    descriptionField.style.height = 'auto';
    descriptionField.style.height = `${descriptionField.scrollHeight}px`;
  }

  $effect(() => { if (draft.descriptionEnabled) resizeDescription(); });

  $effect(() => {
    if (draft.height === null) return;
    const item = heightItems.get(draft.height);
    item?.scrollIntoView({ inline: 'center', block: 'nearest', behavior: 'smooth' });
  });

  $effect(() => {
    if (heightInputOpen) heightInputField?.focus();
  });

  function openHeightInput() {
    heightInputValue = draft.height !== null ? String(metersToDisplayUnit(draft.height, draft.heightUnit)) : '';
    heightInputOpen = true;
  }

  function closeHeightInput() {
    heightInputOpen = false;
  }

  function appendHeightDigit(digit: string) {
    if (heightInputValue.length >= 3) return;
    heightInputValue += digit;
  }

  function backspaceHeightDigit() {
    heightInputValue = heightInputValue.slice(0, -1);
  }

  function confirmHeightInput() {
    const parsed = Number.parseInt(heightInputValue, 10);
    if (!Number.isNaN(parsed)) onchange(setHeight(draft, displayUnitToMeters(parsed, draft.heightUnit)));
    heightInputOpen = false;
  }

  function registerHeightItem(node: HTMLButtonElement, meters: number) {
    heightItems.set(meters, node);
    return { destroy: () => heightItems.delete(meters) };
  }

  function handleHeightWheel(event: WheelEvent) {
    if (draft.notPresent) return;
    event.preventDefault();
    const delta = event.deltaY > 0 ? 1 : -1;
    onchange(setHeight(draft, (draft.height ?? defaultObstacleHeightMeters) + delta));
  }

  function handleHeightScroll() {
    if (!heightTrack || draft.notPresent) return;
    if (scrollSettleTimer) clearTimeout(scrollSettleTimer);
    scrollSettleTimer = setTimeout(() => {
      if (!heightTrack) return;
      const trackRect = heightTrack.getBoundingClientRect();
      const center = trackRect.left + trackRect.width / 2;
      let closestMeters: number | null = null;
      let closestDistance = Infinity;
      for (const [meters, element] of heightItems) {
        const itemRect = element.getBoundingClientRect();
        const distance = Math.abs(itemRect.left + itemRect.width / 2 - center);
        if (distance < closestDistance) {
          closestDistance = distance;
          closestMeters = meters;
        }
      }
      if (closestMeters !== null && closestMeters !== draft.height) {
        onchange(setHeight(draft, closestMeters));
      }
    }, 120);
  }
</script>

<dialog
  class="obstacle-report-dialog dialog-shell report-panel"
  bind:this={dialog}
  aria-labelledby="report-heading"
  oncancel={(event) => { event.preventDefault(); oncancel(); }}
  onclick={(event) => { if (event.target === dialog) oncancel(); }}
>
  <div class="report-shell" inert={heightInputOpen}>
  <header class="dialog-header report-header">
    <div>
      <h2 id="report-heading">New obstacle report</h2>
      {#if geometryChoice}
        <p class="report-subtitle" style:color={`var(${geometryChoice.colorToken})`}>
          {geometryChoice.label} Geometry · {pointCount} {pointCount === 1 ? 'point' : 'points'} placed
        </p>
      {/if}
    </div>
    <button type="button" class="menu-close" aria-label="Cancel report" onclick={oncancel}>
      <svg class="geometry-icon" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d={actionIcons.close} /></svg>
    </button>
  </header>

  <div class="dialog-content report-content">
    <section>
      <h3 class="section-label">Obstacle Type</h3>
      <div class="type-grid" role="group" aria-label="Obstacle type">
        {#each obstacleTypeChoices as choice (choice.id)}
          <button
            type="button"
            class="type-button"
            class:selected={draft.obstacleType === choice.type}
            aria-pressed={draft.obstacleType === choice.type}
            onclick={() => onchange(setObstacleType(draft, choice.type))}
          >
            <svg class="geometry-icon" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <ObstacleTypeIcon type={choice.type} />
            </svg>
            <span>{choice.label}</span>
          </button>
        {/each}
      </div>
      {#if draft.obstacleType === ObstacleType.Other}
        <input
          class="form-control other-type-input"
          type="text"
          placeholder="Specify type" aria-label="Other obstacle type"
          value={draft.otherTypeLabel}
          oninput={(event) => onchange(setOtherTypeLabel(draft, event.currentTarget.value))}
        />
      {/if}
    </section>

    <section>
      <div class="section-label-row">
        <h3 class="section-label">Obstacle Height{draft.notPresent ? ' (optional)' : ''}</h3>
        <button type="button" class="unit-toggle" aria-label="Toggle height unit" onclick={() => onchange(toggleHeightUnit(draft))}>
          {draft.heightUnit}
        </button>
      </div>
      <div
        class="height-track"
        role="listbox"
        aria-label="Obstacle height"
        aria-disabled={draft.notPresent}
        bind:this={heightTrack}
        onwheel={handleHeightWheel}
        onscroll={handleHeightScroll}
      >
        {#each heightValues as meters (meters)}
          <button
            type="button"
            role="option"
            aria-selected={draft.height === meters}
            class="height-item"
            class:selected={draft.height === meters}
            disabled={draft.notPresent}
            onclick={() => { if (draft.height === meters) openHeightInput(); else onchange(setHeight(draft, meters)); }}
            use:registerHeightItem={meters}
          >
            <span class="height-value">{draft.height === meters ? formatHeightLabel(meters, draft.heightUnit) : metersToDisplayUnit(meters, draft.heightUnit)}</span>
          </button>
        {/each}
      </div>
    </section>

    <div class="optional-row" role="group" aria-label="Additional details">
      <button type="button" class="optional-button" data-state={draft.lighting} onclick={() => onchange(cycleLighting(draft))}>
        <svg class="geometry-icon" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d={draft.lighting === 'lit' ? actionIcons.lightingLit : actionIcons.lightingCrossed} />
        </svg>
        <span>{lightingLabel(draft.lighting)}</span>
      </button>
      <button
        type="button"
        class="optional-button"
        class:active={draft.descriptionEnabled}
        aria-pressed={draft.descriptionEnabled}
        onclick={() => onchange(toggleDescription(draft))}
      >
        <svg class="geometry-icon" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d={actionIcons.description} /></svg>
        <span>Description</span>
      </button>
      <button type="button" class="optional-button" disabled>
        <svg class="geometry-icon" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d={actionIcons.attachPhoto} /></svg>
        <span>Attach photo</span>
      </button>
      <button type="button" class="optional-button" disabled>
        <svg class="geometry-icon" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d={actionIcons.takePhoto} /></svg>
        <span>Take photo</span>
      </button>
      <button
        type="button"
        class="optional-button not-present"
        class:active={draft.notPresent}
        aria-pressed={draft.notPresent}
        onclick={() => onchange(toggleNotPresent(draft))}
      >
        <svg class="geometry-icon" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d={actionIcons.notPresent} /></svg>
        <span>Not present</span>
      </button>
    </div>

    {#if draft.descriptionEnabled}
      <textarea
        bind:this={descriptionField}
        class="form-control description-field"
        placeholder="Add details about the obstacle…"
        value={draft.description}
        oninput={(event) => { onchange(setDescription(draft, event.currentTarget.value)); resizeDescription(); }}
      ></textarea>
    {/if}

    {#if draft.notPresent}
      <p class="not-present-note">This obstacle no longer exists in reality.</p>
    {/if}
  </div>

  <footer class="dialog-footer report-footer">
    <button type="button" class="button" onclick={onsavedraft}>Save draft</button>
    <button type="button" class="button button--primary" disabled={!canFinishReport(draft)} onclick={onfinish}>
      <svg class="geometry-icon" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d={actionIcons.pin} /><circle cx="12" cy="11" r="2.25" /></svg>
      Finish report
    </button>
  </footer>
  </div>

  {#if heightInputOpen}
    <!-- Click-to-dismiss is a pointer convenience only; Escape (handled on the input) and the
         visible Cancel button already give keyboard users the same outcome. -->
    <!-- svelte-ignore a11y_click_events_have_key_events -->
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <div
      class="height-keypad-overlay"
      onclick={(event) => { if (event.target === event.currentTarget) closeHeightInput(); }}
    >
      <div class="height-keypad" role="dialog" aria-modal="true" aria-label="Enter obstacle height">
        <div class="height-keypad-display-row">
          <input
            class="height-keypad-display"
            type="text"
            inputmode="numeric"
            pattern="[0-9]*"
            aria-label="Obstacle height value"
            value={heightInputValue}
            bind:this={heightInputField}
            oninput={(event) => { heightInputValue = event.currentTarget.value.replace(/\D/g, '').slice(0, 3); }}
            onkeydown={(event) => {
              if (event.key === 'Enter') confirmHeightInput();
              if (event.key === 'Escape') closeHeightInput();
            }}
          />
          <span class="height-keypad-unit">{draft.heightUnit}</span>
        </div>
        <div class="height-keypad-grid">
          {#each ['1', '2', '3', '4', '5', '6', '7', '8', '9'] as digit}
            <button type="button" class="keypad-key" onclick={() => appendHeightDigit(digit)}>{digit}</button>
          {/each}
          <button type="button" class="keypad-key keypad-key--action" aria-label="Backspace" onclick={backspaceHeightDigit}>
            <svg class="geometry-icon" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d={actionIcons.backspace} /></svg>
          </button>
          <button type="button" class="keypad-key" onclick={() => appendHeightDigit('0')}>0</button>
          <button type="button" class="keypad-key keypad-key--confirm" aria-label="Confirm height" onclick={confirmHeightInput}>
            <svg class="geometry-icon" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d={actionIcons.confirm} /></svg>
          </button>
        </div>
        <div class="height-keypad-actions">
          <button type="button" class="button" onclick={closeHeightInput}>Cancel</button>
          <button type="button" class="button button--primary" disabled={heightInputValue === ''} onclick={confirmHeightInput}>Set height</button>
        </div>
      </div>
    </div>
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
    min-height: auto; height: var(--space-6); padding-inline: var(--space-2);
    border: var(--border-default); border-radius: var(--radius-pill);
    background: var(--color-background-subtle); color: var(--color-text-secondary);
    font-size: var(--font-size-caption); font-weight: var(--font-weight-semibold); text-transform: uppercase; cursor: pointer;
  }
  .unit-toggle:hover { background: var(--color-map-control-hover); }

  .height-track {
    display: flex; gap: var(--space-1); overflow-x: auto; padding: var(--space-2);
    padding-inline: 50%; scroll-padding-inline: 50%; scroll-snap-type: x mandatory;
    border: var(--border-default); border-radius: var(--radius-control); background: var(--color-background-subtle);
    scrollbar-width: none;
  }
  .height-track::-webkit-scrollbar { display: none; }
  .height-track[aria-disabled='true'] { opacity: var(--opacity-disabled); }
  .height-item {
    position: relative; flex: none; min-width: var(--target-size-min); min-height: var(--target-size-min);
    display: grid; place-items: center; border: 0; border-radius: var(--radius-small);
    background: transparent; color: var(--color-text-disabled); cursor: pointer; font-weight: var(--font-weight-medium);
    scroll-snap-align: center;
  }
  .height-item:not(:disabled):hover { background: var(--color-map-control-hover); }
  .height-item.selected {
    background: var(--color-background-raised); color: var(--color-text-primary); font-weight: var(--font-weight-semibold);
    box-shadow: var(--shadow-surface);
  }

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
  .optional-button[data-state='lit'] { border-color: var(--color-status-warning); color: var(--color-status-warning); }
  .optional-button[data-state='none'] { border-color: var(--color-status-error); color: var(--color-status-error); }
  .optional-button.active { border-color: var(--color-status-success); color: var(--color-status-success); }
  .optional-button.not-present.active { border-color: var(--color-status-warning); color: var(--color-status-warning); }

  .description-field { min-height: 4rem; padding-block: var(--space-3); resize: none; overflow: hidden; }
  .not-present-note {
    margin: 0; padding: var(--space-3); border-radius: var(--radius-control);
    background: var(--color-status-warning-surface); color: var(--color-status-warning); font-size: var(--font-size-body-small);
  }

  .report-footer { display: flex; gap: var(--space-3); }
  .report-footer .button { flex: 1; }

  .height-keypad-overlay {
    position: absolute; inset: 0; z-index: 1; display: grid; place-items: center; padding: var(--space-4);
    background: var(--report-backdrop); backdrop-filter: blur(var(--report-backdrop-blur));
    -webkit-backdrop-filter: blur(var(--report-backdrop-blur)); border-radius: inherit;
  }
  .height-keypad {
    display: flex; flex-direction: column; gap: var(--space-4); width: min(100%, 20rem);
    padding: var(--space-4); border: var(--border-default); border-radius: var(--radius-dialog);
    background: var(--color-background-raised); box-shadow: var(--shadow-surface);
  }
  .height-keypad-display-row {
    display: flex; align-items: baseline; justify-content: center; gap: var(--space-2);
    padding: var(--space-3); border: var(--border-default); border-radius: var(--radius-control);
    background: var(--color-background-subtle);
  }
  .height-keypad-display {
    width: 6ch; border: 0; background: transparent; color: var(--color-text-primary);
    font-size: var(--font-size-display); font-weight: var(--font-weight-semibold); text-align: center;
  }
  .height-keypad-display:focus-visible { outline: none; }
  .height-keypad-unit {
    color: var(--color-text-secondary); font-size: var(--font-size-body); font-weight: var(--font-weight-semibold);
    text-transform: uppercase;
  }
  .height-keypad-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: var(--space-2); }
  .keypad-key {
    min-height: var(--control-height-large); border: var(--border-default); border-radius: var(--radius-control);
    background: var(--color-background-subtle); color: var(--color-text-primary); cursor: pointer;
    font-size: var(--font-size-heading-small); font-weight: var(--font-weight-medium);
    display: grid; place-items: center;
  }
  .keypad-key:hover { background: var(--color-map-control-hover); }
  .keypad-key--confirm { border-color: var(--color-action-primary); color: var(--color-action-primary); }
  .height-keypad-actions { display: flex; gap: var(--space-3); }
  .height-keypad-actions .button { flex: 1; }

  /* Fluid scaling: every value below ramps continuously between its 375px-viewport
     token and its 1440px-viewport token, so nothing snaps at a breakpoint — it tracks
     the viewport the same way --report-panel-width/--report-panel-height do above. */
  .report-header, .report-footer { padding-block: clamp(var(--space-6), 1.324rem + 0.751vw, var(--space-8)); }
  .report-content { padding-block: 0 clamp(var(--space-6), 1.324rem + 0.751vw, var(--space-8)); gap: clamp(var(--space-5), 1.162rem + 0.376vw, var(--space-6)); }
  .report-header h2 { font-size: clamp(var(--font-size-heading-small), 1.162rem + 0.376vw, var(--font-size-heading)); }
  .section-label { font-size: clamp(var(--font-size-body-small), 0.831rem + 0.188vw, var(--font-size-body)); }
  .type-button { padding: clamp(var(--space-3), 0.662rem + 0.376vw, var(--space-4)); font-size: clamp(var(--font-size-body-small), 0.831rem + 0.188vw, var(--font-size-body)); }
  .optional-button { min-height: clamp(var(--target-size-min), 2.662rem + 0.376vw, var(--control-height-default)); font-size: clamp(var(--font-size-caption), 0.706rem + 0.188vw, var(--font-size-body-small)); }
  .height-item { min-width: clamp(var(--target-size-min), 2.662rem + 0.376vw, var(--control-height-default)); min-height: clamp(var(--target-size-min), 2.662rem + 0.376vw, var(--control-height-default)); font-size: var(--font-size-body); }
  .height-item.selected { font-size: clamp(var(--font-size-body), 0.912rem + 0.376vw, var(--font-size-heading-small)); }
  .report-footer .button { min-height: clamp(var(--control-height-default), 2.824rem + 0.751vw, var(--control-height-large)); }

  @media (max-width: 26rem) {
    .type-grid { grid-template-columns: 1fr 1fr; }
    .optional-row { grid-template-columns: repeat(3, 1fr); }
  }
</style>
