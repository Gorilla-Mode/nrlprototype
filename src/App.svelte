<script lang="ts">
  import { onMount } from 'svelte';
  import {
    Map,
    GeolocateControl,
    NavigationControl,
    FullscreenControl,
    ScaleControl,
    setWorkerUrl,
  } from 'maplibre-gl';
  import mapWorkerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url';
  import 'maplibre-gl/dist/maplibre-gl.css';

  setWorkerUrl(mapWorkerUrl);

  let mapContainer: HTMLDivElement;
  let map: Map | null = null;
  let geolocateControl: GeolocateControl | null = null;

  const rasterStyle = {
    version: 8,
    sources: {
      rasterTiles: {
        type: 'raster',
        tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
        tileSize: 256,
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      },
    },
    layers: [
      {
        id: 'raster-layer',
        type: 'raster',
        source: 'rasterTiles',
      },
    ],
  } as const;

  onMount(() => {
    map = new Map({
      container: mapContainer,
      style: rasterStyle,
      center: [0, 20],
      zoom: 2,
    });

    geolocateControl = new GeolocateControl({
      positionOptions: {
        enableHighAccuracy: true,
      },
      trackUserLocation: true,
      showUserLocation: true,
      showAccuracyCircle: true,
      fitBoundsOptions: {
        maxZoom: 6,
      },
    });

    map.addControl(geolocateControl, 'top-right');
    map.addControl(new NavigationControl({ visualizePitch: true }), 'top-right');
    map.addControl(new FullscreenControl(), 'top-right');
    map.addControl(new ScaleControl({ unit: 'metric' }), 'bottom-left');

    const handleResize = () => {
      map?.resize();
    };

    window.addEventListener('resize', handleResize);

    map.on('load', () => {
      map?.resize();
      geolocateControl?.trigger();
    });

    map.on('error', (e) => {
      console.error('MapLibre error:', e);
    });

    return () => {
      window.removeEventListener('resize', handleResize);
      map?.remove();
    };
  });
</script>

<main class="map-wrapper">
  <div bind:this={mapContainer} class="map-container"></div>
</main>
