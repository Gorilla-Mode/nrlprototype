<script lang="ts">
  import { onMount } from 'svelte';
  import { obstacleTypeChoices, obstacleGeometryChoices, ObstacleType, type Obstacle } from './obstacle';
  import {
    canFinishReport,
    cycleLighting,
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
</script>

<dialog
  class="obstacle-report-dialog dialog-shell report-panel"
  bind:this={dialog}
  aria-labelledby="report-heading"
  oncancel={(event) => { event.preventDefault(); oncancel(); }}
>
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
      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d={actionIcons.close} /></svg>
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
          placeholder="Specify type"
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
      <div class="height-track" role="listbox" aria-label="Obstacle height" aria-disabled={draft.notPresent}>
        {#each heightValues as meters (meters)}
          <button
            type="button"
            role="option"
            aria-selected={draft.height === meters}
            class="height-item"
            class:selected={draft.height === meters}
            disabled={draft.notPresent}
            onclick={() => onchange(setHeight(draft, meters))}
          >
            {#if draft.height === meters}
              <span class="height-badge">{formatHeightLabel(meters, draft.heightUnit)}</span>
            {/if}
            <span class="height-value">{metersToDisplayUnit(meters, draft.heightUnit)}</span>
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
</dialog>

<style>
  .report-panel {
    max-width: var(--report-panel-max);
    max-height: min(90dvh, 48rem);
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
    display: flex; gap: var(--space-1); overflow-x: auto; padding: var(--space-5) var(--space-2) var(--space-2);
    border: var(--border-default); border-radius: var(--radius-control); background: var(--color-background-subtle);
  }
  .height-track[aria-disabled='true'] { opacity: var(--opacity-disabled); }
  .height-item {
    position: relative; flex: none; min-width: var(--target-size-min); min-height: var(--target-size-min);
    display: grid; place-items: center; border: 0; border-radius: var(--radius-small);
    background: transparent; color: var(--color-text-disabled); cursor: pointer; font-weight: var(--font-weight-medium);
  }
  .height-item:not(:disabled):hover { background: var(--color-map-control-hover); }
  .height-item.selected {
    background: var(--color-background-raised); color: var(--color-text-primary); font-weight: var(--font-weight-semibold);
    box-shadow: var(--shadow-surface);
  }
  .height-badge {
    position: absolute; top: calc(-1 * var(--space-5)); left: 50%; transform: translateX(-50%);
    padding: var(--space-1) var(--space-2); border-radius: var(--radius-pill);
    background: var(--color-action-primary); color: var(--color-action-primary-text);
    font-size: var(--font-size-caption); font-weight: var(--font-weight-semibold); white-space: nowrap;
  }

  .optional-row { display: flex; flex-wrap: wrap; gap: var(--space-2); }
  .optional-button {
    display: flex; flex: 1 1 6rem; flex-direction: column; align-items: center; justify-content: center; gap: var(--space-1);
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

  @media (max-width: 26rem) {
    .type-grid { grid-template-columns: 1fr 1fr; }
    .optional-button { flex-basis: 40%; }
  }
</style>
