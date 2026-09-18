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

  <div class="meta">{draft.category} · <span class="muted">{draft.value}</span></div>
  <div class="status muted">Step {draft.currentStep} of {draft.totalSteps} · {draft.stepLabel}</div>
  <div class="edited muted">Edited {draft.editedDate}</div>

  <div class="card-footer">
    <button class="edit" on:click|stopPropagation={open}>Edit draft <span class="chev">›</span></button>
  </div>
</article>

<style>
  :global(:root) { --blue: #2F6FED; --text: #1C1C1E; --muted: #8E8E93; --card-border: #E5E5EA; }
  .card {
    background: #fff;
    border: 1px solid var(--card-border);
    border-radius: 14px;
    padding: 18px;
    box-shadow: 0 2px 8px rgba(28,28,30,0.06);
    display: flex;
    flex-direction: column;
    gap: 8px;
    min-height: 160px;
    cursor: pointer;
  }
  .card:focus { outline: 2px solid rgba(47,111,237,0.15); }
  .card-top { display:flex; align-items:center; justify-content:space-between; gap:12px }
  .title { margin:0; font-size:17px; font-weight:700; color:var(--text) }
  .badge { background:#EFEFF0; color:#3A3A3C; padding:6px 8px; border-radius:999px; font-size:12px }
  .meta { font-size:14px; color:var(--muted) }
  .muted { color:var(--muted); font-size:13px }
  .status { font-size:13px }
  .edited { font-size:13px }
  .card-footer { display:flex; justify-content:flex-end; margin-top:auto }
  .edit { background:transparent; border:0; color:var(--blue); font-weight:600; font-size:14px; cursor:pointer }
  .edit:focus { outline: none; }
  .chev { margin-left:6px }
</style>