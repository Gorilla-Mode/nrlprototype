<script lang="ts">
  import StatusBadge from '../reports/StatusBadge.svelte';
  import type { Draft } from './types';
  import { heightInMeters } from './types';
  import { formatShortDate, obstacleHeading, relativeDate } from '../reports/reportsData';
  import { errorKindsLabel, errorReportHeading } from '../obstacles/errorReport';

  export let draft: Draft;
  export let onEdit: (draft: Draft) => void = () => {};
  /** Drafts cannot be sent from select mode, so they are dimmed and do nothing there. */
  export let selectMode = false;
  /** Briefly marks the draft the reporting flow just saved. */
  export let justSaved = false;
  /** Id of the page's text explaining why a card cannot be selected. */
  export let unavailableHint: string | undefined = undefined;

  const open = () => { if (!selectMode) onEdit(draft); };
</script>

<button type="button" class="ds-card reports-card" class:reports-card-dimmed={selectMode} class:reports-card-just-saved={justSaved} on:click={open}
  aria-disabled={selectMode ? true : undefined} aria-describedby={selectMode ? unavailableHint : undefined}>
  <div class="reports-card-main">
    <div class="reports-card-top">
      {#if draft.errorReport}
        <span class="reports-card-name">{errorReportHeading(draft.errorReport)}</span>
      {:else if draft.typeMissing}
        <!-- No type chosen: never shown as Other, which is a real choice. -->
        {@const meters = heightInMeters(draft.heightAboveGround)}
        <span class="reports-card-name"><span class="reports-card-untitled">Untitled obstacle</span>{#if meters !== null && meters > 0}{' · '}{meters}&nbsp;m{/if}</span>
      {:else}
        <span class="reports-card-name">{obstacleHeading(draft.category, heightInMeters(draft.heightAboveGround))}</span>
      {/if}
      <StatusBadge status="draft" />
    </div>

    <!-- The optional name; empty when the pilot gave none. -->
    <div class="reports-card-info">{draft.errorReport ? errorKindsLabel(draft.errorReport.answers.errorKinds) : draft.title}</div>
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
