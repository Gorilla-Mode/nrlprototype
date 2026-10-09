<script lang="ts">
  import type { Draft } from './types';
  import { obstacleTypeLabel } from '../reporting/obstacle';
  import { isoDate, relativeDate } from '../reports/reportsData';

  export let draft: Draft;
  export let onEdit: (draft: Draft) => void = () => {};

  const open = () => onEdit(draft);
</script>

<button type="button" class="reports-card" on:click={open}>
  <div class="reports-card-main">
    <div class="reports-card-top">
      <span class="reports-card-name">{draft.title}</span>
      <span class="reports-status-badge" data-status="draft">Draft</span>
    </div>

    <div class="reports-card-info">
      <span>{obstacleTypeLabel(draft.category)}</span>
      <span class="reports-card-dot" aria-hidden="true">·</span>
      <span>{draft.value}</span>
    </div>
    <div class="reports-card-step">Step {draft.currentStep} of {draft.totalSteps} · {draft.stepLabel}</div>
  </div>

  <div class="reports-card-bottom">
    <span class="reports-card-meta">
      <time datetime={isoDate(draft.editedDate)} title={draft.editedDate}>Edited {relativeDate(draft.editedDate)}</time>
    </span>
    <span class="reports-card-cta card-cta-link">
      Edit draft
      <svg viewBox="0 0 9 16" fill="none" aria-hidden="true"><path d="M1.5 1.5 7.5 8l-6 6.5" /></svg>
    </span>
  </div>
</button>
