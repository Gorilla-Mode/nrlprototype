<script lang="ts">
  import DraftCard from './DraftCard.svelte';
  import ReportCard from './ReportCard.svelte';
  import FilterPanel from './FilterPanel.svelte';
  import { onMount } from 'svelte';
  import type { Draft, GeometryFilter, HeightFilter, Report } from './types';
  import { geometryTypeFor, matchesHeightFilter } from './types';

  export let onOpenDraft: (draft: Draft) => void = () => {};
  export let onOpenReport: (report: Report) => void = () => {};
  export let onBack: () => void = () => {};
  export let view: 'reports' | 'drafts' = 'reports';

  let query = '';
  let drafts: Draft[] = [];
  let reports: Report[] = [];

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

    reports = [
      {
        id: 'r1', title: 'Kraftlinje Sør', category: 'Aerial span', value: '40 ft (12 m)',
        status: 'ready', createdDate: '12.10.2024', editedDate: '14.10.2024',
        heightAboveGround: '40 ft (12 m)', lighting: 'Unknown',
        pilotReportText: 'Power line crossing the valley between two masts. Cables are unlit and hard to see against the ridge.',
        reportedByName: 'Paul Atreides', reportedByOrg: 'Politihelikoptertjenesten',
        coordinates: { lat: 60.3913, lng: 5.3221 }, vertexCount: 2
      }
    ];
  });

  type Searchable = {
    title: string; category: string; value: string; heightAboveGround: string;
    lighting: string; pilotReportText: string; reportedByName: string; reportedByOrg: string;
  };

  function matchesQuery(d: Searchable, rawQuery: string): boolean {
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

  function matchesFilters(d: { category: string; heightAboveGround: string }, geometries: Set<GeometryFilter>, heightFilter: HeightFilter): boolean {
    if (geometries.size > 0 && !geometries.has(geometryTypeFor(d.category))) return false;
    return matchesHeightFilter(d.heightAboveGround, heightFilter);
  }

  $: filteredDrafts = drafts.filter(d => matchesQuery(d, query) && matchesFilters(d, appliedGeometries, appliedHeightFilter));
  $: filteredReports = reports.filter(r => matchesQuery(r, query) && matchesFilters(r, appliedGeometries, appliedHeightFilter));
  $: pendingResultCount = view === 'drafts'
    ? drafts.filter(d => matchesQuery(d, query) && matchesFilters(d, pendingGeometries, pendingHeightFilter)).length
    : reports.filter(r => matchesQuery(r, query) && matchesFilters(r, pendingGeometries, pendingHeightFilter)).length;
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

  const goBack = () => onBack();
</script>

<section class="page">
  <header class="top-bar">
    <div class="top-bar-inner">
      <div class="left">
        <button class="back" on:click={goBack}>‹</button>
        <h1>Reports</h1>
      </div>

      <div class="segmented">
        <button class:active={view === 'reports'} on:click={() => view = 'reports'}>My reports</button>
        <button class:active={view === 'drafts'} on:click={() => view = 'drafts'}>My drafts</button>
      </div>
    </div>

    <div class="top-bar-inner controls-row">
      <div class="controls">
        <div class="search">
          <svg class="icon" viewBox="0 0 24 24" width="18" height="18" fill="none"><path d="M21 21l-4.35-4.35" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"></path><circle cx="11" cy="11" r="6" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"></circle></svg>
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
        {#if view === 'drafts'}
          <button class="chip active">All drafts <span class="count">{drafts.length}</span></button>
        {:else}
          <button class="chip active">All reports <span class="count">{reports.length}</span></button>
        {/if}
      </div>
    </div>
  </header>

  <div class="scroll-area">
  <div class="safe-area">
    {#if view === 'drafts'}
      <div class="list-head">
        <div class="left">{filteredDrafts.length} DRAFTS</div>
        <div class="right">Sorted by last edited</div>
      </div>

      {#if filteredDrafts.length === 0}
        <div class="empty">No drafts yet</div>
      {:else}
        <div class="grid">
          {#each filteredDrafts as d}
            <DraftCard draft={d} onEdit={onOpenDraft} />
          {/each}
        </div>
      {/if}
    {:else}
      <div class="list-head">
        <div class="left">{filteredReports.length} REPORTS</div>
        <div class="right">Sorted by last edited</div>
      </div>

      {#if filteredReports.length === 0}
        <div class="empty">No reports yet</div>
      {:else}
        <div class="grid">
          {#each filteredReports as r}
            <ReportCard report={r} onOpen={onOpenReport} />
          {/each}
        </div>
      {/if}
    {/if}
  </div>
  </div>
</section>

<style>
  .page {
    position: fixed; inset: 0; z-index: var(--layer-dialog);
    display: flex; flex-direction: column;
    background: var(--color-background-page);
  }

  .top-bar { flex-shrink: 0; background: var(--color-background-raised); border-bottom: var(--border-default); }
  .top-bar-inner { width:100%; max-width:1100px; margin:0 auto; padding:28px 32px 0; box-sizing:border-box; display:flex; align-items:center; justify-content:space-between; gap:16px }
  .top-bar-inner.controls-row { padding:16px 32px 20px; display:block }

  .left { display:flex; align-items:center; gap:14px }
  .back { font-size:28px; background:transparent; border:0; cursor:pointer }
  h1 { margin:0; font-size:30px }

  .segmented { display:flex; background:var(--color-background-subtle); border-radius:999px; padding:6px; gap:6px }
  .segmented button { padding:8px 14px; border-radius:999px; border:0; background:transparent; color:var(--color-text-secondary); font-weight:600; cursor:pointer }
  .segmented button.active { background:var(--color-background-raised); color:var(--color-text-primary); box-shadow: var(--shadow-surface); }

  .scroll-area { flex:1; overflow-y:auto; overscroll-behavior:contain; display:flex; justify-content:center; }
  .safe-area { width:100%; max-width:1100px; padding:20px 32px 32px; box-sizing:border-box; }

  .controls { display:flex; gap:12px; align-items:center; }
  .search { flex:1; display:flex; align-items:center; gap:8px; background:var(--color-background-subtle); padding:10px 12px; border-radius:12px; box-sizing:border-box }
  .search .icon { opacity:0.9; stroke: var(--color-text-secondary); }
  .search input { border:0; background:transparent; outline:none; flex:1; font-size:16px }
  .search .clear { background:transparent; border:0; cursor:pointer }
  .filter-wrap { position:relative }
  .filter { padding:10px 14px; border-radius:12px; border:var(--border-default); background:var(--color-background-raised); cursor:pointer; display:flex; align-items:center; gap:6px }
  .filter.active { border-color:var(--color-action-secondary); color:var(--color-action-secondary); font-weight:600 }
  .filter-dot { width:8px; height:8px; border-radius:50%; background:var(--color-action-secondary) }

  .chips { margin-top:12px }
  .chip { background:var(--color-action-secondary); color:var(--color-text-inverse); padding:8px 12px; border-radius:999px; border:0; font-weight:600 }
  .count { color:var(--color-text-inverse); margin-left:8px; font-weight:700 }

  .list-head { display:flex; justify-content:space-between; align-items:center; font-size:13px; color:var(--color-text-secondary); font-weight:700; letter-spacing:0.06em }
  .list-head .right { font-weight:400 }

  .grid { display:grid; grid-template-columns: repeat(2, minmax(0,1fr)); gap:18px; margin-top:14px }

  .empty { padding:48px; text-align:center; color:var(--color-text-secondary); font-size:18px }

  @media (max-width:800px) {
    .grid { grid-template-columns: 1fr }
    .top-bar-inner { padding:20px }
    .safe-area { padding:16px 20px 20px }
  }
</style>