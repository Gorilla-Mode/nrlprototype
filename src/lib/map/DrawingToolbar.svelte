<script lang="ts">
  import { formatMeasurement, type DrawingState } from '../reporting/createDrawingController.js';
  import { obstacleGeometryChoices } from '../reporting/obstacle.js';

  let { state: drawingState, onundo, ondelete, oncomplete, onresumedetails }: {
    state: DrawingState;
    onundo: () => void;
    ondelete: () => void;
    oncomplete: () => void;
    onresumedetails?: () => void;
  } = $props();

  let choice = $derived(obstacleGeometryChoices.find(({ type }) => type === drawingState.draft?.type));
  let deleteButton = $state<HTMLButtonElement>();

  function completeSelection() {
    oncomplete();
    deleteButton?.focus();
  }
</script>

{#if drawingState.draft && choice}
  <section class="drawing-toolbar" aria-label="Obstacle selection" style:--geometry-color={`var(${choice.colorToken})`}>
    <div class="details">
      <div class="summary" role="status" aria-atomic="true">
        <strong class="object-type">{choice.label}</strong>
        {#if drawingState.status === 'completed'}<strong>Selection complete</strong>{/if}
        <span>{drawingState.draft.vertices.length} {drawingState.draft.vertices.length === 1 ? 'point' : 'points'} placed</span>
        {#if drawingState.measurement}<span>{formatMeasurement(drawingState.measurement)}</span>{/if}
      </div>
      {#if drawingState.status === 'drawing'}
        <p id="drawing-guidance" class:invalid={!drawingState.canComplete && drawingState.draft.vertices.length >= 3} role="status">
          {drawingState.message || 'Click or tap the map to add a point, or complete your selection.'}
        </p>
      {/if}
    </div>
    <div class="actions" role="group" aria-label="Selection actions">
      <button type="button" class="button button--danger delete" bind:this={deleteButton} onclick={ondelete}>Delete</button>
      {#if drawingState.status === 'completed' && onresumedetails}
        <button type="button" class="button button--primary" data-resume-details onclick={onresumedetails}>Resume details</button>
      {/if}
      {#if drawingState.status === 'drawing'}
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
