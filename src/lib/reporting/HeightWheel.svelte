<script lang="ts">
  import { onMount } from 'svelte';

  let { value, disabled = false, onchange }: {
    value: number | null;
    disabled?: boolean;
    onchange: (value: number | null) => void;
  } = $props();
  let wheel: HTMLDivElement;
  let row = $state<HTMLSpanElement>();
  let ready = false;
  let lastEmitted: number | null | undefined;
  const heights = Array.from({ length: 501 }, (_, height) => height);

  function align() {
    if (wheel && row) wheel.scrollTop = (value ?? 30) * row.getBoundingClientRect().height;
  }
  onMount(() => {
    align();
    ready = true;
    const observer = new ResizeObserver(align);
    if (row) observer.observe(row);
    return () => observer.disconnect();
  });
  $effect(() => {
    const next = value;
    if (ready && next !== lastEmitted) align();
  });
  function scroll() {
    if (!ready || disabled || !row) return;
    const height = Math.max(0, Math.min(500, Math.round(wheel.scrollTop / row.getBoundingClientRect().height)));
    if (height === (value ?? 30)) return;
    lastEmitted = height;
    onchange(height);
  }
  function keydown(event: KeyboardEvent) {
    if (disabled) return;
    const current = value ?? 30;
    const keys: Record<string, number | null> = {
      ArrowUp: current + 1, ArrowDown: current - 1,
      Home: 0, End: 500, Delete: null, Backspace: null,
    };
    if (!(event.key in keys)) return;
    event.preventDefault();
    lastEmitted = undefined;
    onchange(keys[event.key]);
  }
  function select(event: MouseEvent) {
    if (disabled || !(event.target instanceof HTMLElement)) return;
    const height = event.target.dataset.height;
    if (height === undefined) return;
    lastEmitted = undefined;
    onchange(Number(height));
  }
</script>

<div class="height-control" class:disabled>
  <div class="wheel-frame">
    <div class="centre-row" aria-hidden="true"></div>
    <div bind:this={wheel} class="height-wheel" role="spinbutton" tabindex={disabled ? -1 : 0}
      aria-label="Height in metres" aria-valuemin="0" aria-valuemax="500"
      aria-valuenow={value ?? undefined} aria-valuetext={value === null ? 'Not specified' : `${value} metres`}
      aria-disabled={disabled} aria-describedby="height-help"
      onscroll={scroll} onkeydown={keydown} onclick={select}>
      {#each heights as height}
        {#if height === 0}
          <span bind:this={row} class="height-row" class:selected={value === height} data-height={height} aria-hidden="true">{height} <small>m</small></span>
        {:else}
          <span class="height-row" class:selected={value === height} data-height={height} aria-hidden="true">{height} <small>m</small></span>
        {/if}
      {/each}
    </div>
  </div>
  <div class="height-caption">
    <span>{value === null ? 'Not specified' : `${value} m`}</span>
    <button type="button" class="button" {disabled} onclick={() => { lastEmitted = undefined; onchange(value === null ? 30 : null); }}>
      {value === null ? 'Set height' : 'Clear height'}
    </button>
  </div>
  <p id="height-help">Scroll or use arrow keys. Home: 0 m. End: 500 m.</p>
</div>

<style>
  .height-control { min-width: 0; }
  .wheel-frame { position: relative; border: var(--border-default); border-radius: var(--radius-card); overflow: hidden; background: var(--color-background-subtle); }
  .height-wheel { position: relative; height: calc(5 * var(--details-wheel-row)); overflow-y: auto; overscroll-behavior: contain; scroll-snap-type: y mandatory; padding-block: calc(2 * var(--details-wheel-row)); scrollbar-width: none; touch-action: pan-y; mask-image: var(--details-wheel-fade); }
  .height-wheel::-webkit-scrollbar { display: none; }
  .height-wheel:focus-visible { outline-offset: calc(-1 * var(--space-1)); }
  .height-row { display: flex; align-items: center; justify-content: center; gap: var(--space-2); height: var(--details-wheel-row); scroll-snap-align: center; font-size: var(--font-size-heading-small); color: var(--color-text-secondary); cursor: pointer; }
  .height-row.selected { color: var(--color-action-secondary); font-weight: var(--font-weight-semibold); }
  small { font-size: var(--font-size-body-small); pointer-events: none; }
  .centre-row { position: absolute; inset-inline: var(--space-2); top: calc(2 * var(--details-wheel-row)); height: var(--details-wheel-row); border: var(--border-width-emphasis) solid var(--color-action-secondary); border-radius: var(--radius-control); background: var(--color-action-selected); pointer-events: none; }
  .height-caption { display: flex; align-items: center; justify-content: space-between; gap: var(--space-2); margin-top: var(--space-2); font-size: var(--font-size-body-small); }
  p { margin: var(--space-2) 0 0; color: var(--color-text-secondary); font-size: var(--font-size-caption); }
  .disabled { opacity: var(--opacity-disabled); }
  .disabled .height-wheel { overflow: hidden; pointer-events: none; }
</style>
