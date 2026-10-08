<script lang="ts">
  import type { RegisteredObstacle } from '../obstacles/registeredObstacles';

  let { crosshairMode = false, helpVisible = false, placed, match, oncancel, onselect }: {
    crosshairMode?: boolean;
    helpVisible?: boolean;
    placed: boolean;
    match: RegisteredObstacle | null;
    oncancel: () => void;
    onselect: () => void;
  } = $props();

  let guidance = $derived(
    crosshairMode ? (match
      ? `Report an error – ${match.name ?? match.type} (${match.heightM} m)`
      : 'No registered obstacle within the crosshair. Move the map to aim at an obstacle.')
      : !placed ? 'Report an error – Hold the map to place the circle'
      : match ? 'Report an error – Move the circle over the obstacle'
        : 'No registered obstacles here',
  );
</script>

<section class="error-report-toolbar" class:crosshair-mode={crosshairMode} class:help-visible={helpVisible} aria-label="Report an error">
  <p role="status">{guidance}</p>
  <div class="actions" role="group" aria-label="Error report actions">
    <button type="button" class="button" onclick={oncancel}>Cancel</button>
    <button type="button" class="button button--primary select" data-report-error onclick={onselect} disabled={!match}>
      {crosshairMode ? 'Report error' : match ? `Select ${match.name ?? match.type} (${match.heightM} m)` : 'Select'}
    </button>
  </div>
</section>

<style>
  .error-report-toolbar {
    position: absolute;
    z-index: var(--layer-map-overlay);
    inset-inline: var(--map-control-inset-left) var(--map-control-inset-right);
    bottom: var(--map-bottom-toolbar-inset);
    display: flex;
    align-items: center;
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
  .error-report-toolbar.help-visible { bottom: var(--map-bottom-toolbar-help-inset); }
  .error-report-toolbar.crosshair-mode {
    width: var(--layout-form-max);
    max-height: max(var(--control-height-large), calc(50dvh - var(--map-crosshair-size) / 2 - var(--map-bottom-toolbar-inset) - var(--space-4)));
    overflow-y: auto;
  }
  .error-report-toolbar.crosshair-mode.help-visible {
    max-height: max(var(--control-height-large), calc(50dvh - var(--map-crosshair-size) / 2 - var(--map-bottom-toolbar-help-inset) - var(--space-4)));
  }
  p { flex: 1 1 auto; min-width: 0; margin: 0; color: var(--color-text-secondary); line-height: var(--line-height-body); }
  .actions { display: flex; flex: none; flex-wrap: wrap; align-items: center; gap: var(--space-2); }
  /* The action row needs its own line on portrait tablets and phones. */
  @media (max-width: 60rem) {
    .error-report-toolbar { flex-wrap: wrap; }
    p, .actions { flex-basis: 100%; }
    .select { flex: 1; }
  }
</style>
