<script lang="ts">
  import Dialog from '../components/Dialog.svelte';
  import { obstacleGeometryChoices, obstacleTypeChoices, ObstacleType } from './obstacle';
  import { illuminationLabels, type CompleteReport } from './createDetailsController';

  let { report, totalSteps, onedit, onreports, onreportanother, onclose }: {
    report: CompleteReport;
    /** Steps in the flow that produced the report; optional details are on the last one. */
    totalSteps: number;
    /** Reopens the reporting step that holds a row's value. */
    onedit: (step: number) => void;
    onreports: () => void;
    onreportanother: () => void;
    /** X and Escape: back to the map; the report stays saved. */
    onclose: () => void;
  } = $props();
  let geometryChoice = $derived(obstacleGeometryChoices.find((choice) => choice.type === report.obstacle_position.type));
  let typeChoice = $derived(obstacleTypeChoices.find((choice) => choice.type === report.type));
  // Geometry is drawn on the map, not in a reporting step, so it has no edit action.
  let rows = $derived<{ label: string; value: string; step?: number }[]>([
    { label: 'Geometry', value: geometryChoice?.label ?? '—' },
    { label: 'Obstacle type', value: report.type === ObstacleType.Other ? (report.customType || 'Other') : (typeChoice?.label ?? '—'), step: 1 },
    { label: 'Height', value: report.height + ' m', step: 1 },
    { label: 'Lighting', value: illuminationLabels[report.illumination], step: 1 },
    { label: 'Description', value: report.description || 'Not added', step: totalSteps },
    { label: 'Photos', value: report.photos.length ? report.photos.map((photo) => photo.name).join(', ') : 'Not added', step: totalSteps },
  ]);
</script>

{#snippet subtitle()}
  <p>Your report is saved as a draft under Reports. For safety, reports are not sent automatically. Review it and send it from Reports when you're ready.</p>
{/snippet}

{#snippet goToReports()}
  <button type="button" class="button button--primary" onclick={onreports}>Go to Reports</button>
{/snippet}

{#snippet reportAnother()}
  <button type="button" class="button dialog-action-secondary" onclick={onreportanother}>Report another obstacle</button>
{/snippet}

<Dialog title="Report saved – not sent yet" {subtitle} primary={goToReports} secondary={reportAnother} {onclose}>
  <table class="summary-table">
    <tbody>
      {#each rows as row (row.label)}
        <tr>
          <th scope="row">{row.label}</th>
          <td>{row.value}</td>
          <td class="summary-edit-cell">
            {#if row.step !== undefined}
              {@const step = row.step}
              <button type="button" class="summary-edit" aria-label={`Edit ${row.label.toLowerCase()}`} onclick={() => onedit(step)}>
                <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M4 20h4L19 9l-4-4L4 16v4ZM13.5 6.5l4 4" /></svg>
              </button>
            {/if}
          </td>
        </tr>
      {/each}
    </tbody>
  </table>
</Dialog>

<style>
  .summary-table { width: 100%; border-collapse: collapse; }
  .summary-table tr + tr { border-top: var(--border-default); }
  .summary-table th, .summary-table td { padding: var(--space-1) 0; text-align: left; font-weight: var(--font-weight-regular); vertical-align: middle; }
  .summary-table th { width: 40%; padding-right: var(--space-3); color: var(--color-text-secondary); font-weight: var(--font-weight-medium); }
  .summary-table td { color: var(--color-text-primary); overflow-wrap: anywhere; }
  .summary-table .summary-edit-cell { width: var(--target-size-min); padding-left: var(--space-2); }
  .summary-edit {
    display: grid; place-items: center;
    width: var(--target-size-min); height: var(--target-size-min); padding: 0;
    border: 0; border-radius: var(--radius-round); background: transparent;
    color: var(--color-action-secondary); cursor: pointer;
  }
  .summary-edit:hover { background: var(--color-map-control-hover); }
  .summary-edit svg {
    width: var(--icon-size-default); height: var(--icon-size-default);
    stroke: currentColor; stroke-width: var(--icon-stroke-width); stroke-linecap: round; stroke-linejoin: round;
  }
</style>
