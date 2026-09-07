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
  class={['map-button', className, { 'is-active': active }]}
>
  {@render children()}
</button>

<style>
  .map-button :global(svg) {
    flex: none;
    width: 24px;
    height: 24px;
    stroke: currentColor;
    stroke-width: 1.7;
    stroke-linecap: round;
    stroke-linejoin: round;
  }

  .map-button {
    display: grid;
    flex: none;
    place-items: center;
    width: var(--map-control-size);
    height: var(--map-control-size);
    padding: 0;
    border: 0;
    border-radius: 50%;
    background: #fff;
    box-shadow: var(--control-shadow);
    color: #202b2e;
    cursor: pointer;
    pointer-events: auto;
    -webkit-tap-highlight-color: transparent;
    transition: background-color 150ms ease, color 150ms ease;
  }

  .map-button:disabled {
    color: #202b2e;
    cursor: default;
    opacity: 1;
  }

  .map-button:not(:disabled):hover {
    background-color: #f0f4f1;
  }

  .map-button.is-active {
    background: #e8efeb;
    color: #38564c;
  }

  .map-button:focus-visible {
    outline: 2px solid #385e51;
    outline-offset: 3px;
  }

  @media (prefers-reduced-motion: reduce) {
    .map-button {
      transition: none;
    }
  }
</style>
