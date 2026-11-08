<script lang="ts">
  import { tick } from 'svelte';
  import type { GeometryKey, HeightFilterKey } from './filtering';

  let { geometries = $bindable(), heightFilter = $bindable() }: {
    /** Applied at once; empty means any geometry. */
    geometries: Set<GeometryKey>;
    heightFilter: HeightFilterKey;
  } = $props();

  // The same names as the drawing tool's geometry choices.
  const geometryOptions: GeometryKey[] = ['Point', 'Line', 'Polygon'];
  const heightOptions: { key: HeightFilterKey; label: string }[] = [
    { key: 'any', label: 'Any height' },
    { key: 'under30', label: 'Under 30 m' },
    { key: '30to60', label: '30–60 m' },
    { key: 'over60', label: 'Over 60 m' },
  ];

  const id = $props.id();
  let open = $state<'geometry' | 'height' | null>(null);
  let root = $state<HTMLDivElement>();
  let chips: Record<'geometry' | 'height', HTMLButtonElement | undefined> = $state({ geometry: undefined, height: undefined });

  let geometryActive = $derived(geometries.size > 0);
  let heightActive = $derived(heightFilter !== 'any');
  let geometryLabel = $derived(geometries.size === 0 ? 'Geometry'
    : geometries.size === 1 ? `Geometry: ${[...geometries][0]}` : `Geometry: ${geometries.size}`);
  let heightLabel = $derived(heightActive ? `Height: ${heightOptions.find(({ key }) => key === heightFilter)?.label}` : 'Height');

  async function toggle(menu: 'geometry' | 'height') {
    open = open === menu ? null : menu;
    if (!open) return;
    await tick();
    // Start on the chosen value, or the first one.
    const panel = root?.querySelector<HTMLElement>(`#${CSS.escape(`${id}-${menu}`)}`);
    (panel?.querySelector<HTMLInputElement>('input:checked') ?? panel?.querySelector<HTMLInputElement>('input'))?.focus();
  }

  /** Closes the open menu; `refocus` returns focus to its chip (Esc and choosing, not clicking elsewhere). */
  function close(refocus: boolean) {
    const menu = open;
    open = null;
    if (refocus && menu) chips[menu]?.focus();
  }

  function toggleGeometry(key: GeometryKey) {
    const next = new Set(geometries);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    geometries = next;
  }

  // Arrow keys move through a radio group and select as they go; only a click, Space or
  // Enter is a final choice that closes the Height menu.
  let arrowChoice = false;
  function chooseHeight(key: HeightFilterKey) {
    heightFilter = key;
    if (!arrowChoice) close(true);
  }

  function menuKeydown(event: KeyboardEvent) {
    arrowChoice = event.key.startsWith('Arrow');
    if (event.key === 'Escape') {
      // Handled here, so the page's own Escape (back to the map) does not run.
      event.preventDefault();
      event.stopPropagation();
      close(true);
    } else if (event.key === 'Enter' && open === 'height') {
      event.preventDefault();
      close(true);
    }
  }

  // A press outside, or focus leaving, closes the menu without moving focus.
  $effect(() => {
    if (!open) return;
    const outside = (event: Event) => {
      if (root && event.target instanceof Node && !root.contains(event.target)) close(false);
    };
    document.addEventListener('pointerdown', outside);
    document.addEventListener('focusin', outside);
    return () => {
      document.removeEventListener('pointerdown', outside);
      document.removeEventListener('focusin', outside);
    };
  });
</script>

