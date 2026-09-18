<script lang="ts">
  import type { Report } from './types';

  export let report: Report;
  export let onOpen: (report: Report) => void = () => {};

  const open = () => onOpen(report);
</script>

<article class="card" on:click={open} role="button" tabindex={0}>
  <div class="card-top">
    <h3 class="title">{report.title}</h3>
    <span class="badge">Ready</span>
  </div>

  <div class="meta"><span class="type-highlight">{report.category}</span> · <span class="muted">{report.value}</span></div>
  <div class="status muted">Ready to send for review</div>
  <div class="edited muted">Edited {report.editedDate}</div>

  <div class="card-footer">
    <button class="edit" on:click|stopPropagation={open}>View report <span class="chev">›</span></button>
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
  .badge { background:var(--color-status-info-surface); color:var(--color-status-info); padding:6px 8px; border-radius:var(--radius-pill); font-size:12px; font-weight:600 }
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
