<script module lang="ts">
  /** Below this width the actions stack in full width, the primary action on top. */
  export const dialogActionsStackedQuery = '(max-width: 30rem)';
</script>

<script lang="ts">
  import { onMount, tick, type Snippet } from 'svelte';

  interface Props {
    /** The dialog's main action: right of the secondary one, or on top when stacked. */
    primary: Snippet;
    secondary?: Snippet;
  }

  let { primary, secondary }: Props = $props();
  let root: HTMLDivElement;
  let stacked = $state(false);
  // The DOM order is the visual order, so Tab follows what the reader sees: secondary
  // then primary in a row, primary first when stacked. CSS never reorders the buttons.
  let order = $derived((stacked ? ['primary', 'secondary'] : ['secondary', 'primary']).filter((slot) => slot === 'primary' || secondary) as ('primary' | 'secondary')[]);

  async function setStacked(next: boolean) {
    // Reordering moves the buttons in the DOM, which can drop focus; put it back.
    const focused = document.activeElement instanceof HTMLElement && root.contains(document.activeElement)
      ? document.activeElement.closest<HTMLElement>('[data-dialog-action]')?.dataset.dialogAction : undefined;
    stacked = next;
    await tick();
    if (focused) root.querySelector<HTMLElement>(`[data-dialog-action="${focused}"] button`)?.focus({ preventScroll: true });
  }

  onMount(() => {
    const query = window.matchMedia(dialogActionsStackedQuery);
    const update = () => void setStacked(query.matches);
    stacked = query.matches;
    query.addEventListener('change', update);
    return () => query.removeEventListener('change', update);
  });
</script>

<div class="dialog-actions" class:stacked bind:this={root}>
  {#each order as slot (slot)}
    <div class="dialog-actions-slot" data-dialog-action={slot}>
      {#if slot === 'primary'}{@render primary()}{:else}{@render secondary?.()}{/if}
    </div>
  {/each}
</div>

<style>
  .dialog-actions { display: flex; flex-wrap: wrap; justify-content: flex-end; gap: var(--space-3); }
  .dialog-actions-slot { display: contents; }
  /* Widths follow the labels; the primary action gets extra room so it reads as the main one. */
  .dialog-actions-slot > :global(.button) { flex: none; width: auto; min-width: 0; }
  .dialog-actions-slot[data-dialog-action='primary'] > :global(.button) { padding-inline: var(--dialog-action-primary-padding); }
  .dialog-actions.stacked { flex-direction: column; align-items: stretch; }
  .dialog-actions.stacked .dialog-actions-slot > :global(.button) { width: 100%; }
</style>
