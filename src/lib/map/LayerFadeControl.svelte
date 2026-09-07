<script lang="ts">
  import { tick } from 'svelte';
  import MapButton from './MapButton.svelte';

  interface Props {
    opacity?: number;
    open?: boolean;
  }

  let { opacity = $bindable(0), open = $bindable(false) }: Props = $props();
  let layerButton = $state<HTMLButtonElement>();
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
      style={`--fade-position: ${opacity * 100}%`}
    />
    <span class="fade-endpoint" aria-hidden="true">Topo</span>
  </div>
</div>

<style>
  .layer-fade-slider:focus-visible {
    outline: 2px solid var(--color-focus);
    outline-offset: 3px;
  }

  .layer-fade-control {
    position: relative;
    width: var(--map-control-size);
    height: var(--map-control-size);
  }

  .layer-fade-panel {
    position: absolute;
    top: calc(100% + 8px);
    right: 0;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 10px;
    width: var(--map-control-size);
    padding: 15px 0;
    border-radius: 999px;
    background: var(--color-surface);
    box-shadow: var(--shadow-control);
  }

  .layer-fade-panel[hidden] {
    display: none;
  }

  .fade-endpoint {
    color: var(--color-muted-strong);
    font-size: 10px;
    line-height: 1;
  }

  .layer-fade-slider {
    writing-mode: vertical-lr;
    direction: rtl;
    appearance: none;
    -webkit-appearance: none;
    width: 36px;
    height: clamp(72px, 20dvh, 140px);
    margin: 0;
    border-radius: 18px;
    background: transparent;
    cursor: pointer;
    touch-action: none;
  }

  .layer-fade-slider::-webkit-slider-runnable-track {
    width: 4px;
    height: 100%;
    border-radius: 999px;
    background: linear-gradient(to top, var(--color-accent) var(--fade-position), var(--color-track-muted) var(--fade-position));
  }

  .layer-fade-slider::-webkit-slider-thumb {
    appearance: none;
    -webkit-appearance: none;
    width: 20px;
    height: 20px;
    margin-left: -8px;
    border: 3px solid var(--color-surface);
    border-radius: 50%;
    background: var(--color-accent);
    box-shadow: var(--shadow-slider);
  }

  .layer-fade-slider::-moz-range-track {
    width: 4px;
    height: 100%;
    border-radius: 999px;
    background: linear-gradient(to top, var(--color-accent) var(--fade-position), var(--color-track-muted) var(--fade-position));
  }

  .layer-fade-slider::-moz-range-thumb {
    width: 14px;
    height: 14px;
    border: 3px solid var(--color-surface);
    border-radius: 50%;
    background: var(--color-accent);
    box-shadow: var(--shadow-slider);
  }

  .sr-only {
    position: absolute;
    width: 1px;
    height: 1px;
    padding: 0;
    overflow: hidden;
    clip-path: inset(50%);
    white-space: nowrap;
    border: 0;
  }

  @media (max-height: 520px) {
    .layer-fade-panel {
      top: 50%;
      right: calc(100% + 8px);
      transform: translateY(-50%);
    }
  }
</style>
