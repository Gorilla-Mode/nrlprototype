<script lang="ts">
  import DraftCard from './DraftCard.svelte';
  import FilterPanel from './FilterPanel.svelte';
  import { onMount } from 'svelte';
  import type { Draft, GeometryFilter, HeightFilter } from './types';
  import { geometryTypeFor, matchesHeightFilter } from './types';

  export let onOpenDraft: (draft: Draft) => void = () => {};

  let view: 'reports' | 'drafts' = 'drafts';
  let query = '';
  let drafts: Draft[] = [];

  let filterPanelOpen = false;
  let appliedGeometries = new Set<GeometryFilter>();
  let appliedHeightFilter: HeightFilter = 'any';
  let pendingGeometries = new Set<GeometryFilter>();
  let pendingHeightFilter: HeightFilter = 'any';

  // seed mock data
  onMount(() => {
    drafts = [
      {
        id: '1', title: 'Bru Sandnessjøen', category: 'Bridge', value: 'Not set',
        currentStep: 2, totalSteps: 2, stepLabel: 'Additional information',
        editedDate: '14.10.2024', createdDate: '14.10.2024',
        heightAboveGround: 'Not set', lighting: 'Not set',
        pilotReportText: 'Observed a new suspension bridge under construction crossing the fjord, unmarked and not on current charts.',
        reportedByName: 'Paul Atreides', reportedByOrg: 'Politihelikoptertjenesten',
        coordinates: { lat: 66.0210, lng: 12.6300 }, vertexCount: 2
      },
      {
        id: '2', title: 'Ny mast Dovre', category: 'Pole / tower', value: '95 ft (29 m)',
        currentStep: 1, totalSteps: 2, stepLabel: 'Obstacle details',
        editedDate: '13.10.2024', createdDate: '13.10.2024',
        heightAboveGround: '95 ft (29 m)', lighting: 'Not set',
        pilotReportText: 'New radio mast near Dovre, taller than surrounding terrain, no lighting visible at dusk.',
        reportedByName: 'Paul Atreides', reportedByOrg: 'Politihelikoptertjenesten',
        coordinates: { lat: 62.0730, lng: 9.2570 }, vertexCount: 1
      },
      {
        id: '3', title: 'Uten navn', category: 'Other', value: 'Not set',
        currentStep: 1, totalSteps: 2, stepLabel: 'Obstacle details',
        editedDate: '12.10.2024', createdDate: '12.10.2024',
        heightAboveGround: 'Not set', lighting: 'Not set',
        pilotReportText: 'Unidentified obstacle spotted during low-altitude flight, needs follow-up before details can be confirmed.',
        reportedByName: 'Paul Atreides', reportedByOrg: 'Politihelikoptertjenesten',
        coordinates: null, vertexCount: 0
      }
    ];
  });

  function matchesQuery(d: Draft, rawQuery: string): boolean {
    const q = rawQuery.trim().toLowerCase();
    if (!q) return true;
    const searchableFields = [
      d.title,
      d.category,
      d.value,
      d.heightAboveGround,
      d.lighting,
      d.pilotReportText,
      d.reportedByName,
      d.reportedByOrg
    ];
    return searchableFields.some(field => field.toLowerCase().includes(q));
  }

  function matchesFilters(d: Draft, geometries: Set<GeometryFilter>, heightFilter: HeightFilter): boolean {
    if (geometries.size > 0 && !geometries.has(geometryTypeFor(d.category))) return false;
    return matchesHeightFilter(d.heightAboveGround, heightFilter);
  }

  $: filtered = drafts.filter(d => matchesQuery(d, query) && matchesFilters(d, appliedGeometries, appliedHeightFilter));
  $: pendingResultCount = drafts.filter(d => matchesQuery(d, query) && matchesFilters(d, pendingGeometries, pendingHeightFilter)).length;
  $: filtersActive = appliedGeometries.size > 0 || appliedHeightFilter !== 'any';

  const clearSearch = () => query = '';

  const openFilterPanel = () => {
    pendingGeometries = new Set(appliedGeometries);
    pendingHeightFilter = appliedHeightFilter;
    filterPanelOpen = true;
  };

  const dismissFilterPanel = () => filterPanelOpen = false;

  const resetPendingFilters = () => {
    pendingGeometries = new Set();
    pendingHeightFilter = 'any';
  };

  const applyFilters = () => {
    appliedGeometries = new Set(pendingGeometries);
    appliedHeightFilter = pendingHeightFilter;
    filterPanelOpen = false;
  };

  const goBack = () => alert('Back (placeholder)');
</script>

