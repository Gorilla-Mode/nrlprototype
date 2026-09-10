<script lang="ts">
  import { onMount } from 'svelte';
  import { createMapController, type MapController } from './createMapController';
  import type { GeolocationState } from './createGeolocationController';
  import type { HoldOrigin } from './createMapHoldController';

  interface Props {
    opacity: number;
    grayscale: boolean;
    onmapclick: () => void;
    ongeolocationstatechange: (state: GeolocationState, message: string) => void;
    onholdchange: (origin: HoldOrigin | null) => void;
    onholdmove: (x: number, y: number) => void;
  }

  let { opacity, grayscale, onmapclick, ongeolocationstatechange, onholdchange, onholdmove }: Props = $props();
  let mapContainer: HTMLDivElement;
  let controller = $state.raw<MapController | null>(null);

  export function toggleGeolocation() {
    controller?.toggleGeolocation();
  }

  onMount(() => {
    const instance = createMapController(mapContainer, {
      initialOpacity: opacity,
      onMapClick: () => onmapclick(),
      onGeolocationStateChange: (state, message) => ongeolocationstatechange(state, message),
      onHoldChange: (origin) => onholdchange(origin),
      onHoldMove: (x, y) => onholdmove(x, y),
    });
    controller = instance;

    return () => {
      controller = null;
      instance.destroy();
      ongeolocationstatechange('unavailable', '');
    };
  });

  $effect(() => {
    controller?.setSatelliteOpacity(opacity);
  });
</script>

<div bind:this={mapContainer} class="map-container" class:is-grayscale={grayscale}></div>

<style>
  .map-container {
    position: absolute;
    inset: 0;
  }

  .map-container :global(.maplibregl-canvas) {
    -webkit-touch-callout: none;
  }
</style>
