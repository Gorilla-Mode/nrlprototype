<script lang="ts">
  import { onMount } from 'svelte';
  import { obstacleTypeLabel } from '../reporting/obstacle';
  import { lightingValueLabel } from '../drafts/types';
  import { coordinateLabel } from './reportGeometry';
  import { formatSentAt, type Report } from './reportsData';

  interface Props {
    report: Report;
    /** When sending succeeded, read in the UI only; reports store no time of day. */
    sentAt: Date;
    onbacktoreports: () => void;
    /** X and Escape: dismiss and stay where the report was sent from. */
    onclose: () => void;
  }

  let { report, sentAt, onbacktoreports, onclose }: Props = $props();
  const titleId = $props.id();
  let dialog: HTMLDialogElement;
  let primary: HTMLButtonElement;

  // A null value is shown as a muted "Not set".
  let rows = $derived([
    { label: 'Obstacle type', value: obstacleTypeLabel(report.obstacleType) },
    { label: 'Height', value: `${report.heightFeet} ft (${report.heightMeters} m)` },
    { label: 'Lighting', value: report.lighting === null ? null : lightingValueLabel(report.lighting) },
    { label: 'Location', value: coordinateLabel(report.geometry) },
  ]);

  onMount(() => {
    dialog.showModal();
    primary.focus({ preventScroll: true });
    return () => { if (dialog.open) dialog.close(); };
  });

  function keydown(event: KeyboardEvent) {
    if (event.key !== 'Escape') return;
    // Handled here so the Reports page's own Escape handler does not also close the page.
    event.preventDefault();
    event.stopPropagation();
    onclose();
  }
</script>

<dialog class="dialog-shell report-sent" bind:this={dialog} aria-labelledby={titleId} aria-describedby={`${titleId}-name ${titleId}-when`}
  oncancel={(event) => { event.preventDefault(); onclose(); }} onkeydown={keydown}>
  <button class="report-sent-close" type="button" aria-label="Close" onclick={onclose}>
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="m6 6 12 12M6 18 18 6" /></svg>
  </button>

  <header class="report-sent-header">
    <span class="report-sent-icon" aria-hidden="true">
      <svg viewBox="0 0 24 24" fill="none"><path d="M5 12.5 10 17.5 19 7" /></svg>
    </span>
    <h2 id={titleId}>Sent for review</h2>
    <p id={`${titleId}-name`} class="report-sent-name">{report.name}</p>
    <p id={`${titleId}-when`} class="report-sent-when">{formatSentAt(sentAt)}</p>
  </header>

  <div class="report-sent-body">
    <table class="report-sent-table">
      <tbody>
        {#each rows as row (row.label)}
          <tr>
            <th scope="row">{row.label}</th>
            <td class:report-sent-unset={row.value === null}>{row.value ?? 'Not set'}</td>
          </tr>
        {/each}
      </tbody>
    </table>
    <p class="report-sent-next">Kartverket will review the report. You don't need to do anything else, and you'll be notified when the obstacle is registered.</p>
  </div>

  <footer class="report-sent-footer">
    <button bind:this={primary} type="button" class="button report-sent-primary" onclick={onbacktoreports}>Back to reports</button>
  </footer>
</dialog>

<style>
  .report-sent { position: relative; width: min(var(--report-panel-max), calc(100dvw - var(--map-control-inset-left) - var(--map-control-inset-right))); max-height: calc(100dvh - var(--map-control-inset-top) - var(--map-control-inset-bottom)); overflow-y: auto; margin: auto; padding: 0; }
  .report-sent::backdrop { background: var(--color-background-scrim); }

  /* Quiet close: no filled circle, so it does not compete with the check. */
  .report-sent-close { position: absolute; top: var(--space-2); right: var(--space-2); display: grid; place-items: center; width: var(--target-size-min); height: var(--target-size-min); padding: 0; border: 0; border-radius: var(--radius-round); background: transparent; color: var(--color-text-secondary); cursor: pointer; }
  .report-sent-close:hover { background: var(--color-map-control-hover); color: var(--color-text-primary); }
  .report-sent-close svg { width: var(--icon-size-default); height: var(--icon-size-default); }
  svg { stroke: currentColor; stroke-width: var(--icon-stroke-width); stroke-linecap: round; stroke-linejoin: round; }

  .report-sent-header { display: flex; flex-direction: column; align-items: center; gap: var(--space-1); padding: var(--space-6) var(--dialog-padding-inline) 0; text-align: center; }
  /* Green appears only here. --color-text-inverse keeps the check legible in both themes. */
  .report-sent-icon { display: grid; place-items: center; width: calc(var(--target-size-min) + var(--space-4)); height: calc(var(--target-size-min) + var(--space-4)); margin-bottom: var(--space-2); border-radius: var(--radius-round); background: var(--color-status-success); color: var(--color-text-inverse); }
  .report-sent-icon svg { width: var(--space-8); height: var(--space-8); stroke-width: calc(var(--icon-stroke-width) + 0.75); }
  .report-sent-header h2 { margin: 0; font-size: var(--font-size-heading-small); font-weight: var(--font-weight-semibold); line-height: var(--line-height-tight); }
  .report-sent-header p { margin: 0; overflow-wrap: anywhere; }
  .report-sent-name { color: var(--color-text-primary); font-size: var(--font-size-body); }
  .report-sent-when { color: var(--color-text-secondary); font-size: var(--font-size-body-small); }

  .report-sent-body { padding: var(--space-4) var(--dialog-padding-inline) 0; }
  /* Same table look as the report summary elsewhere in the app. */
  .report-sent-table { width: 100%; border-collapse: collapse; }
  .report-sent-table tr + tr { border-top: var(--border-default); }
  .report-sent-table th, .report-sent-table td { padding: var(--space-3) 0; text-align: left; font-weight: var(--font-weight-regular); vertical-align: top; }
  .report-sent-table th { width: 40%; color: var(--color-text-secondary); font-weight: var(--font-weight-medium); }
  .report-sent-table td { color: var(--color-text-primary); overflow-wrap: anywhere; }
  .report-sent-table td.report-sent-unset { color: var(--color-text-secondary); }
  .report-sent-next { margin: var(--space-3) 0 0; color: var(--color-text-secondary); font-size: var(--font-size-body-small); line-height: var(--line-height-body); }

  .report-sent-footer { display: flex; justify-content: center; padding: var(--space-5) var(--dialog-padding-inline) var(--space-6); }
  /* The app's blue action colour, not the green primary button. */
  .report-sent-primary { min-width: 12rem; border-color: var(--color-action-secondary); background: var(--color-action-secondary); color: var(--color-text-inverse); font-weight: var(--font-weight-semibold); }
  .report-sent-primary:not(:disabled):hover { border-color: var(--color-action-secondary-hover); background: var(--color-action-secondary-hover); }
  .report-sent-primary:not(:disabled):active { opacity: var(--opacity-subdued); background: var(--color-action-secondary); }
  @media (max-width: 37.499rem) { .report-sent-primary { width: 100%; } }
</style>
