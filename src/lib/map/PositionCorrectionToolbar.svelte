<script lang="ts">
  import { formatCoordinates } from '../obstacles/errorReport';
  import type { GeoPosition } from '../obstacles/position';

  let { crosshairMode = false, newPosition, registered, move, canConfirm, editing, height = $bindable(0), oncancel, onconfirm, onunknown, onremove }: {
    crosshairMode?: boolean;
    /** The selection centre; null until the map reports it. */
    newPosition: GeoPosition | null;
    registered: GeoPosition;
    /** Distance and direction from the registered position; null before the circle has moved. */
    move: { distance: string; direction: string } | null;
    canConfirm: boolean;
    /** Adjusting an existing "Wrong position" answer, which can then be removed. */
    editing: boolean;
    /** Rendered height, so the map can keep the circle above the panel. */
    height?: number;
    oncancel: () => void;
    onconfirm: () => void;
    onunknown: () => void;
    onremove: () => void;
  } = $props();
</script>

<section class="position-panel" class:crosshair-mode={crosshairMode} aria-labelledby="position-panel-heading" bind:clientHeight={height}>
  <div class="details">
    <h2 id="position-panel-heading">Correct obstacle position</h2>
    <dl>
      <dt>New position</dt>
      <dd class="new-position">{newPosition ? formatCoordinates(newPosition) : '—'}</dd>
      <dt>Registered</dt>
      <dd>{formatCoordinates(registered)}</dd>
    </dl>
    {#if move}
      <p class="move" role="status">
        Moved <span class="accent">{move.distance} {move.direction}</span> from registered position
      </p>
    {/if}
  </div>

  <div class="actions">
    <div class="buttons" role="group" aria-label="Position actions">
      <button type="button" class="button" onclick={oncancel}>Cancel</button>
      <button type="button" class="button button--primary confirm" disabled={!canConfirm} onclick={onconfirm}>Confirm position</button>
    </div>
    <div class="links">
      {#if editing}
        <button type="button" class="link link--danger" onclick={onremove}>Remove “Wrong position”</button>
      {/if}
      <button type="button" class="link" onclick={onunknown}>I don't know the exact position</button>
    </div>
  </div>
</section>

<style>
  .position-panel {
    position: absolute;
    z-index: var(--layer-map-overlay);
    inset-inline: 0;
    bottom: 0;
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: space-between;
    gap: var(--space-4) var(--space-6);
    padding: var(--space-4) max(var(--map-control-inset-right), var(--space-4)) max(var(--space-4), var(--safe-area-bottom)) max(var(--map-control-inset-left), var(--space-4));
    border-top: var(--border-default);
    background: var(--color-background-raised);
    box-shadow: var(--shadow-control);
    color: var(--color-text-primary);
  }

  .position-panel.crosshair-mode {
    max-height: max(var(--control-height-large), calc(50dvh - var(--map-crosshair-size) / 2 - var(--space-4)));
    overflow-y: auto;
  }

  .details { flex: 1 1 20rem; min-width: 0; text-align: start; }
  h2 { margin: 0 0 var(--space-2); font-size: var(--font-size-body); font-weight: var(--font-weight-semibold); }
  /* Labels share one column so both coordinates line up. */
  dl { display: grid; grid-template-columns: max-content 1fr; align-items: baseline; gap: var(--space-1) var(--space-3); margin: 0; }
  dt { color: var(--color-text-secondary); font-size: var(--error-report-position-detail-size); }
  dd { margin: 0; color: var(--color-text-secondary); font-size: var(--error-report-position-detail-size); font-variant-numeric: tabular-nums; }
  dd.new-position { color: var(--color-text-primary); font-size: var(--error-report-position-size); font-weight: var(--font-weight-semibold); }
  .move { margin: var(--space-2) 0 0; color: var(--color-text-secondary); font-size: var(--error-report-position-detail-size); }
  .accent { color: var(--color-error-report-move); font-weight: var(--font-weight-semibold); }

  .actions { display: flex; flex: 0 1 auto; flex-direction: column; align-items: flex-end; gap: var(--space-1); }
  .buttons { display: flex; gap: var(--space-2); }
  .links { display: flex; flex-wrap: wrap; justify-content: flex-end; gap: 0 var(--space-4); }
  .link {
    min-height: var(--target-size-min); padding: 0 var(--space-1);
    border: 0; background: none; color: var(--color-action-secondary); cursor: pointer;
    font: inherit; font-size: var(--font-size-body-small); text-decoration: underline; text-underline-offset: var(--space-1);
  }
  .link--danger { color: var(--color-status-error); }

  /* Phones: actions take the full width under the details. */
  @media (max-width: 40rem) {
    .actions { flex-basis: 100%; align-items: stretch; }
    .buttons .button { flex: 1; }
  }
</style>
