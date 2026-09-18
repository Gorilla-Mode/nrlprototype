<script lang="ts">
  import type { Draft } from './types';

  export let draft: Draft;
  export let onEdit: (draft: Draft) => void = () => {};

  const open = () => onEdit(draft);
</script>

<article class="card" on:click={open} role="button" tabindex={0}>
  <div class="card-top">
    <h3 class="title">{draft.title}</h3>
    <span class="badge">Draft</span>
  </div>

  <div class="meta"><span class="type-highlight">{draft.category}</span> · <span class="muted">{draft.value}</span></div>
  <div class="status muted">Step {draft.currentStep} of {draft.totalSteps} · {draft.stepLabel}</div>
  <div class="edited muted">Edited {draft.editedDate}</div>

  <div class="card-footer">
    <button class="edit" on:click|stopPropagation={open}>Edit draft <span class="chev">›</span></button>
  </div>
</article>

<style>
  .card {
    background: var(--color-background-raised);
    border: var(--border-default);
    border-radius: var(--radius-card);
    padding: 18px;
    box-shadow: var(--shadow-surface);
    display: flex;
    flex-direction: column;
    gap: 8px;
    min-height: 160px;
    cursor: pointer;
  }
  .card:focus { outline: 2px solid var(--color-action-selected); }
  .card-top { display:flex; align-items:center; justify-content:space-between; gap:12px }
  .title { margin:0; font-size:17px; font-weight:700; color:var(--color-text-primary) }
  .badge { background:var(--color-background-subtle); color:var(--color-text-secondary); padding:6px 8px; border-radius:var(--radius-pill); font-size:12px }
  .meta { font-size:14px; color:var(--color-text-secondary) }
  .type-highlight { font-weight:700; color:var(--color-text-primary) }
  .muted { color:var(--color-text-secondary); font-size:13px }
  .status { font-size:13px }
  .edited { font-size:13px }
  .card-footer { display:flex; justify-content:flex-end; margin-top:auto }
  .edit { background:transparent; border:0; color:var(--color-action-secondary); font-weight:600; font-size:14px; cursor:pointer }
  .edit:focus { outline: none; }
  .chev { margin-left:6px }
</style>