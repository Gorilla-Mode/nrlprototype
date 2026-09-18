<script lang="ts">
  import type { GeometryFilter, HeightFilter } from './types';

  export let geometries: Set<GeometryFilter>;
  export let heightFilter: HeightFilter;
  export let resultCount: number;
  export let onReset: () => void;
  export let onApply: () => void;
  export let onDismiss: () => void;

  const geometryOptions: GeometryFilter[] = ['Point', 'Line', 'Area'];
  const heightOptions: { id: HeightFilter; label: string }[] = [
    { id: 'any', label: 'Any height' },
    { id: 'under30', label: 'Under 30 m' },
    { id: '30to60', label: '30 – 60 m' },
    { id: 'over60', label: 'Over 60 m' }
  ];

  function toggleGeometry(g: GeometryFilter) {
    const next = new Set(geometries);
    if (next.has(g)) next.delete(g);
    else next.add(g);
    geometries = next;
  }

  function selectHeight(h: HeightFilter) {
    heightFilter = h;
  }

  function onKeydown(e: KeyboardEvent) {
    if (e.key === 'Escape') onDismiss();
  }
</script>

<svelte:window on:keydown={onKeydown} />

<div class="overlay" on:click={onDismiss} role="presentation"></div>

<div class="panel" role="dialog" aria-label="Filter">
  <div class="panel-header">
    <h2>Filter</h2>
    <button class="reset" on:click={onReset}>Reset</button>
  </div>

  <div class="section-label">GEOMETRY</div>
  <div class="option-list">
    {#each geometryOptions as g}
      <button class="option checkbox-option" class:selected={geometries.has(g)} on:click={() => toggleGeometry(g)}>
        <span class="box">{#if geometries.has(g)}✓{/if}</span>
        {g}
      </button>
    {/each}
  </div>

  <div class="section-label">HEIGHT</div>
  <div class="option-list">
    {#each heightOptions as h}
      <button class="option radio-option" class:selected={heightFilter === h.id} on:click={() => selectHeight(h.id)}>
        {h.label}
        {#if heightFilter === h.id}<span class="check">✓</span>{/if}
      </button>
    {/each}
  </div>

  <button class="apply" on:click={onApply}>Show {resultCount} {resultCount === 1 ? 'result' : 'results'}</button>
</div>

<style>
  .overlay { position: fixed; inset: 0; z-index: 20; background: transparent; border: 0; padding: 0; }

  .panel {
    position: absolute;
    top: calc(100% + 8px);
    right: 0;
    z-index: 21;
    width: 300px;
    background: #fff;
    border-radius: 16px;
    box-shadow: 0 12px 32px rgba(28,28,30,0.18);
    padding: 20px;
    box-sizing: border-box;
  }

  .panel-header { display:flex; align-items:center; justify-content:space-between; margin-bottom:16px }
  .panel-header h2 { margin:0; font-size:20px }
  .reset { background:transparent; border:0; color:var(--blue, #2F6FED); font-weight:600; font-size:14px; cursor:pointer; padding:0 }

  .section-label { font-size:11px; font-weight:700; letter-spacing:0.06em; color:var(--muted, #8E8E93); margin: 16px 0 8px }
  .section-label:first-of-type { margin-top: 0 }

  .option-list { display:flex; flex-direction:column; gap:8px }
  .option {
    display:flex; align-items:center; gap:10px;
    width:100%; text-align:left; font-size:15px; color:#1C1C1E;
    background:#fff; border:1px solid #D1D1D6; border-radius:10px;
    padding:10px 12px; cursor:pointer; box-sizing:border-box;
  }
  .radio-option { justify-content:space-between }
  .option.selected { background:#EAF1FE; border-color: var(--blue, #2F6FED); color: var(--blue, #2F6FED); font-weight:600 }

  .box { width:18px; height:18px; border-radius:5px; border:1.5px solid #C7C7CC; display:flex; align-items:center; justify-content:center; font-size:12px; color:#fff; flex-shrink:0 }
  .checkbox-option.selected .box { background: var(--blue, #2F6FED); border-color: var(--blue, #2F6FED) }
  .check { color: var(--blue, #2F6FED); font-weight:700 }

  .apply {
    width:100%; margin-top:20px; padding:14px; border:0; border-radius:12px;
    background: var(--blue, #2F6FED); color:#fff; font-weight:700; font-size:15px; cursor:pointer;
  }
</style>
