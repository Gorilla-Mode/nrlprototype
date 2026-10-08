<script lang="ts">
  import { tick } from 'svelte';
  import GeometryIcon from './GeometryIcon.svelte';
  import { formatMeasurement, type DrawingState } from '../reporting/createDrawingController.js';
  import { obstacleGeometryChoices, type ObstacleGeometryType } from '../reporting/obstacle.js';

  let { state: drawingState, crosshairMode = false, geometryType = $bindable<ObstacleGeometryType>('Point'),
    onstart, onaddpoint, onundo, ondelete, oncomplete, onresumedetails, helpVisible = false }: {
    state: DrawingState;
    crosshairMode?: boolean;
    geometryType?: ObstacleGeometryType;
    onstart?: (type: ObstacleGeometryType) => void;
    onaddpoint?: () => void;
    onundo: () => void;
    ondelete: () => void;
    oncomplete: () => void;
    onresumedetails?: () => void;
    helpVisible?: boolean;
  } = $props();

  let choice = $derived(obstacleGeometryChoices.find(({ type }) => type === drawingState.draft?.type));
  let deleteButton = $state<HTMLButtonElement>();
  let addButton = $state<HTMLButtonElement>();

  async function startSelection() {
    onstart?.(geometryType);
    await tick();
    if (drawingState.status === 'drawing') addButton?.focus({ preventScroll: true });
  }

  function completeSelection() {
    oncomplete();
    deleteButton?.focus();
  }
</script>

{#if crosshairMode && drawingState.status === 'idle'}
  <section class="drawing-toolbar" class:help-visible={helpVisible} aria-label="Crosshair reporting">
    <div class="details">
      <fieldset class="geometry-choices">
        <legend class="sr-only">Obstacle geometry</legend>
        {#each obstacleGeometryChoices as geometry (geometry.id)}
          <label class="geometry-choice" class:selected={geometryType === geometry.type}>
            <input type="radio" name="crosshair-geometry" value={geometry.type} bind:group={geometryType} />
            <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><GeometryIcon type={geometry.type} /></svg>
            <span>{geometry.label}</span>
          </label>
        {/each}
      </fieldset>
      <p id="crosshair-guidance">Move the map to position the crosshair over the obstacle.</p>
    </div>
    <div class="actions">
      <button type="button" class="button button--primary complete" onclick={startSelection}
        disabled={!onstart} aria-describedby="crosshair-guidance">Report obstacle</button>
    </div>
  </section>
{:else if drawingState.draft && choice}
  <section class="drawing-toolbar" class:help-visible={helpVisible} aria-label="Obstacle selection" style:--geometry-color={`var(${choice.colorToken})`}>
    <div class="details">
      <div class="summary" role="status" aria-atomic="true">
        <strong class="object-type">{choice.label}</strong>
        {#if drawingState.status === 'completed'}<strong>Selection complete</strong>{/if}
        <span>{drawingState.draft.vertices.length} {drawingState.draft.vertices.length === 1 ? 'point' : 'points'} placed</span>
        {#if drawingState.measurement}<span>{formatMeasurement(drawingState.measurement)}</span>{/if}
      </div>
      {#if drawingState.status === 'drawing'}
        <p id="drawing-guidance" class:invalid={!drawingState.canComplete && drawingState.draft.vertices.length >= 3} role="status">
          {drawingState.message || (crosshairMode
            ? 'Move the map and use Add point to place a vertex at the crosshair, or complete your selection.'
            : 'Click or tap the map to add a point, or complete your selection.')}
        </p>
      {/if}
    </div>
    <div class="actions" role="group" aria-label="Selection actions">
      <button type="button" class="button button--danger delete" bind:this={deleteButton} onclick={ondelete}>Delete</button>
      {#if drawingState.status === 'completed' && onresumedetails}
        <button type="button" class="button button--primary" data-resume-details onclick={onresumedetails}>Resume details</button>
      {/if}
      {#if drawingState.status === 'drawing'}
        {#if crosshairMode}
          <button type="button" class="button" bind:this={addButton} onclick={onaddpoint} disabled={!onaddpoint}>Add point</button>
        {/if}
        <button type="button" class="button" onclick={onundo} disabled={drawingState.draft.vertices.length <= 1}>Undo</button>
        <button type="button" class="button button--primary complete" onclick={completeSelection} disabled={!drawingState.canComplete} aria-describedby={drawingState.message ? 'drawing-guidance' : undefined}>Complete selection</button>
      {/if}
    </div>
  </section>
{/if}

<style>
  .drawing-toolbar {
    position: absolute;
    z-index: var(--layer-map-overlay);
    inset-inline: var(--map-control-inset-left) var(--map-control-inset-right);
    bottom: var(--map-bottom-toolbar-inset);
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: var(--space-4);
    width: fit-content;
    max-width: calc(100% - var(--map-control-inset-left) - var(--map-control-inset-right));
    margin-inline: auto;
    padding: var(--space-3);
    border: var(--border-strong);
    border-radius: var(--radius-card);
    background: var(--color-background-raised);
    color: var(--color-text-primary);
    box-shadow: var(--shadow-control);
    font-size: var(--font-size-body-small);
  }
  .drawing-toolbar.help-visible { bottom: var(--map-bottom-toolbar-help-inset); }
  .geometry-choices {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-2);
    min-width: 0;
    margin: 0;
    padding: 0;
    border: 0;
  }
  .geometry-choice {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: var(--space-2);
    min-height: var(--target-size-min);
    padding: var(--space-2);
    border: var(--border-default);
    border-radius: var(--radius-control);
    background: var(--color-background-raised);
    cursor: pointer;
  }
  .geometry-choice:hover { background: var(--color-map-control-hover); }
  .geometry-choice.selected {
    border-color: var(--color-action-secondary);
    background: var(--color-map-control-active);
  }
  .geometry-choice:focus-within { outline: var(--border-width-emphasis) solid var(--color-focus-ring); outline-offset: var(--space-1); }
  .geometry-choice input { margin: 0; accent-color: var(--color-action-secondary); }
  .geometry-choice svg { width: var(--icon-size-default); height: var(--icon-size-default); }
  .details, .summary, .actions { display: flex; }
  .details { flex: 1 1 auto; flex-direction: column; gap: var(--space-2); min-width: 0; }
  .summary, .actions { flex-wrap: wrap; align-items: center; gap: var(--space-2) var(--space-4); }
  .object-type { color: var(--geometry-color); }
  .actions { flex: none; gap: var(--space-2); }
  p { margin: 0; color: var(--color-text-secondary); line-height: var(--line-height-body); }
  .invalid { color: var(--color-status-error); }
  /* The action row needs its own line on portrait tablets and phones. */
  @media (max-width: 60rem) {
    .drawing-toolbar { flex-wrap: wrap; }
    .details, .actions { flex-basis: 100%; }
    .complete { flex: 1; }
  }
</style>
