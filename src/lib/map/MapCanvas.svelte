<script lang="ts">
  import { onMount } from 'svelte';
  import { createMapController, type MapController } from './createMapController';
  import type { GeolocationState } from './createGeolocationController';

  interface Props {
    opacity: number;
    grayscale: boolean;
    onmapclick: () => void;
    ongeolocationstatechange: (state: GeolocationState, message: string) => void;
  }

  let { opacity, grayscale, onmapclick, ongeolocationstatechange }: Props = $props();
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
</style>
