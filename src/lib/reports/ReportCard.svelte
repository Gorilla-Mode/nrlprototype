<script lang="ts">
  import StatusBadge from './StatusBadge.svelte';
  import { formatShortDate, reportActionLabel, reportActivity, reportHeading, reportProgressLine, type Report } from './reportsData';

  let { report, onopen, selectMode = false, selected = false, ontoggleselect, justSent = false, unavailableHint }: {
    report: Report;
    onopen: (report: Report) => void;
    selectMode?: boolean;
    selected?: boolean;
    ontoggleselect?: (report: Report) => void;
    /** Briefly tints the card after it was sent from select mode. */
    justSent?: boolean;
    /** Id of the page's text explaining why a card cannot be selected. */
    unavailableHint?: string;
  } = $props();

  // Only ready reports can be sent to the registrar, so only those are selectable.
  let selectable = $derived(report.status === 'ready');
  let activity = $derived(reportActivity(report));

  // In select mode a card only selects; cards that cannot be selected do nothing.
  function handleClick() {
    if (!selectMode) onopen(report);
    else if (selectable) ontoggleselect?.(report);
  }
</script>

<button
  type="button"
  class="reports-card"
  class:reports-card-selected={selectMode && selectable && selected}
  class:reports-card-dimmed={selectMode && !selectable}
  class:reports-card-just-sent={justSent}
  aria-pressed={selectMode && selectable ? selected : undefined}
  aria-disabled={selectMode && !selectable ? true : undefined}
  aria-describedby={selectMode && !selectable ? unavailableHint : undefined}
  onclick={handleClick}
>
  <div class="reports-card-main">
    <div class="reports-card-top">
      {#if selectMode && selectable}
        <span class="reports-card-checkbox" class:checked={selected} aria-hidden="true">
          {#if selected}
            <svg viewBox="0 0 16 16" fill="none"><path d="M3 8.5l3 3 7-7" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" /></svg>
          {/if}
        </span>
      {/if}
      <span class="reports-card-name">{reportHeading(report)}</span>
      <StatusBadge status={report.status} />
    </div>

    <!-- The optional name; empty when the pilot gave none. -->
    <div class="reports-card-info">{report.name}</div>
    <div class="reports-card-step">{reportProgressLine(report)}</div>
  </div>

  <div class="reports-card-bottom">
    <span class="reports-card-meta">
      {#if activity.date}<time datetime={activity.date} title={formatShortDate(activity.date)}>{activity.text}</time>{:else}{activity.text}{/if}
    </span>
    {#if !selectMode}
      <span class="reports-card-cta card-cta-link">
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
</style>
