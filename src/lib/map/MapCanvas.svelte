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
</style>
