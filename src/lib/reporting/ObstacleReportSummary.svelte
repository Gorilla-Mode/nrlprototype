<script lang="ts">
  import { onMount } from 'svelte';
  import { obstacleGeometryChoices, obstacleTypeChoices, ObstacleType } from './obstacle';
  import { illuminationLabels, type CompleteReport } from './createDetailsController';

  let { report, onclose }: { report: CompleteReport; onclose: () => void } = $props();
  let dialog: HTMLDialogElement;
  let heading: HTMLHeadingElement;
  onMount(() => {
    dialog.showModal();
    heading.focus({ preventScroll: true });
    return () => { if (dialog.open) dialog.close(); };
  });
  let geometryChoice = $derived(obstacleGeometryChoices.find((choice) => choice.type === report.obstacle_position.type));
  let typeChoice = $derived(obstacleTypeChoices.find((choice) => choice.type === report.type));
  let rows = $derived([
    { label: 'Geometry', value: geometryChoice?.label ?? '—' },
    { label: 'Obstacle type', value: report.type === ObstacleType.Other ? (report.customType || 'Other') : (typeChoice?.label ?? '—') },
    { label: 'Height', value: report.notPresent ? '—' : report.height + ' m' },
    { label: 'Lighting', value: report.notPresent ? '—' : illuminationLabels[report.illumination] },
    { label: 'Description', value: report.description || 'Not added' },
    { label: 'Not present', value: report.notPresent ? 'Yes' : 'No' },
    { label: 'Photos', value: report.photos.length ? report.photos.map((photo) => photo.name).join(', ') : 'Not added' },
  ]);
</script>

<dialog class="obstacle-report-dialog dialog-shell summary-panel" bind:this={dialog} aria-labelledby="summary-heading" oncancel={(event) => { event.preventDefault(); onclose(); }}>
  <header class="dialog-header">
    <h2 id="summary-heading" bind:this={heading} tabindex="-1">Report completed</h2>
    <p class="summary-note">Session-only summary — not saved or submitted.</p>
  </header>

  <div class="dialog-content">
    <table class="summary-table">
      <tbody>
        {#each rows as row (row.label)}
          <tr>
            <th scope="row">{row.label}</th>
            <td>{row.value}</td>
          </tr>
        {/each}
      </tbody>
    </table>
  </div>

  <footer class="dialog-footer summary-footer">
    <button type="button" class="button button--primary" onclick={onclose}>Close</button>
  </footer>
</dialog>

<style>
  .summary-panel { width: min(var(--report-panel-max), calc(100dvw - var(--map-control-inset-left) - var(--map-control-inset-right))); max-height: calc(100dvh - var(--map-control-inset-top) - var(--map-control-inset-bottom)); overflow-y: auto; margin: auto; padding: 0; border: var(--border-default); }
  .summary-panel h2 { margin: 0; font-size: var(--font-size-heading-small); }
  .summary-note { margin: var(--space-1) 0 0; color: var(--color-text-secondary); font-size: var(--font-size-body-small); }
  .summary-table { width: 100%; border-collapse: collapse; }
  .summary-table tr + tr { border-top: var(--border-default); }
  .summary-table th, .summary-table td { padding: var(--space-3) 0; text-align: left; font-weight: var(--font-weight-regular); vertical-align: top; }
  .summary-table th { width: 40%; color: var(--color-text-secondary); font-weight: var(--font-weight-medium); }
  .summary-table td { color: var(--color-text-primary); overflow-wrap: anywhere; }
  .summary-footer { display: flex; justify-content: flex-end; }
</style>