<section class="page">
  <div class="safe-area">
    <header class="header">
      <div class="left">
        <button class="back" on:click={goBack}>‹</button>
        <h1>Reports</h1>
      </div>

      <div class="segmented">
        <button class:active={view === 'reports'} on:click={() => view = 'reports'}>My reports</button>
        <button class:active={view === 'drafts'} on:click={() => view = 'drafts'}>My drafts</button>
      </div>
    </header>

    <div class="controls">
      <div class="search">
        <svg class="icon" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="#8E8E93"><path d="M21 21l-4.35-4.35" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"></path><circle cx="11" cy="11" r="6" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"></circle></svg>
        <input placeholder="Search obstacle name or type" bind:value={query} />
        {#if query}
          <button class="clear" on:click={clearSearch}>✕</button>
        {/if}
      </div>
      <div class="filter-wrap">
        <button class="filter" class:active={filtersActive} on:click={openFilterPanel}>
          ⚙︎ Filter{#if filtersActive}<span class="filter-dot"></span>{/if}
        </button>
        {#if filterPanelOpen}
          <FilterPanel
            bind:geometries={pendingGeometries}
            bind:heightFilter={pendingHeightFilter}
            resultCount={pendingResultCount}
            onReset={resetPendingFilters}
            onApply={applyFilters}
            onDismiss={dismissFilterPanel}
          />
        {/if}
      </div>
    </div>

    <div class="chips">
      <button class="chip active">All drafts <span class="count">{drafts.length}</span></button>
    </div>

    <hr class="divider" />

    <div class="list-head">
      <div class="left">{filtered.length} DRAFTS</div>
      <div class="right">Sorted by last edited</div>
    </div>

    {#if filtered.length === 0}
      <div class="empty">No drafts yet</div>
    {:else}
      <div class="grid">
        {#each filtered as d}
          <DraftCard draft={d} onEdit={onOpenDraft} />
        {/each}
      </div>
    {/if}

  </div>
</section>

<style>
  :global(:root) { --bg:#F7F7F8; --muted:#8E8E93; --text:#1C1C1E; --blue:#2F6FED }
  .page { width:100%; height:100%; background: #fff; display:flex; align-items:flex-start; justify-content:center }
  .safe-area { width:100%; max-width:1100px; padding:28px 32px; background: var(--bg); min-height:100vh }

  .header { display:flex; align-items:center; justify-content:space-between; gap:16px }
  .left { display:flex; align-items:center; gap:14px }
  .back { font-size:28px; background:transparent; border:0; cursor:pointer }
  h1 { margin:0; font-size:30px }

  .segmented { display:flex; background:#EFEFF4; border-radius:999px; padding:6px; gap:6px }
  .segmented button { padding:8px 14px; border-radius:999px; border:0; background:transparent; color:var(--muted); font-weight:600; cursor:pointer }
  .segmented button.active { background:#fff; color:var(--text); box-shadow: 0 1px 2px rgba(28,28,30,0.06); }

  .controls { display:flex; gap:12px; align-items:center; margin-top:18px }
  .search { flex:1; display:flex; align-items:center; gap:8px; background:#F2F2F7; padding:10px 12px; border-radius:12px }
  .search .icon { opacity:0.9 }
  .search input { border:0; background:transparent; outline:none; flex:1; font-size:16px }
  .search .clear { background:transparent; border:0; cursor:pointer }
  .filter-wrap { position:relative }
  .filter { padding:10px 14px; border-radius:12px; border:1px solid #D1D1D6; background:#fff; cursor:pointer; display:flex; align-items:center; gap:6px }
  .filter.active { border-color:var(--blue); color:var(--blue); font-weight:600 }
  .filter-dot { width:8px; height:8px; border-radius:50%; background:var(--blue) }

  .chips { margin-top:12px }
  .chip { background:var(--blue); color:#fff; padding:8px 12px; border-radius:999px; border:0; font-weight:600 }
  .count { background:#fff; color:var(--blue); display:inline-block; width:22px; height:22px; border-radius:999px; text-align:center; margin-left:8px; font-weight:700 }

  .divider { border:0; height:1px; background:#E9E9EB; margin:16px 0 }

  .list-head { display:flex; justify-content:space-between; align-items:center; font-size:13px; color:var(--muted); font-weight:700; letter-spacing:0.06em }
  .list-head .right { font-weight:400 }

  .grid { display:grid; grid-template-columns: repeat(2, minmax(0,1fr)); gap:18px; margin-top:14px }

  .empty { padding:48px; text-align:center; color:var(--muted); font-size:18px }

  @media (max-width:800px) { .grid { grid-template-columns: 1fr } .safe-area { padding:20px } }
</style>