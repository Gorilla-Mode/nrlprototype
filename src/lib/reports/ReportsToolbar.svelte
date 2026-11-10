<script lang="ts">
  import type { Snippet } from 'svelte';
  import SearchField from '../components/SearchField.svelte';

  let { query = $bindable(''), selectMode, ontoggleselect, filters }: {
    query?: string;
    selectMode: boolean;
    ontoggleselect: () => void;
    /** Geometry and Height, between the search and Select. */
    filters?: Snippet;
  } = $props();
</script>

<!-- One row: search takes the rest; Geometry, Height and Select fit their content. -->
<div class="reports-header-row reports-toolbar">
  <div class="reports-search">
    <SearchField placeholder="Search obstacle name or type" aria-label="Search obstacle name or type" bind:value={query} />
  </div>

  {@render filters?.()}

  {#if selectMode}
    <!-- Sending lives in the page's fixed select bar. -->
    <button type="button" class="ds-button reports-tool-button" data-variant="secondary" data-color="neutral" onclick={ontoggleselect}>
      Cancel
    </button>
  {:else}
    <button type="button" class="ds-button reports-tool-button" data-variant="secondary" data-color="neutral" onclick={ontoggleselect}>
      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M4 12.5 9 17.5 20 6.5" /></svg>
      Select
    </button>
  {/if}
</div>
