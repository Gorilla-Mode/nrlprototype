<script lang="ts">
  import type { Snippet } from 'svelte';
  import type { HTMLButtonAttributes } from 'svelte/elements';

  type Props = HTMLButtonAttributes & {
    children: Snippet;
    element?: HTMLButtonElement | null;
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
    border: var(--map-control-border);
    border-radius: var(--map-control-radius);
    background: var(--color-map-control-surface);
    box-shadow: var(--shadow-control);
    color: var(--color-text-primary);
    cursor: pointer;
    pointer-events: auto;
    -webkit-tap-highlight-color: transparent;
    transition:
      background-color var(--duration-default) var(--ease-standard),
      border-color var(--duration-default) var(--ease-standard),
      color var(--duration-default) var(--ease-standard),
      transform var(--duration-instant) var(--ease-standard);
  }

  .map-button:disabled {
    color: var(--color-text-disabled);
  }

  .map-button:not(:disabled):hover {
    background-color: var(--color-map-control-hover);
  }

  .map-button:not(:disabled):active {
    transform: scale(var(--scale-control-active));
  }

  .map-button.is-active {
    border-color: var(--color-action-secondary);
    background: var(--color-map-control-active);
    color: var(--color-action-secondary);
  }
</style>
