<script lang="ts">
  import { onMount } from 'svelte';
  import { createMapController, type MapController } from './createMapController';

  interface Props {
    opacity: number;
    grayscale: boolean;
    geolocationContainer: HTMLDivElement | null;
    onmapclick: () => void;
    onlocationmessage: (message: string) => void;
  }

  let { opacity, grayscale, geolocationContainer, onmapclick, onlocationmessage }: Props = $props();
  let mapContainer: HTMLDivElement;
  let controller = $state.raw<MapController | null>(null);

  onMount(() => {
    if (!geolocationContainer) {
      throw new Error('MapCanvas requires a geolocation control container.');
    }

    const instance = createMapController(mapContainer, {
      initialOpacity: opacity,
      geolocationContainer,
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

<div bind:this={mapContainer} class="map-container" class:is-grayscale={grayscale}></div>

<style>
  .map-container {
    position: absolute;
    inset: 0;
  }
</style>
