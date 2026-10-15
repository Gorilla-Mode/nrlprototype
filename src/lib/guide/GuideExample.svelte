<script lang="ts">
  import type { Snippet } from 'svelte';

  interface Props {
    /** What the illustration shows; the drawn controls are not announced as controls. */
    label: string;
    children: Snippet;
  }

  let { label, children }: Props = $props();
</script>

<!-- A static picture of part of the report form. It contains no focusable elements, so
     reading the guide can never select, edit or submit anything. -->
<div class="guide-example" role="img" aria-label={label}>
  {@render children()}
</div>

<style>
  .guide-example {
    display: grid;
    gap: var(--space-3);
    padding: var(--space-5);
    border: var(--border-default);
    border-radius: var(--guide-example-radius);
    background: var(--color-background-raised);
    color: var(--color-text-primary);
  }
</style>