<div class="reports-filters" bind:this={root} role="group" aria-label="Filters">
  <div class="reports-filter">
    <button type="button" class="ds-button reports-tool-button reports-filter-chip" data-variant="secondary" data-color="neutral" class:active={geometryActive}
      bind:this={chips.geometry} aria-haspopup="dialog" aria-expanded={open === 'geometry'} aria-controls={`${id}-geometry`}
      onclick={() => toggle('geometry')}>
      {geometryLabel}
      <svg class="reports-filter-chevron" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="m6 9 6 6 6-6" /></svg>
    </button>
    {#if open === 'geometry'}
      <div class="reports-filter-menu" id={`${id}-geometry`} role="dialog" aria-label="Geometry filter" tabindex="-1" onkeydown={menuKeydown}>
        <fieldset>
          <legend class="sr-only">Geometry</legend>
          {#each geometryOptions as key (key)}
            <label class="reports-filter-option">
              <input type="checkbox" checked={geometries.has(key)} onchange={() => toggleGeometry(key)} />
              {key}
            </label>
          {/each}
        </fieldset>
      </div>
    {/if}
  </div>

  <div class="reports-filter">
    <button type="button" class="ds-button reports-tool-button reports-filter-chip" data-variant="secondary" data-color="neutral" class:active={heightActive}
      bind:this={chips.height} aria-haspopup="dialog" aria-expanded={open === 'height'} aria-controls={`${id}-height`}
      onclick={() => toggle('height')}>
      {heightLabel}
      <svg class="reports-filter-chevron" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="m6 9 6 6 6-6" /></svg>
    </button>
    {#if open === 'height'}
      <div class="reports-filter-menu" id={`${id}-height`} role="dialog" aria-label="Height filter" tabindex="-1" onkeydown={menuKeydown}
        onpointerdown={() => { arrowChoice = false; }}>
        <div role="radiogroup" aria-label="Height">
          {#each heightOptions as option (option.key)}
            <label class="reports-filter-option">
              <input type="radio" name={`${id}-height`} value={option.key} checked={heightFilter === option.key} onchange={() => chooseHeight(option.key)} />
              {option.label}
            </label>
          {/each}
        </div>
      </div>
    {/if}
  </div>
</div>

<style>
  /* Two buttons beside Select in the toolbar row; content width, never stretched. */
  .reports-filters { display: flex; flex: none; align-items: center; gap: var(--space-3); }
  @media (max-width: 37.499rem) { .reports-filters { gap: var(--space-2); } }
  .reports-filter { position: relative; flex: none; }
  .reports-filter-chip { gap: var(--space-2); }
  /* Active: a blue frame and blue text; the label names the choice, so colour is not the only cue. */
  .reports-filter-chip.active { border-color: var(--color-action-secondary); color: var(--color-action-secondary); }
  .reports-filter-chevron {
    flex: none; width: var(--icon-size-small); height: var(--icon-size-small);
    stroke: currentColor; stroke-width: var(--icon-stroke-width); stroke-linecap: round; stroke-linejoin: round;
  }
  [aria-expanded='true'] .reports-filter-chevron { transform: rotate(180deg); }

  /* A small list right under the chip: no boxes around options, just the controls. */
  .reports-filter-menu {
    position: absolute; top: calc(100% + var(--space-1)); left: 0; z-index: var(--layer-popover);
    min-width: 12rem; padding: var(--space-1) 0;
    border: var(--border-default); border-radius: var(--radius-control);
    background: var(--color-background-raised); box-shadow: var(--shadow-control);
  }
  .reports-filter-menu fieldset { margin: 0; padding: 0; border: 0; min-width: 0; }
  /* 44 px rows: the app's minimum target, close to a compact 40. */
  .reports-filter-option {
    display: flex; align-items: center; gap: var(--space-3);
    min-height: var(--target-size-min); padding: 0 var(--space-4);
    font-size: var(--font-size-body); font-weight: var(--font-weight-regular); color: var(--color-text-primary);
    cursor: pointer; white-space: nowrap;
  }
  .reports-filter-option:hover { background: var(--color-map-control-hover); }
  .reports-filter-option input {
    flex: none; width: var(--icon-size-small); height: var(--icon-size-small); margin: 0;
    accent-color: var(--color-action-secondary);
  }
</style>
