<script lang="ts">
  import type { Snippet } from 'svelte';

  /**
   * The header of the Reports list, report detail and edit pages: a white 56 px bar with a back
   * button that names where it goes ("‹ Map", "‹ Reports", "‹ Report") and an optional status
   * chip, then a large title in the content column with what belongs under it (the meta line,
   * or the list's tools). Place it at the top of the page's scroll container: the bar stays at
   * the top while the title scrolls away with the content.
   */
  interface Props {
    title: string;
    /** Visible text after the chevron: where the button goes. */
    backText: string;
    /** Accessible name of the back button, e.g. "Back to map". */
    backLabel: string;
    onback: () => void;
    /** 30 px on the Reports list, 26 px on report pages. */
    size?: 'list' | 'page';
    /** A placeholder title, such as "Untitled obstacle", in secondary text. */
    titleMuted?: boolean;
    /** The h1; the list focuses it when it opens. */
    heading?: HTMLHeadingElement;
    /** Names the title area for assistive technology, e.g. "Find reports". */
    areaLabel?: string;
    /** The report detail page's content widens past 1200 px; the title follows it. */
    wide?: boolean;
    /** Right side of the bar: a status chip. */
    actions?: Snippet;
    /** Under the title, in the content column: the meta line or the sort line. */
    children?: Snippet;
    /** After the title row, full width: tools that bring their own alignment. */
    below?: Snippet;
  }

  let { title, backText, backLabel, onback, size = 'page', titleMuted = false, heading = $bindable(), areaLabel, wide = false, actions, children, below }: Props = $props();
</script>

<header class="large-title-bar">
  <button type="button" class="large-title-back" aria-label={backLabel} onclick={onback}>
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="m15 18-6-6 6-6" /></svg>
    {backText}
  </button>
  {#if actions}<div class="large-title-actions">{@render actions()}</div>{/if}
</header>

<section class="large-title-area" aria-label={areaLabel}>
  <div class="large-title-row" class:wide>
    <h1 class="large-title" class:list={size === 'list'} class:muted={titleMuted} bind:this={heading} tabindex="-1">{title}</h1>
    {@render children?.()}
  </div>
  {@render below?.()}
</section>

<style>
  .large-title-bar {
    position: sticky; top: 0; z-index: var(--layer-popover);
    display: flex; align-items: center; justify-content: space-between; gap: var(--space-3); box-sizing: content-box;
    height: var(--large-title-bar-height); padding-top: var(--safe-area-top);
    padding-inline: max(var(--large-title-bar-inset), var(--safe-area-left)) max(var(--large-title-bar-inset), var(--safe-area-right));
    background: var(--color-background-raised);
  }
  /* 12 px from the screen edge, not the content column; at least 44 × 44. */
  .large-title-back {
    display: inline-flex; align-items: center; gap: var(--space-1); flex: none;
    min-width: var(--target-size-min); min-height: var(--target-size-min); padding: 0 var(--space-2) 0 0;
    border: 0; border-radius: var(--radius-control); background: transparent;
    color: var(--color-action-secondary); font: inherit; font-size: var(--large-title-back-font-size); font-weight: var(--font-weight-medium);
    cursor: pointer;
  }
  .large-title-back:hover { background: var(--color-map-control-hover); }
  .large-title-back svg {
    flex: none; width: var(--icon-size-large); height: var(--icon-size-large);
    stroke: currentColor; stroke-width: var(--icon-stroke-width); stroke-linecap: round; stroke-linejoin: round;
  }
  .large-title-actions { display: flex; flex: none; align-items: center; gap: var(--space-2); }

  /* The bar continues into the title area: one white header, closed by a line. */
  .large-title-area { padding-bottom: var(--space-5); border-bottom: var(--border-default); background: var(--color-background-raised); }
  .large-title-row {
    max-width: calc(var(--page-content-max) + 2 * var(--page-gutter)); margin-inline: auto; box-sizing: border-box;
    padding-inline: max(var(--page-gutter), var(--safe-area-left)) max(var(--page-gutter), var(--safe-area-right));
  }
  @media (min-width: 75.0625rem) { .large-title-row.wide { max-width: var(--detail-wide-max); } }
  /* Long titles wrap; they are never truncated. */
  .large-title {
    margin: 0; color: var(--color-text-primary); overflow-wrap: anywhere;
    font-size: var(--large-title-size-page); font-weight: var(--font-weight-bold); line-height: var(--line-height-tight);
  }
  .large-title.list { font-size: var(--large-title-size-list); }
  .large-title.muted { color: var(--color-text-secondary); }
  .large-title:focus:not(:focus-visible) { outline: none; }
</style>
