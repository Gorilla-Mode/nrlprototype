<script lang="ts">
  import { onMount } from 'svelte';
  import { createMapController, type MapController } from './createMapController';

  interface Props {
    opacity: number;
    onmapclick: () => void;
    onlocationmessage: (message: string) => void;
  }

  let { opacity, onmapclick, onlocationmessage }: Props = $props();
  let mapContainer: HTMLDivElement;
  let controller = $state.raw<MapController | null>(null);

  onMount(() => {
    const instance = createMapController(mapContainer, {
      initialOpacity: opacity,
      onMapClick: () => onmapclick(),
      onLocationMessage: (message) => onlocationmessage(message),
    });
    controller = instance;

    return () => {
      controller = null;
      instance.destroy();
    };
  });

  $effect(() => {
    controller?.setSatelliteOpacity(opacity);
  });
</script>

<div bind:this={mapContainer} class="map-container"></div>

<style>
  .map-container {
    position: absolute;
    inset: 0;
  }

  .map-container :global(.maplibregl-ctrl-group button) {
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

  .map-container :global(.maplibregl-ctrl-group button:not(:disabled):hover) {
    background-color: var(--color-surface-hover);
  }

  .map-container :global(.maplibregl-ctrl-group button:focus-visible) {
    outline: 2px solid var(--color-focus);
    outline-offset: 3px;
  }

  .map-container :global(.maplibregl-ctrl-top-right) {
    top: var(--map-actions-top);
    right: var(--map-right-inset);
  }

  .map-container :global(.maplibregl-ctrl-top-right .maplibregl-ctrl) {
    margin: 0;
  }

  .map-container :global(.maplibregl-ctrl-group) {
    border-radius: 50%;
    background: transparent;
    box-shadow: none;
  }

  .map-container :global(.maplibregl-ctrl button.maplibregl-ctrl-geolocate .maplibregl-ctrl-icon) {
    width: 24px;
    height: 24px;
    background: currentColor;
    mask: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='black' stroke-width='1.7' stroke-linecap='round'%3E%3Ccircle cx='12' cy='12' r='5'/%3E%3Cpath d='M12 3v4m0 10v4M3 12h4m10 0h4'/%3E%3C/svg%3E") center / contain no-repeat;
  }

  .map-container :global(.maplibregl-ctrl-group .maplibregl-ctrl-geolocate-active),
  .map-container :global(.maplibregl-ctrl-group .maplibregl-ctrl-geolocate-background) {
    color: var(--color-positive);
  }

  .map-container :global(.maplibregl-ctrl-group .maplibregl-ctrl-geolocate-active) {
    background: var(--color-surface-active);
  }

  .map-container :global(.maplibregl-ctrl-group .maplibregl-ctrl-geolocate-active-error),
  .map-container :global(.maplibregl-ctrl-group .maplibregl-ctrl-geolocate-background-error) {
    color: var(--color-negative);
  }

  .map-container :global(.maplibregl-ctrl-geolocate:disabled) {
    cursor: default;
    color: var(--color-disabled);
  }

  .map-container :global(.maplibregl-ctrl-bottom-right) {
    right: max(0px, env(safe-area-inset-right));
    bottom: max(0px, env(safe-area-inset-bottom));
  }

  @media (prefers-reduced-motion: reduce) {
    .map-container :global(.maplibregl-ctrl-group button) {
      transition: none;
    }
  }
</style>
