<script lang="ts">
  import { tick } from 'svelte';
  import MapButton from './MapButton.svelte';

  interface Props {
    opacity?: number;
    open?: boolean;
  }

  let { opacity = $bindable(0), open = $bindable(false) }: Props = $props();
  let layerButton = $state<HTMLButtonElement | null>(null);
  let layerSlider: HTMLInputElement;

  const toggleLayerFade = async () => {
    open = !open;
    if (open) {
      await tick();
      layerSlider?.focus();
    }
  };

  const handleKeydown = (event: KeyboardEvent) => {
    if (event.key === 'Escape' && open) {
      open = false;
      layerButton?.focus();
    }
  };
</script>

<svelte:window onkeydown={handleKeydown} />

<div class="layer-fade-control">
  <MapButton
    bind:element={layerButton}
    class="layer-button"
    active={open}
    type="button"
    aria-label="Fade map layers"
    aria-expanded={open}
    aria-controls="layer-fade-panel"
    title="Fade map layers"
    onclick={toggleLayerFade}
  >
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="m3 8 9-5 9 5-9 5-9-5ZM3 12l9 5 9-5M3 16l9 5 9-5" />
    </svg>
  </MapButton>

  <div id="layer-fade-panel" class="layer-fade-panel" hidden={!open}>
    <label class="sr-only" for="satellite-opacity">Fade between topographic map and satellite imagery</label>
    <span class="fade-endpoint" aria-hidden="true">Sat</span>
    <input
      bind:this={layerSlider}
      id="satellite-opacity"
      class="layer-fade-slider"
      type="range"
      min="0"
      max="1"
      step="0.01"
      bind:value={opacity}
      aria-orientation="vertical"
      aria-valuetext={`${Math.round(opacity * 100)}% aerial imagery, ${Math.round((1 - opacity) * 100)}% map`}
      style={`--map-slider-position: ${opacity * 100}%`}
    />
    <span class="fade-endpoint" aria-hidden="true">Topo</span>
  </div>
</div>

<style>
  .layer-fade-control {
    position: relative;
    width: var(--map-control-size);
    height: var(--map-control-size);
  }

  .layer-fade-panel {
    position: absolute;
    z-index: var(--layer-popover);
    top: calc(100% + var(--map-slider-panel-gap));
    right: 0;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--space-3);
    width: var(--map-control-size);
    padding-block: var(--map-slider-panel-padding-block);
    border: var(--map-control-border);
    border-radius: var(--radius-pill);
    background: var(--color-map-control-surface);
    box-shadow: var(--shadow-control);
  }

  .layer-fade-panel[hidden] {
    display: none;
  }

  .fade-endpoint {
    color: var(--color-text-secondary);
    font-size: var(--font-size-caption);
    font-weight: var(--font-weight-medium);
    line-height: var(--line-height-tight);
  }

  .layer-fade-slider {
    writing-mode: vertical-lr;
    direction: rtl;
    appearance: none;
    -webkit-appearance: none;
    width: var(--map-slider-hit-width);
    height: clamp(
      var(--map-slider-height-min),
      var(--map-slider-height-fluid),
      var(--map-slider-height-max)
    );
    margin: 0;
    border-radius: var(--radius-pill);
    background: transparent;
    cursor: pointer;
    touch-action: none;
  }

  .layer-fade-slider::-webkit-slider-runnable-track {
    width: var(--map-slider-track-width);
    height: 100%;
    border-radius: var(--radius-pill);
    background: linear-gradient(
      to top,
      var(--color-action-secondary) var(--map-slider-position),
      var(--color-map-track) var(--map-slider-position)
    );
  }

  .layer-fade-slider::-webkit-slider-thumb {
    appearance: none;
    -webkit-appearance: none;
    width: var(--map-slider-thumb-size);
    height: var(--map-slider-thumb-size);
    margin-left: var(--map-slider-thumb-offset);
    border: var(--map-slider-thumb-border-width) solid var(--color-background-raised);
    border-radius: var(--radius-round);
    background: var(--color-action-secondary);
    box-shadow: var(--shadow-slider);
  }

  .layer-fade-slider::-moz-range-track {
    width: var(--map-slider-track-width);
    height: 100%;
    border-radius: var(--radius-pill);
    background: linear-gradient(
      to top,
      var(--color-action-secondary) var(--map-slider-position),
      var(--color-map-track) var(--map-slider-position)
    );
  }

  .layer-fade-slider::-moz-range-thumb {
    width: var(--map-slider-thumb-size);
    height: var(--map-slider-thumb-size);
    border: var(--map-slider-thumb-border-width) solid var(--color-background-raised);
    border-radius: var(--radius-round);
    background: var(--color-action-secondary);
    box-shadow: var(--shadow-slider);
  }
</style>
