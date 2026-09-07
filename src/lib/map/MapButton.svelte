<script lang="ts">
  import type { Snippet } from 'svelte';
  import type { HTMLButtonAttributes } from 'svelte/elements';

  type Props = HTMLButtonAttributes & {
    children: Snippet;
    element?: HTMLButtonElement;
    active?: boolean;
  };

  let {
    children,
    element = $bindable(),
    active = false,
    class: className,
    type = 'button',
    ...attributes
  }: Props = $props();
</script>

<button
  {...attributes}
  bind:this={element}
  {type}
  class="map-button {className ?? ''}"
  class:is-active={active}
>
  {@render children()}
</button>

<style>
  .map-button {
    display: grid;
    flex: none;
    place-items: center;
    width: var(--map-control-size);
    height: var(--map-control-size);
    padding: 0;
    border: 0;
    border-radius: 50%;
    background: var(--color-surface);
    box-shadow: var(--shadow-control);
    color: var(--color-text);
    cursor: pointer;
    pointer-events: auto;
    -webkit-tap-highlight-color: transparent;
    transition: background-color 150ms ease, color 150ms ease;
  }

  .map-button:disabled {
    color: var(--color-text);
    cursor: default;
    opacity: 1;
  }

  .map-button:not(:disabled):hover {
    background-color: var(--color-surface-hover);
  }

  .map-button.is-active {
    background: var(--color-surface-active);
    color: var(--color-accent-strong);
  }

  .map-button:focus-visible {
    outline: 2px solid var(--color-focus);
    outline-offset: 3px;
  }

  @media (prefers-reduced-motion: reduce) {
    .map-button {
      transition: none;
    }
  }
</style>
