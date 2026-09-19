<script lang="ts">
  import { onMount } from 'svelte';
  import { minObstacleHeightMeters, maxObstacleHeightMeters } from './reporting';

  let { value, disabled = false, onchange }: {
    value: number;
    disabled?: boolean;
    onchange: (value: number) => void;
  } = $props();
  let wheel: HTMLDivElement;
  let row = $state<HTMLSpanElement>();
  let ready = false;
  let lastEmitted: number | undefined;
  const heights = Array.from({ length: maxObstacleHeightMeters - minObstacleHeightMeters + 1 }, (_, index) => minObstacleHeightMeters + index);

  function align() {
    if (wheel && row) wheel.scrollTop = (value - minObstacleHeightMeters) * row.getBoundingClientRect().height;
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
    const height = Math.max(minObstacleHeightMeters, Math.min(maxObstacleHeightMeters, minObstacleHeightMeters + Math.round(wheel.scrollTop / row.getBoundingClientRect().height)));
    if (height === value) return;
    lastEmitted = height;
    onchange(height);
  }
  function keydown(event: KeyboardEvent) {
    if (disabled) return;
    const keys: Record<string, number> = {
      ArrowUp: value + 1, ArrowDown: value - 1,
      Home: minObstacleHeightMeters, End: maxObstacleHeightMeters,
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
    <div class="centre-row" aria-hidden="true"><span>m</span></div>
    <div bind:this={wheel} class="height-wheel" role="spinbutton" tabindex={disabled ? -1 : 0}
      aria-label="Height in metres" aria-valuemin={minObstacleHeightMeters} aria-valuemax={maxObstacleHeightMeters}
      aria-valuenow={value} aria-valuetext={`${value} metres`} aria-required="true"
      aria-disabled={disabled} aria-describedby="height-help"
      onscroll={scroll} onkeydown={keydown} onclick={select}>
      {#each heights as height}
        {#if height === minObstacleHeightMeters}
          <span bind:this={row} class="height-row" class:selected={value === height} data-height={height} aria-hidden="true">{height}</span>
        {:else}
          <span class="height-row" class:selected={value === height} data-height={height} aria-hidden="true">{height}</span>
        {/if}
      {/each}
    </div>
  </div>
  <p id="height-help" class="sr-only">Height is required. Scroll or use arrow keys. Home: {minObstacleHeightMeters} m. End: {maxObstacleHeightMeters} m.</p>
</div>

<style>
  .height-control { min-width: 0; }
  .wheel-frame { position: relative; border: var(--details-border); border-radius: var(--details-control-radius); overflow: hidden; background: var(--color-background-raised); }
  .height-wheel { position: relative; box-sizing: border-box; height: calc(3 * var(--details-wheel-row)); overflow-y: auto; overscroll-behavior: contain; scroll-snap-type: y mandatory; padding-block: var(--details-wheel-row); scrollbar-width: none; touch-action: pan-y; mask-image: var(--details-wheel-fade); }
  .height-wheel::-webkit-scrollbar { display: none; }
  .height-wheel:focus-visible { outline-offset: calc(-1 * var(--details-focus-offset)); }
  .height-row { display: flex; align-items: center; justify-content: center; height: var(--details-wheel-row); scroll-snap-align: center; font-size: var(--details-text-size); color: var(--color-text-secondary); cursor: pointer; }
  .height-row.selected { color: var(--color-text-primary); }
  .centre-row { position: absolute; box-sizing: border-box; inset-inline: var(--details-small-gap); top: 50%; transform: translateY(-50%); height: var(--details-wheel-row); display: flex; align-items: center; justify-content: flex-end; padding-inline: var(--details-small-gap); border: var(--details-border); border-radius: var(--details-control-radius); background: var(--color-background-subtle); pointer-events: none; color: var(--color-text-secondary); font-size: var(--details-caption-size); }
  .disabled { opacity: var(--opacity-disabled); }
  .disabled .height-wheel { overflow: hidden; pointer-events: none; }
</style>
