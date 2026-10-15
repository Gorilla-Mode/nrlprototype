<script lang="ts">
  import type { Snippet } from 'svelte';

  interface Props {
    /** Two-digit step number shown in the eyebrow, e.g. "01". */
    step: string;
    title: string;
    /** Anchors the section and its heading; the guide's reading progress follows sections. */
    id: string;
    children: Snippet;
  }

  let { step, title, id, children }: Props = $props();
</script>

<section {id} class="step-section" data-guide-step aria-labelledby={`${id}-title`}>
  <h2 id={`${id}-title`}>
    <span class="step-section-eyebrow">STEP {step}</span>
    <span class="step-section-title">{title}</span>
  </h2>
  {@render children()}
</section>

<style>
  .step-section { display: grid; gap: var(--space-4); }
  .step-section + :global(.step-section) {
    margin-top: var(--guide-step-gap);
    padding-top: var(--guide-step-padding-top);
    border-top: var(--border-default);
  }
  h2 { display: grid; gap: var(--space-3); margin: 0 0 var(--space-1); }
  .step-section-eyebrow {
    color: var(--color-text-secondary);
    font-size: var(--guide-eyebrow-size);
    font-weight: var(--guide-font-weight-strong);
    letter-spacing: var(--guide-label-tracking);
    line-height: var(--line-height-tight);
  }
  .step-section-title {
    color: var(--color-text-primary);
    font-size: var(--guide-step-title-size);
    font-weight: var(--guide-font-weight-strong);
    line-height: var(--line-height-tight);
  }
</style>
