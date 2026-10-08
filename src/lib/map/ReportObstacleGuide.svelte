<script lang="ts">
  import { onMount, tick } from 'svelte';
  import TutorialBlock from './TutorialBlock.svelte';
  import { reportingGuideBlocks, type TutorialEntry } from './tutorial';
  import type { PlacementEditingVariantId } from './placementEditing';

  let { placementEditing = 'default', blocks, onback }: {
    placementEditing?: PlacementEditingVariantId;
    blocks?: readonly TutorialEntry[];
    onback: () => void;
  } = $props();
  let title: HTMLHeadingElement;
  let entries = $derived(blocks ?? reportingGuideBlocks(placementEditing));
  onMount(() => {
    void tick().then(() => title.focus({ preventScroll: true }));
  });
</script>

<main class="faq-page reporting-guide" aria-label="How to Report an Obstacle">
  <header class="faq-header">
    <div class="faq-header-content">
      <button class="faq-icon-button" type="button" aria-label="Back" onclick={onback}>
        <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M15 5l-7 7 7 7" /></svg>
      </button>
      <span>How to Report an Obstacle</span>
    </div>
  </header>
  <div class="faq-content">
    <h1 bind:this={title} tabindex="-1">How to Report an Obstacle</h1>
    <div class="guide-blocks">
      {#each entries as block (block.id)}<TutorialBlock {block} />{/each}
    </div>
  </div>
</main>

<style>
  .guide-blocks { display: grid; gap: var(--space-4); margin-top: var(--space-4); }
</style>
