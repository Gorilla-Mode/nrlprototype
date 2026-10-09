<script lang="ts">
  import Dialog from '../components/Dialog.svelte';
  import { obstacleTypeLabel } from '../reporting/obstacle';
  import { formatSentAt, type Report } from './reportsData';
  import { bulkSendAnnouncement, bulkSendTitle, mergeRetry, reportCount, sendReports, type BulkSendResult, type ReportSender } from './bulkSend';

  interface Props {
    /** The selected Ready reports, in list order. */
    reports: readonly Report[];
    send: ReportSender;
    /** Called once per finished attempt with the reports that were delivered in it. */
    onsent: (reports: readonly Report[]) => void;
    /** Cancel, X, Escape and Done; `attempted` is false only when nothing was sent yet. */
    onclose: (attempted: boolean) => void;
    onviewsent: () => void;
  }

  let { reports, send, onsent, onclose, onviewsent }: Props = $props();
  let dialog = $state<Dialog>();
  let sending = $state(false);
  let result = $state.raw<BulkSendResult | null>(null);
  let sentAt = $state.raw<Date | null>(null);
  let announcement = $state('');
  let count = $derived(reportCount(reports.length));

  async function attempt(targets: readonly Report[]) {
    sending = true;
    const outcome = await sendReports(targets, send);
    onsent(outcome.sent);
    result = result ? mergeRetry(result, outcome) : outcome;
    if (outcome.sent.length > 0) sentAt = new Date();
    announcement = bulkSendAnnouncement(result);
    sending = false;
    await dialog?.focusPrimary();
  }

  const close = () => onclose(result !== null);
</script>

{#snippet details(report: Report)}
  <span class="report-sent-item-name">{report.name}</span>
  <span class="report-sent-item-meta">{obstacleTypeLabel(report.obstacleType)} · {report.heightFeet} ft ({report.heightMeters} m)</span>
{/snippet}

{#snippet confirmSubtitle()}<p>Sent reports can't be edited.</p>{/snippet}
{#snippet receiptSubtitle()}<p>{sentAt ? formatSentAt(sentAt) : ''}</p>{/snippet}

{#snippet cancel()}
  <button type="button" class="button dialog-action-secondary" disabled={sending} onclick={close}>Cancel</button>
{/snippet}
{#snippet sendAction()}
  <button type="button" class="button dialog-action-primary" disabled={sending} onclick={() => attempt(reports)}>
    {sending ? 'Sending…' : `Send ${count}`}
  </button>
{/snippet}
{#snippet viewSent()}
  <button type="button" class="button dialog-action-secondary" disabled={sending} onclick={onviewsent}>View sent</button>
{/snippet}
{#snippet done()}
  <button type="button" class="button dialog-action-primary" disabled={sending} onclick={close}>Done</button>
{/snippet}

<Dialog bind:this={dialog} onclose={close} busy={sending}
  role={result ? 'dialog' : 'alertdialog'}
  title={result ? bulkSendTitle(result) : `Send ${count} to Kartverket?`}
  icon={result && result.failed.length > 0 ? 'warning' : undefined}
  subtitle={result ? (sentAt ? receiptSubtitle : undefined) : confirmSubtitle}
  primary={result ? done : sendAction}
  secondary={result ? (result.sent.length > 0 ? viewSent : undefined) : cancel}>
  <p class="sr-only" role="status" aria-live="polite">{announcement}</p>

  {#if !result}
    <ul class="report-sent-list" aria-label="Selected reports">
      {#each reports as report (report.id)}<li class="report-sent-item">{@render details(report)}</li>{/each}
    </ul>
  {:else}
    {#if result.failed.length > 0}
      <section class="report-sent-failed" aria-labelledby="bulk-send-failed">
        <h3 id="bulk-send-failed">Not sent</h3>
        <ul class="report-sent-list">
          {#each result.failed as { report, reason } (report.id)}
            <li class="report-sent-item report-sent-item-failed">
              <span class="report-sent-mark" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none"><path d="m8 8 8 8M16 8l-8 8" /></svg></span>
              {@render details(report)}
              <span class="report-sent-reason"><span class="sr-only">Not sent: </span>{reason}</span>
            </li>
          {/each}
        </ul>
        <button type="button" class="button report-sent-retry" disabled={sending}
          onclick={() => attempt(result!.failed.map(({ report }) => report))}>
          {sending ? 'Sending…' : 'Try again'}
        </button>
      </section>
    {/if}

    {#if result.sent.length > 0}
      <ul class="report-sent-list" aria-label="Sent reports">
        {#each result.sent as report (report.id)}
          <li class="report-sent-item report-sent-item-done">
            <span class="report-sent-mark" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none"><path d="M5 12.5 10 17.5 19 7" /></svg></span>
            {@render details(report)}
          </li>
        {/each}
      </ul>
      <p class="report-sent-next">Kartverket will review the reports. You'll be notified when each obstacle is registered.</p>
    {/if}
  {/if}
</Dialog>
