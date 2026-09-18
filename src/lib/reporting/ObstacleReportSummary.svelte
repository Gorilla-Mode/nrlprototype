<script lang="ts">
  import { onMount } from 'svelte';
  import { obstacleGeometryChoices, obstacleTypeChoices, ObstacleType, type Obstacle } from './obstacle';
  import { formatHeightLabel, type ObstacleReportDraft } from './obstacleReportDraft';

  let { obstacle, draft, mode, onclose }: {
    obstacle: Obstacle;
    draft: ObstacleReportDraft;
    mode: 'draft' | 'finished';
    onclose: () => void;
  } = $props();

  let dialog: HTMLDialogElement;

  onMount(() => {
    dialog.showModal();
    return () => { if (dialog.open) dialog.close(); };
  });

  let geometryChoice = $derived(
    obstacleGeometryChoices.find((choice) => choice.type === obstacle.obstacle_position.type),
  );
  let typeChoice = $derived(obstacleTypeChoices.find((choice) => choice.type === draft.obstacleType));

  const lightingLabels = { unknown: 'Unknown', lit: 'Lit', none: 'No lighting' } as const;

  let rows = $derived([
    { label: 'Geometry', value: geometryChoice?.label ?? '—' },
    { label: 'Obstacle type', value: draft.obstacleType === ObstacleType.Other ? (draft.otherTypeLabel || 'Other') : (typeChoice?.label ?? '—') },
    { label: 'Height', value: draft.notPresent || draft.height === null ? '—' : formatHeightLabel(draft.height, draft.heightUnit) },
    { label: 'Lighting', value: lightingLabels[draft.lighting] },
    { label: 'Description', value: draft.descriptionEnabled ? (draft.description || '—') : 'Not added' },
    { label: 'Not present', value: draft.notPresent ? 'Yes' : 'No' },
  ]);
</script>

<dialog class="obstacle-report-dialog dialog-shell summary-panel" bind:this={dialog} aria-labelledby="summary-heading">
  <header class="dialog-header">
    <h2 id="summary-heading">{mode === 'draft' ? 'Draft saved' : 'Report completed'}</h2>
    <p class="summary-note">Prototype summary — not sent anywhere yet.</p>
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
  .summary-panel { max-width: var(--report-panel-max); margin: auto; padding: 0; border: var(--border-default); }
  .summary-panel h2 { margin: 0; font-size: var(--font-size-heading-small); }
  .summary-note { margin: var(--space-1) 0 0; color: var(--color-text-secondary); font-size: var(--font-size-body-small); }
  .summary-table { width: 100%; border-collapse: collapse; }
  .summary-table tr + tr { border-top: var(--border-default); }
  .summary-table th, .summary-table td { padding: var(--space-3) 0; text-align: left; font-weight: var(--font-weight-regular); vertical-align: top; }
  .summary-table th { width: 40%; color: var(--color-text-secondary); font-weight: var(--font-weight-medium); }
  .summary-table td { color: var(--color-text-primary); overflow-wrap: anywhere; }
  .summary-footer { display: flex; justify-content: flex-end; }
</style>
