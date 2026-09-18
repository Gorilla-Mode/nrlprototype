<script lang="ts">
  import StatusBadge from './StatusBadge.svelte';
  import { reportActionLabel, reportSecondaryLine, type Report } from './reportsData';

  let { report, onopen }: { report: Report; onopen: (report: Report) => void } = $props();
</script>

<button type="button" class="reports-card" onclick={() => onopen(report)}>
  <div class="reports-card-top">
    <span class="reports-card-name">{report.name}</span>
    <StatusBadge status={report.status} />
  </div>

  <div class="reports-card-info">
    <span class="reports-card-type">{report.obstacleType}</span>
    <span class="reports-card-dot" aria-hidden="true">·</span>
    <span>{report.heightFeet} ft ({report.heightMeters} m)</span>
  </div>

  <div class="reports-card-bottom">
    <span class="reports-card-dates">
      <span>Created {report.createdDate}</span>
      <span class:reports-card-declined={report.status === 'declined'}>{reportSecondaryLine(report)}</span>
    </span>
    <span class="reports-card-cta">
      {reportActionLabel(report)}
      <svg viewBox="0 0 9 16" fill="none" aria-hidden="true"><path d="M1.5 1.5 7.5 8l-6 6.5" /></svg>
    </span>
  </div>
</button>
