<script lang="ts">
  import type { Snippet } from 'svelte';
  import type { HTMLInputAttributes } from 'svelte/elements';

  /**
   * The app's search field: Designsystemet's ds-search (magnifier, input and clear button)
   * styled like the map's search field. It holds no search logic; every input attribute
   * and handler is passed straight to the <input>.
   */
  interface Props extends Omit<HTMLInputAttributes, 'type' | 'value' | 'children'> {
    value?: string;
    input?: HTMLInputElement | null;
    /** Shadow, for a field floating over the map; page fields lie flat. */
    raised?: boolean;
    /** Shows a clear button while the field has text. */
    onclear?: () => void;
    clearLabel?: string;
    /** Extra content positioned against the field, such as a suggestion list. */
    children?: Snippet;
  }

  let { value = $bindable(''), input = $bindable(null), raised = false, onclear, clearLabel = 'Clear search', children, ...attributes }: Props = $props();
</script>

<div class="ds-search search-field" class:raised>
  <input class="ds-input" bind:this={input} bind:value type="search" {...attributes} />
  <!-- Empty: ds-search draws the X. Outside a form, type="reset" changes nothing by itself. -->
  {#if onclear && value}<button type="reset" aria-label={clearLabel} onclick={onclear}></button>{/if}
  {@render children?.()}
</div>

<style>
  .search-field {
    --dsc-input-background: var(--color-background-raised);
    --dsc-input-border-color: var(--color-border-strong);
    --dsc-input-border-radius: var(--radius-control);
    --dsc-input-size: var(--map-control-size);
    position: relative;
    width: 100%;
    min-width: 0;
    color: var(--color-text-secondary);
  }
  .search-field > input {
    min-height: var(--map-control-size);
    color: var(--color-text-primary);
    font-size: var(--font-size-body);
  }
  .search-field > input::placeholder { color: var(--color-text-secondary); opacity: var(--opacity-opaque); }
  .raised > input { box-shadow: var(--shadow-control); }
</style>
