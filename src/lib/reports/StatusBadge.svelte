<script lang="ts">
  import type { ReportStatus } from './reportsData';

  /** A report's or draft's status as a Designsystemet tag; the label always names the status. */
  let { status }: { status: ReportStatus | 'draft' } = $props();

  // One name per status everywhere: the Reports filter says "Ready to send", so do the cards.
  const labels: Record<ReportStatus | 'draft', string> = {
    draft: 'Draft',
    ready: 'Ready to send',
    pending: 'Sent',
    approved: 'Approved',
    declined: 'Declined',
  };
</script>

<!-- Colours come from the --color-status-* tokens, set per data-status in stylesheet.css. -->
<span class="ds-tag reports-status-badge" data-size="sm" data-status={status}>{labels[status]}</span>
