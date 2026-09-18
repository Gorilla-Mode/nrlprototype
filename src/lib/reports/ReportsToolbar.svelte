<script lang="ts">
  import FilterPanel from './FilterPanel.svelte';
  import type { GeometryKey, HeightFilterKey } from './filtering';

  let {
    query = $bindable(''),
    selectMode, selectedCount, ontoggleselect, onsend,
    filterOpen, filterActive, pendingGeometries = $bindable(), pendingHeightFilter = $bindable(), pendingResultCount,
    onopenfilter, onresetfilter, onapplyfilter, ondismissfilter,
  }: {
    query?: string;
    selectMode: boolean;
    selectedCount: number;
    ontoggleselect: () => void;
    onsend: () => void;
    filterOpen: boolean;
    filterActive: boolean;
    pendingGeometries: Set<GeometryKey>;
    pendingHeightFilter: HeightFilterKey;
    pendingResultCount: number;
    onopenfilter: () => void;
    onresetfilter: () => void;
    onapplyfilter: () => void;
    ondismissfilter: () => void;
  } = $props();
</script>

<div class="reports-header-row reports-toolbar">
  <div class="faq-search reports-search">
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><circle cx="10.75" cy="10.75" r="6.75" /><path d="m16 16 5 5" /></svg>
    <input type="search" placeholder="Search obstacle name or type" aria-label="Search obstacle name or type" bind:value={query} />
  </div>

  <div class="reports-filter-wrap">
    <button type="button" class="button reports-tool-button" class:reports-filter-active={filterActive} onclick={onopenfilter}>
      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M4 6h16M7 12h10M10 18h4" /></svg>
      Filter
      {#if filterActive}<span class="reports-filter-dot" aria-hidden="true"></span>{/if}
    </button>

    {#if filterOpen}
      <FilterPanel
        bind:geometries={pendingGeometries}
        bind:heightFilter={pendingHeightFilter}
        resultCount={pendingResultCount}
        onreset={onresetfilter}
        onapply={onapplyfilter}
        ondismiss={ondismissfilter}
      />
    {/if}
  </div>

  {#if selectMode}
    <button type="button" class="button reports-tool-button" onclick={ontoggleselect}>
      Cancel
    </button>
    <button type="button" class="button button--primary reports-tool-button" disabled={selectedCount === 0} onclick={onsend}>
      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M4 12.5 9 17.5 20 6.5" /></svg>
      Send {selectedCount} selected
    </button>
  {:else}
    <button type="button" class="button reports-tool-button" onclick={ontoggleselect}>
      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M4 12.5 9 17.5 20 6.5" /></svg>
      Select
    </button>
  {/if}
</div>

<style>
  .reports-filter-wrap { position: relative; flex: none; }
  .reports-filter-active { border-color: var(--color-action-secondary); color: var(--color-action-secondary); }
  .reports-filter-dot { width: var(--space-2); height: var(--space-2); border-radius: 50%; background: var(--color-action-secondary); }
</style>
