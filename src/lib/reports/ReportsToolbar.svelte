<script lang="ts">
  let { query = $bindable('') }: { query?: string } = $props();
</script>

<div class="reports-header-row reports-toolbar">
  <div class="faq-search reports-search">
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><circle cx="10.75" cy="10.75" r="6.75" /><path d="m16 16 5 5" /></svg>
    <input type="search" placeholder="Search obstacle name or type" aria-label="Search obstacle name or type" bind:value={query} />
  </div>

  <button type="button" class="button reports-tool-button">
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M4 6h16M7 12h10M10 18h4" /></svg>
    Filter
  </button>

  <button type="button" class="button reports-tool-button">
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M4 12.5 9 17.5 20 6.5" /></svg>
    Select
  </button>
</div>
