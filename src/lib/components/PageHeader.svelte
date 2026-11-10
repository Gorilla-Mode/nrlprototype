<script lang="ts">
  import type { Snippet } from 'svelte';

  /**
   * The header of every full-screen page: ← and the page title on the left, as one back
   * button, and optional actions on the right. Pages never have a close X; X belongs to
   * dialogs.
   *
   * A heading cannot sit inside a button, so the title stays the page's h1 and the back
   * button's hit area (its ::after) is stretched over both the arrow and the title. Screen
   * readers announce the button by its back label and the heading by the title.
   */
  interface Props {
    title: string;
    /** Accessible name of the back button, e.g. "Back to map"; never the page title. */
    backLabel: string;
    onback: () => void;
    /** The page's h1; pages focus it when they open. */
    heading?: HTMLHeadingElement;
    /** A placeholder title, such as "Untitled obstacle", in secondary text. */
    titleMuted?: boolean;
    /** Right-aligned controls, such as a status tag or "Mark all read". */
    actions?: Snippet;
    /** Content under the title row inside the header, such as progress. */
    children?: Snippet;
  }

  let { title, backLabel, onback, heading = $bindable(), titleMuted = false, actions, children }: Props = $props();
</script>

<header class="page-header">
  <div class="page-header-row">
    <div class="page-header-nav">
      <button type="button" class="page-header-back" aria-label={backLabel} onclick={onback}>
        <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M20 12H4m0 0 6-6m-6 6 6 6" /></svg>
      </button>
      <h1 class="page-header-title" class:muted={titleMuted} bind:this={heading} tabindex="-1">{title}</h1>
    </div>
    {#if actions}<div class="page-header-actions">{@render actions()}</div>{/if}
  </div>
  {@render children?.()}
</header>

<style>
  .page-header {
    position: sticky;
    top: 0;
    z-index: var(--layer-popover);
    padding-top: var(--safe-area-top);
    border-bottom: var(--border-default);
    background: var(--color-background-raised);
  }
  .page-header-row {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    max-width: calc(var(--page-content-max) + 2 * var(--page-gutter));
    min-height: var(--page-header-height);
    margin-inline: auto;
    padding-inline: max(var(--page-gutter), var(--safe-area-left)) max(var(--page-gutter), var(--safe-area-right));
  }
  /*
   * Arrow and title as one target: at least 48 px tall, padded so the arrow still lines up
   * with the content edge below. The button's ::after covers the whole area, so clicks,
   * hover and press anywhere on it belong to the button; arrow and title sit above it.
   */
  .page-header-nav {
    position: relative;
    display: flex;
    flex: 0 1 auto;
    align-items: center;
    gap: var(--space-2);
    min-width: 0;
    min-height: var(--control-height-default);
    margin-inline-start: calc(-1 * var(--space-2));
    padding-inline: var(--space-2) var(--space-3);
  }
  .page-header-back {
    position: static;
    display: grid;
    flex: none;
    place-items: center;
    padding: 0;
    border: 0;
    background: transparent;
    color: var(--color-text-primary);
    cursor: pointer;
  }
  .page-header-back::after {
    content: '';
    position: absolute;
    inset: 0;
    z-index: 0;
    border-radius: var(--radius-control);
    transition: background-color var(--duration-instant) var(--ease-standard);
  }
  .page-header-back:hover::after { background: var(--color-map-control-hover); }
  .page-header-back:active::after { background: var(--color-background-subtle); }
  .page-header-back:focus-visible { outline: none; }
  .page-header-back:focus-visible::after { outline: var(--border-width-emphasis) solid var(--color-focus-ring); outline-offset: 0; }
  .page-header-back svg {
    position: relative;
    z-index: 1;
    width: var(--icon-size-large);
    height: var(--icon-size-large);
    stroke: currentColor;
    stroke-width: var(--icon-stroke-width);
    stroke-linecap: round;
    stroke-linejoin: round;
    pointer-events: none;
  }
  .page-header-title {
    position: relative;
    z-index: 1;
    min-width: 0;
    margin: 0;
    font-size: var(--font-size-heading-small);
    font-weight: var(--font-weight-semibold);
    line-height: var(--line-height-tight);
    overflow-wrap: anywhere;
    /* Clicks fall through to the back button's area beneath. */
    pointer-events: none;
  }
  .page-header-title:focus:not(:focus-visible) { outline: none; }
  .page-header-actions { display: flex; flex: none; align-items: center; gap: var(--space-2); margin-inline-start: auto; }
  @media (prefers-reduced-motion: reduce) { .page-header-back::after { transition: none; } }
  .page-header-title.muted { color: var(--color-text-secondary); }
</style>
