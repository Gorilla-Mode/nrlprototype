<script lang="ts">
  import { onMount, tick } from 'svelte';

  let { onback }: { onback: () => void } = $props();
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
</div>
