<script lang="ts">
  import StatusBadge from '../reports/StatusBadge.svelte';
  import type { Draft } from './types';
  import { heightInMeters } from './types';
  import { formatShortDate, obstacleHeading, relativeDate } from '../reports/reportsData';

  export let draft: Draft;
  export let onEdit: (draft: Draft) => void = () => {};
  /** Drafts cannot be sent from select mode, so they are dimmed and do nothing there. */
  export let selectMode = false;
  /** Id of the page's text explaining why a card cannot be selected. */
  export let unavailableHint: string | undefined = undefined;

  const open = () => { if (!selectMode) onEdit(draft); };
</script>

<button type="button" class="ds-card reports-card" class:reports-card-dimmed={selectMode} on:click={open}
  aria-disabled={selectMode ? true : undefined} aria-describedby={selectMode ? unavailableHint : undefined}>
  <div class="reports-card-main">
    <div class="reports-card-top">
      <span class="reports-card-name">{obstacleHeading(draft.category, heightInMeters(draft.heightAboveGround))}</span>
      <StatusBadge status="draft" />
    </div>

    <!-- The optional name; empty when the pilot gave none. -->
    <div class="reports-card-info">{draft.title}</div>
    <div class="reports-card-step">Step {draft.currentStep} of {draft.totalSteps} · {draft.stepLabel}</div>
  </div>

  <div class="reports-card-bottom">
    <span class="reports-card-meta">
      <time datetime={draft.updatedAt} title={formatShortDate(draft.updatedAt)}>Edited {relativeDate(draft.updatedAt)}</time>
    </span>
    {#if !selectMode}
      <span class="reports-card-cta card-cta-link">
        Edit draft
        <svg viewBox="0 0 9 16" fill="none" aria-hidden="true"><path d="M1.5 1.5 7.5 8l-6 6.5" /></svg>
      </span>
    {/if}
  </div>
</button>
