<script lang="ts">
  import { tick } from 'svelte';
  import Dialog from '../components/Dialog.svelte';
  import LocationEditor from '../map/LocationEditor.svelte';
  import { obstacleGeometryChoices, obstacleTypeChoices, ObstacleType, type ObstacleGeometry } from './obstacle';
  import { illuminationLabels, type CompleteReport } from './createDetailsController';

  let { report, totalSteps, onedit, ongeometry, onsend, oncontinue, onclose }: {
    report: CompleteReport;
    /** Steps in the flow that produced the report; optional details are on the last one. */
    totalSteps: number;
    /** Reopens the reporting step that holds a row's value. */
    onedit: (step: number) => void;
    /** A new location from the location editor; the summary stays open. */
    ongeometry: (geometry: ObstacleGeometry) => void;
    /** Sends the saved report for review. */
    onsend: () => void;
    /** Back to the map; the report stays saved, not sent. */
    oncontinue: () => void;
    /** X and Escape: back to the map; the report stays saved. */
    onclose: () => void;
  } = $props();
  let geometryChoice = $derived(obstacleGeometryChoices.find((choice) => choice.type === report.obstacle_position.type));
  let typeChoice = $derived(obstacleTypeChoices.find((choice) => choice.type === report.type));
  // Geometry is drawn on the map, not in a reporting step; it is edited in the location editor.
  let rows = $derived<{ label: string; value: string; step?: number }[]>([
    { label: 'Geometry', value: geometryChoice?.label ?? '—' },
    { label: 'Obstacle type', value: report.type === ObstacleType.Other ? (report.customType || 'Other') : (typeChoice?.label ?? '—'), step: 1 },
    { label: 'Height', value: report.height + ' m', step: 1 },
    { label: 'Lighting', value: illuminationLabels[report.illumination], step: 1 },
    { label: 'Description', value: report.description || 'Not added', step: totalSteps },
    { label: 'Photos', value: report.photos.length ? report.photos.map((photo) => photo.name).join(', ') : 'Not added', step: totalSteps },
  ]);
  let editingGeometry = $state(false);
  let geometryButton = $state<HTMLButtonElement>();

  async function closeGeometryEditor() {
    editingGeometry = false;
    await tick();
    geometryButton?.focus({ preventScroll: true });
  }

  function useGeometry(geometry: ObstacleGeometry) {
    ongeometry(geometry);
    void closeGeometryEditor();
  }
</script>

{#snippet pencil()}
  <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M4 20h4L19 9l-4-4L4 16v4ZM13.5 6.5l4 4" /></svg>
{/snippet}

{#snippet subtitle()}
  <p>Your report is saved and ready to send. You can send it now, or continue and finish it later.</p>
{/snippet}

{#snippet saveAndContinue()}
  <button type="button" class="ds-button summary-action" data-variant="primary" onclick={oncontinue}>Save and continue</button>
{/snippet}

{#snippet sendReport()}
  <button type="button" class="ds-button dialog-action-secondary summary-action" data-variant="tertiary" data-color="brand1" onclick={onsend}>Send report</button>
{/snippet}

<Dialog title="Report saved – not sent yet" {subtitle} primary={saveAndContinue} secondary={sendReport} stackedActions {onclose}>
  <table class="summary-table">
    <tbody>
      {#each rows as row (row.label)}
        <tr>
          <th scope="row">{row.label}</th>
          <td>{row.value}</td>
          <td class="summary-edit-cell">
            {#if row.step !== undefined}
              {@const step = row.step}
              <button type="button" class="summary-edit" aria-label={`Edit ${row.label.toLowerCase()}`} onclick={() => onedit(step)}>{@render pencil()}</button>
            {:else}
              <button type="button" class="summary-edit" aria-label="Edit geometry" aria-haspopup="dialog" bind:this={geometryButton}
                onclick={() => { editingGeometry = true; }}>{@render pencil()}</button>
            {/if}
          </td>
        </tr>
      {/each}
    </tbody>
  </table>
  {#if editingGeometry}
    <LocationEditor geometry={report.obstacle_position} onuse={useGeometry} oncancel={closeGeometryEditor} />
  {/if}
</Dialog>

<style>
  .summary-table { width: 100%; border-collapse: collapse; }
  .summary-table tr + tr { border-top: var(--border-default); }
  .summary-table th, .summary-table td { padding: var(--space-1) 0; text-align: left; font-weight: var(--font-weight-regular); vertical-align: middle; }
  .summary-table th { width: 40%; padding-right: var(--space-3); color: var(--color-text-secondary); font-weight: var(--font-weight-medium); }
  .summary-table td { color: var(--color-text-primary); overflow-wrap: anywhere; }
  .summary-table .summary-edit-cell { width: var(--target-size-min); padding-left: var(--space-2); }
  /* Large, full-width targets: the dialog is used in flight. */
  .summary-action { min-height: var(--control-height-large); }
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
