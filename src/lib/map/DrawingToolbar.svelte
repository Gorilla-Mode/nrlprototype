<script lang="ts">
  import { formatMeasurement, type DrawingState } from '../reporting/createDrawingController.js';
  import { obstacleGeometryChoices } from '../reporting/obstacle.js';

  let { state, onundo, ondelete, oncomplete }: {
    state: DrawingState;
    onundo: () => void;
    ondelete: () => void;
    oncomplete: () => void;
  } = $props();

  let choice = $derived(obstacleGeometryChoices.find(({ type }) => type === state.draft?.type));
</script>

{#if state.draft && choice}
  <section class="drawing-toolbar" aria-label="Obstacle selection" style:--geometry-color={`var(${choice.colorToken})`}>
    <div class="details">
      <div class="summary" role="status" aria-atomic="true">
        <strong class="object-type">{choice.label}</strong>
        {#if state.status === 'completed'}<strong>Selection complete</strong>{/if}
        <span>{state.draft.vertices.length} {state.draft.vertices.length === 1 ? 'point' : 'points'} placed</span>
        {#if state.measurement}<span>{formatMeasurement(state.measurement)}</span>{/if}
      </div>
      {#if state.status === 'drawing'}
        <p id="drawing-guidance" class:invalid={!state.canComplete && state.draft.vertices.length >= 3} role="status">
          {state.message || 'Click or tap the map to add a point, or complete your selection.'}
        </p>
      {/if}
    </div>
    <div class="actions" role="group" aria-label="Selection actions">
      <button type="button" class="delete" onclick={ondelete}>Delete</button>
      {#if state.status === 'drawing'}
        <button type="button" onclick={onundo} disabled={state.draft.vertices.length <= 1}>Undo</button>
        <button type="button" class="complete" onclick={oncomplete} disabled={!state.canComplete} aria-describedby={state.message ? 'drawing-guidance' : undefined}>Complete selection</button>
      {/if}
    </div>
  </section>
{/if}

<style>
  .drawing-toolbar {
    position: absolute;
    z-index: 2;
    left: max(8px, env(safe-area-inset-left));
    right: var(--map-right-inset);
    /* Reserve the attribution row as well as the device's safe area. */
    bottom: calc(max(0px, env(safe-area-inset-bottom)) + 36px);
    display: flex;
    align-items: stretch;
    gap: 12px;
    height: calc(var(--map-control-size) + 24px);
    width: fit-content;
    max-width: calc(100% - max(8px, env(safe-area-inset-left)) - var(--map-right-inset));
    margin-inline: auto;
    padding: 12px 12px;
    border-radius: 16px;
    background: var(--color-surface);
    color: var(--color-text);
    box-shadow: var(--shadow-control);
    font-size: 14px;
  }

  .details,
  .summary,
  .actions {
    display: flex;
  }

  .details {
    flex: 1 1 auto;
    flex-direction: column;
    justify-content: space-between;
    min-width: 0;
  }

  .summary,
  .actions {
    flex-wrap: wrap;
    align-items: center;
    gap: 8px 14px;
  }

  .object-type {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .object-type::before {
    content: '';
    width: 12px;
    height: 12px;
    border-radius: 50%;
    background: var(--geometry-color);
  }

  .actions { flex: none; gap: 6px; }

  button {
    height: var(--map-control-size);
    padding: 8px 12px;
    border: 1px solid var(--color-track-muted);
    border-radius: 10px;
    background: var(--color-surface);
    color: var(--color-text);
    cursor: pointer;
  }

  button:not(:disabled):hover { background: var(--color-surface-hover); }
  button:not(:disabled):active { background: var(--color-surface-active); }
  button:focus-visible { outline: 2px solid var(--color-focus); outline-offset: 2px; }
  button:disabled { color: var(--color-disabled); cursor: default; }
  .delete { color: var(--color-text-light); background: var(--color-negative); }
  .complete { font-weight: 600; background: var(--color-positive); color: var(--color-text-light); }
  .complete:hover { color: var(--color-text); }
  .complete:disabled {background: var(--color-disabled); color: var(--color-text-light);}
  .delete:hover { color: var(--color-text); }

  p {
    flex-basis: 100%;
    margin: 0;
    color: var(--color-muted);
    font-size: 13px;
    line-height: 1.4;
  }

  .invalid { color: var(--color-negative); }

  @media (max-width: 960px) {
    .drawing-toolbar {
      flex-wrap: wrap;
      height: auto;
      padding: 12px;
    }
    .details { flex-basis: 100%; min-height: var(--map-control-size); }
    .actions { flex: 1 1 100%; }
    .complete { flex: 1; }
  }
</style>
