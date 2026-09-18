<script lang="ts">
  import { onMount, tick } from 'svelte';

  let { onback, activeTab, onselecttab }: { onback: () => void; activeTab: 'reports' | 'drafts'; onselecttab: (tab: 'reports' | 'drafts') => void } = $props();
  let title: HTMLHeadingElement;

  onMount(() => {
    // Browser Forward can close the modal drawer in this same update.
    void tick().then(() => title.focus({ preventScroll: true }));
  });
</script>

<div class="reports-header-row reports-header-top">
  <div class="reports-header-title">
    <button class="reports-icon-button" type="button" aria-label="Back to map" onclick={onback}>
      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M15 5l-7 7 7 7" /></svg>
    </button>
    <h1 class="reports-title" bind:this={title} tabindex="-1">Reports</h1>
  </div>

  <div class="reports-segmented">
    <button type="button" class="reports-segment" aria-pressed={activeTab === 'reports'} onclick={() => onselecttab('reports')}>My reports</button>
    <button type="button" class="reports-segment" aria-pressed={activeTab === 'drafts'} onclick={() => onselecttab('drafts')}>My drafts</button>
  </div>
</div>
