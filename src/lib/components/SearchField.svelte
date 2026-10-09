<script lang="ts">
  import type { Snippet } from 'svelte';
  import type { HTMLInputAttributes } from 'svelte/elements';

  /**
   * The app's search field look: magnifier, input, border, shadow and focus ring. It holds
   * no search logic; every input attribute and handler is passed straight to the <input>.
   */
  interface Props extends Omit<HTMLInputAttributes, 'type' | 'value' | 'children'> {
    value?: string;
    input?: HTMLInputElement | null;
    /** Extra content positioned against the field, such as a suggestion list. */
    children?: Snippet;
  }

  let { value = $bindable(''), input = $bindable(null), children, ...attributes }: Props = $props();
</script>

<div class="search-field">
  <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <circle cx="10.75" cy="10.75" r="6.75" />
    <path d="m16 16 5 5" />
  </svg>
  <input bind:this={input} bind:value type="search" {...attributes} />
  {@render children?.()}
</div>

<style>
  .search-field {
    position: relative;
    display: flex;
    align-items: center;
    gap: var(--space-2);
    width: 100%;
    min-width: 0;
    height: var(--map-control-size);
    padding-inline: var(--map-search-padding-inline);
    border: var(--border-strong);
    border-radius: var(--radius-control);
    background: var(--color-background-raised);
    box-shadow: var(--shadow-control);
    color: var(--color-text-secondary);
  }
  svg {
    flex: none;
    width: var(--icon-size-large);
    height: var(--icon-size-large);
    stroke: currentColor;
    stroke-width: var(--icon-stroke-width);
    stroke-linecap: round;
    stroke-linejoin: round;
  }
  input {
    width: 100%;
    min-width: 0;
    padding: 0;
    border: 0;
    outline: none;
    background: transparent;
    color: var(--color-text-primary);
    font-size: var(--font-size-body);
    -webkit-text-fill-color: currentColor;
  }
  input::placeholder { color: var(--color-text-secondary); opacity: var(--opacity-opaque); }
  .search-field:focus-within { outline: var(--border-width-emphasis) solid var(--color-focus-ring); outline-offset: var(--space-1); }
</style>
