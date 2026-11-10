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
    /** Always stack in full width, the primary action on top, at every width. */
    stacked?: boolean;
  }

  let { primary, secondary, stacked: alwaysStacked = false }: Props = $props();
  let root: HTMLDivElement;
  let narrow = $state(false);
  let stacked = $derived(alwaysStacked || narrow);
  // The DOM order is the visual order, so Tab follows what the reader sees: secondary
  // then primary in a row, primary first when stacked. CSS never reorders the buttons.
  let order = $derived((stacked ? ['primary', 'secondary'] : ['secondary', 'primary']).filter((slot) => slot === 'primary' || secondary) as ('primary' | 'secondary')[]);

  async function setNarrow(next: boolean) {
    // Reordering moves the buttons in the DOM, which can drop focus; put it back.
    const focused = document.activeElement instanceof HTMLElement && root.contains(document.activeElement)
      ? document.activeElement.closest<HTMLElement>('[data-dialog-action]')?.dataset.dialogAction : undefined;
    narrow = next;
    await tick();
    if (focused) root.querySelector<HTMLElement>(`[data-dialog-action="${focused}"] button`)?.focus({ preventScroll: true });
  }

  onMount(() => {
    const query = window.matchMedia(dialogActionsStackedQuery);
    const update = () => void setNarrow(query.matches);
    narrow = query.matches;
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
  .dialog-actions-slot > :global(.ds-button) { flex: none; width: auto; min-width: 0; }
  .dialog-actions-slot[data-dialog-action='primary'] > :global(.ds-button) { padding-inline: var(--dialog-action-primary-padding); }
  .dialog-actions.stacked { flex-direction: column; align-items: stretch; }
  .dialog-actions.stacked .dialog-actions-slot > :global(.ds-button) { width: 100%; }
</style>
