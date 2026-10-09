<script lang="ts">
  import type { ReportStatus } from './reportsData';

  let { status }: { status: ReportStatus } = $props();

  const labels: Record<ReportStatus, string> = {
    ready: 'Ready',
    pending: 'Sent for review',
    approved: 'Approved',
    declined: 'Declined',
  };
</script>

<span class="reports-status-badge" data-status={status}>{labels[status]}</span>
