<script lang="ts">
  import StatusBadge from './StatusBadge.svelte';
  import { reportActionLabel, reportSecondaryLine, type Report } from './reportsData';

  let { report, onopen, selectMode = false, selected = false, ontoggleselect }: {
    report: Report;
    onopen: (report: Report) => void;
    selectMode?: boolean;
    selected?: boolean;
    ontoggleselect?: (report: Report) => void;
  } = $props();

  // Only ready reports can be sent to the registrar, so only those are selectable.
  let selectable = $derived(report.status === 'ready');

  function handleClick() {
    if (selectMode && selectable) ontoggleselect?.(report);
    else onopen(report);
  }
</script>

<button
  type="button"
  class="reports-card"
  class:reports-card-selected={selectMode && selectable && selected}
  class:reports-card-dimmed={selectMode && !selectable}
  aria-pressed={selectMode && selectable ? selected : undefined}
  onclick={handleClick}
>
  <div class="reports-card-top">
    {#if selectMode && selectable}
      <span class="reports-card-checkbox" class:checked={selected} aria-hidden="true">
        {#if selected}
          <svg viewBox="0 0 16 16" fill="none"><path d="M3 8.5l3 3 7-7" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" /></svg>
        {/if}
      </span>
    {/if}
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
    {#if !selectMode}
      <span class="reports-card-cta">
        {reportActionLabel(report)}
        <svg viewBox="0 0 9 16" fill="none" aria-hidden="true"><path d="M1.5 1.5 7.5 8l-6 6.5" /></svg>
      </span>
    {/if}
  </div>
</button>

<style>
  .reports-card-checkbox {
    flex: none;
    display: flex;
    align-items: center;
    justify-content: center;
    width: var(--space-6);
    height: var(--space-6);
    border: var(--border-strong);
    border-radius: var(--radius-small);
    color: var(--color-text-inverse);
    background: var(--color-background-raised);
  }
  .reports-card-checkbox.checked {
    background: var(--color-action-secondary);
    border-color: var(--color-action-secondary);
  }
  .reports-card-checkbox svg { width: var(--space-4); height: var(--space-4); }

  .reports-card-selected { border-color: var(--color-action-secondary); background: var(--color-action-selected); }
  .reports-card-dimmed { opacity: var(--opacity-subdued); }
</style>
