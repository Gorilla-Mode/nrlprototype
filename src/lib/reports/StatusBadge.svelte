<script lang="ts">
  import type { ReportStatus } from './reportsData';

  let { status }: { status: ReportStatus } = $props();

  const labels: Record<ReportStatus, string> = {
    ready: 'Not sent',
    pending: 'Sent',
    approved: 'Approved',
    declined: 'Declined',
  };
</script>

<span class="reports-status-badge" data-status={status}>{labels[status]}</span>
