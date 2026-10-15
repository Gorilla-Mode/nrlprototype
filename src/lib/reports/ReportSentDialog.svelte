<script lang="ts">
  import Dialog from '../components/Dialog.svelte';
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

  // A null value is shown as a muted "Not set".
  let rows = $derived([
    { label: 'Obstacle type', value: obstacleTypeLabel(report.obstacleType) },
    { label: 'Height', value: `${report.heightFeet} ft (${report.heightMeters} m)` },
    { label: 'Lighting', value: report.lighting === null ? null : lightingValueLabel(report.lighting) },
    { label: 'Location', value: coordinateLabel(report.geometry) },
  ]);
</script>

{#snippet subtitle()}
  <p class="report-sent-name">{report.name}</p>
  <p>{formatSentAt(sentAt)}</p>
{/snippet}

{#snippet backToReports()}
  <button type="button" class="button dialog-action-primary" onclick={onbacktoreports}>Back to reports</button>
{/snippet}

<Dialog title="Sent for review" {subtitle} primary={backToReports} {onclose}>
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
</Dialog>
