<script lang="ts">
  import type { GeometryKey, HeightFilterKey } from './filtering';

  let { geometries = $bindable(), heightFilter = $bindable(), resultCount, onreset, onapply, ondismiss }: {
    geometries: Set<GeometryKey>;
    heightFilter: HeightFilterKey;
    resultCount: number;
    onreset: () => void;
    onapply: () => void;
    ondismiss: () => void;
  } = $props();

  const geometryOptions: GeometryKey[] = ['Point', 'Line'];
  const heightOptions: { key: HeightFilterKey; label: string }[] = [
    { key: 'any', label: 'Any height' },
    { key: 'under30', label: 'Under 30 m' },
    { key: '30to60', label: '30 – 60 m' },
    { key: 'over60', label: 'Over 60 m' },
  ];

  function toggleGeometry(g: GeometryKey) {
    const next = new Set(geometries);
    if (next.has(g)) next.delete(g);
    else next.add(g);
    geometries = next;
  }

  function onKeydown(event: KeyboardEvent) {
    if (event.key === 'Escape') { event.preventDefault(); ondismiss(); }
  }
</script>

<svelte:window onkeydown={onKeydown} />

<button type="button" class="reports-filter-scrim" aria-label="Close filter" onclick={ondismiss}></button>

<div class="reports-filter-panel" role="dialog" aria-label="Filter">
  <div class="reports-filter-header">
    <h2>Filter</h2>
    <button type="button" class="reports-filter-reset" onclick={onreset}>Reset</button>
  </div>

  <div class="reports-filter-section-label">Geometry</div>
  <div class="reports-filter-options">
    {#each geometryOptions as g (g)}
      <button type="button" class="reports-filter-option" class:selected={geometries.has(g)} onclick={() => toggleGeometry(g)}>
        <span class="reports-filter-checkbox" class:checked={geometries.has(g)} aria-hidden="true">
          {#if geometries.has(g)}
            <svg viewBox="0 0 16 16" fill="none"><path d="M3 8.5l3 3 7-7" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" /></svg>
          {/if}
        </span>
        {g}
      </button>
    {/each}
  </div>

  <div class="reports-filter-section-label">Height</div>
  <div class="reports-filter-options">
    {#each heightOptions as option (option.key)}
      <button type="button" class="reports-filter-option reports-filter-option-radio" class:selected={heightFilter === option.key} onclick={() => heightFilter = option.key}>
        {option.label}
        {#if heightFilter === option.key}
          <svg viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M3 8.5l3 3 7-7" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" /></svg>
        {/if}
      </button>
    {/each}
  </div>

  <button type="button" class="button button--primary reports-filter-apply" onclick={onapply}>
    Show {resultCount} {resultCount === 1 ? 'result' : 'results'}
  </button>
</div>

<style>
  .reports-filter-scrim { position: fixed; inset: 0; z-index: var(--layer-popover); background: transparent; border: 0; padding: 0; cursor: default; }

  .reports-filter-panel {
    position: absolute;
    top: calc(100% + var(--space-2));
    right: 0;
    z-index: calc(var(--layer-popover) + 1);
    width: 20rem;
    max-width: calc(100vw - var(--space-8));
    background: var(--color-background-raised);
    border: var(--border-default);
    border-radius: var(--radius-dialog);
    box-shadow: var(--shadow-control);
    padding: var(--space-5);
    box-sizing: border-box;
  }

  .reports-filter-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: var(--space-4); }
  .reports-filter-header h2 { margin: 0; font-size: var(--font-size-heading-small); font-weight: var(--font-weight-semibold); }
  .reports-filter-reset { background: transparent; border: 0; color: var(--color-action-secondary); font-weight: var(--font-weight-semibold); font-size: var(--font-size-body-small); cursor: pointer; padding: 0; }

  .reports-filter-section-label {
    font-size: var(--font-size-body-small); font-weight: var(--font-weight-semibold);
    letter-spacing: var(--faq-section-tracking, 0.02em); text-transform: uppercase;
    color: var(--color-text-secondary); margin: var(--space-4) 0 var(--space-2);
  }
  .reports-filter-section-label:first-of-type { margin-top: 0; }

  .reports-filter-options { display: flex; flex-direction: column; gap: var(--space-2); }
  .reports-filter-option {
    display: flex; align-items: center; gap: var(--space-3);
    width: 100%; text-align: left; font-size: var(--font-size-body); color: var(--color-text-primary);
    background: var(--color-background-raised); border: var(--border-default); border-radius: var(--radius-control);
    padding: var(--space-3); cursor: pointer; box-sizing: border-box;
  }
  .reports-filter-option-radio { justify-content: space-between; }
  .reports-filter-option.selected { background: var(--color-action-selected); border-color: var(--color-action-secondary); color: var(--color-action-secondary); font-weight: var(--font-weight-semibold); }
  .reports-filter-option-radio.selected svg { flex: none; width: var(--space-4); height: var(--space-4); color: var(--color-action-secondary); }

  .reports-filter-checkbox {
    flex: none; width: var(--space-5); height: var(--space-5);
    border: var(--border-strong); border-radius: var(--radius-small);
    display: flex; align-items: center; justify-content: center; color: var(--color-text-inverse);
  }
  .reports-filter-checkbox.checked { background: var(--color-action-secondary); border-color: var(--color-action-secondary); }
  .reports-filter-checkbox svg { width: var(--space-4); height: var(--space-4); }

  .reports-filter-apply { width: 100%; margin-top: var(--space-5); justify-content: center; }
</style>
