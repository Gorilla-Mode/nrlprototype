<script lang="ts">
  import { onMount } from 'svelte';
  import {
    Map,
    GeolocateControl,
    NavigationControl,
    FullscreenControl,
    ScaleControl,
    setWorkerUrl,
    type StyleSpecification,
  } from 'maplibre-gl';
  import mapWorkerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url';
  import 'maplibre-gl/dist/maplibre-gl.css';

  setWorkerUrl(mapWorkerUrl);

  let mapContainer: HTMLDivElement;
  let map: Map | null = null;
  let geolocateControl: GeolocateControl | null = null;
  let satelliteOpacity = 0.5;

  const applySatelliteOpacity = (opacity: number) => {
    if (!map || !map.getLayer('satellite-layer')) return;
    map.setPaintProperty('satellite-layer', 'raster-opacity', opacity);
  };

  const rasterStyle: StyleSpecification = {
    version: 8,
    sources: {
      n100: {
        type: 'raster',
        tiles: ['https://cache.kartverket.no/v1/wmts/1.0.0/topo/default/webmercator/{z}/{y}/{x}.png'],
        tileSize: 256,
        attribution: '&copy; <a href="https://www.kartverket.no/">Kartverket</a>',
      },
      s100: {
        type: 'raster',
        tiles: [
          'https://geodata.npolar.no/arcgis/rest/services/Basisdata/NP_Basiskart_Svalbard_WMTS_3857/MapServer/WMTS/tile/1.0.0/Basisdata_NP_Basiskart_Svalbard_WMTS_3857/default/default028mm/{z}/{y}/{x}',
        ],
        tileSize: 256,
        attribution: '&copy; <a href="https://geodata.npolar.no/">Norsk Polarinstitutt</a>',
      },
      j100: {
        type: 'raster',
        tiles: [
          'https://geodata.npolar.no/arcgis/rest/services/Basisdata/NP_Basiskart_JanMayen_WMTS_3857/MapServer/WMTS/tile/1.0.0/Basisdata_NP_Basiskart_JanMayen_WMTS_3857/default/default028mm/{z}/{y}/{x}',
        ],
        tileSize: 256,
        attribution: '&copy; <a href="https://geodata.npolar.no/">Norsk Polarinstitutt</a>',
      },
      osm: {
        type: 'raster',
        tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
        tileSize: 512,
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      },
      satellite: {
        type: 'raster',
        tiles: ['https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'],
        tileSize: 256,
        attribution:
          '&copy; <a href="https://www.esri.com/">Esri</a>, &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      },
    },
    layers: [
      {
        id: 'base-layer',
        type: 'raster',
        source: 'osm',
      },
      {
        id: 'n100-layer',
        type: 'raster',
        source: 'n100',
      },
      {
        id: 's100-layer',
        type: 'raster',
        source: 's100',
      },
      {
        id: 'j100-layer',
        type: 'raster',
        source: 'j100',
      },
      {
        id: 'satellite-layer',
        type: 'raster',
        source: 'satellite',
        paint: {
          'raster-opacity': satelliteOpacity,
        },
      },
    ],
  };

  $: if (map) {
    applySatelliteOpacity(satelliteOpacity);
  }

  onMount(() => {
    map = new Map({
      container: mapContainer,
      style: rasterStyle,
      center: [0, 20],
      zoom: 2,
      maxZoom: 18,
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
      applySatelliteOpacity(satelliteOpacity);
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
  <div class="map-controls">
    <label for="satellite-opacity">Satellite opacity</label>
    <input
      id="satellite-opacity"
      type="range"
      min="0"
      max="1"
      step="0.01"
      bind:value={satelliteOpacity}
    />
    <span>{satelliteOpacity.toFixed(2)}</span>
  </div>
  <div bind:this={mapContainer} class="map-container"></div>
</main>
