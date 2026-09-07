
<script lang="ts">
  import { onMount, tick } from 'svelte';
  import {
    Map,
    GeolocateControl,
    setWorkerUrl,
    type StyleSpecification,
  } from 'maplibre-gl';
  import mapWorkerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url';
  import 'maplibre-gl/dist/maplibre-gl.css';

  setWorkerUrl(mapWorkerUrl);

  let mapContainer: HTMLDivElement;
  let map: Map | null = null;
  let geolocateControl: GeolocateControl | null = null;
  let satelliteOpacity: number = 0.0;
  let isLayerFadeOpen = false;
  let layerButton: HTMLButtonElement;
  let layerSlider: HTMLInputElement;
  let locationMessage = '';

  const toggleLayerFade = async () => {
    isLayerFadeOpen = !isLayerFadeOpen;
    if (isLayerFadeOpen) {
      await tick();
      layerSlider?.focus();
    }
  };

  const handleKeydown = (event: KeyboardEvent) => {
    if (event.key === 'Escape' && isLayerFadeOpen) {
      isLayerFadeOpen = false;
      layerButton?.focus();
    }
  };

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
      center: [5.3435, 60.4055],
      zoom: 13.5,
      maxZoom: 18,
      attributionControl: { compact: true },
    });

    geolocateControl = new GeolocateControl({
      positionOptions: {
        enableHighAccuracy: true,
        timeout: 10000,
      },
      trackUserLocation: true,
      showUserLocation: true,
      showAccuracyCircle: true,
      fitBoundsOptions: {
        maxZoom: 16,
      },
    });

    map.addControl(geolocateControl, 'top-right');

    geolocateControl.on('trackuserlocationstart', () => {
      locationMessage = '';
    });

    geolocateControl.on('geolocate', () => {
      locationMessage = '';
    });

    geolocateControl.on('error', (event) => {
      locationMessage = event.code === 1
        ? 'Allow location access in your browser to find your position.'
        : 'Unable to find your location. Please try again.';
    });

    map.on('click', () => {
      isLayerFadeOpen = false;
      locationMessage = '';
    });

    const handleResize = () => {
      map?.resize();
    };

    window.addEventListener('resize', handleResize);

    map.on('load', () => {
      applySatelliteOpacity(satelliteOpacity);
      map?.resize();

      const attribution = mapContainer.querySelector<HTMLDetailsElement>('.maplibregl-ctrl-attrib');
      if (attribution?.classList.contains('maplibregl-compact')) {
        attribution.open = false;
        attribution.classList.remove('maplibregl-compact-show');
      }
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

<svelte:window onkeydown={handleKeydown} />

<main class="map-wrapper" aria-label="Home map">
  <div bind:this={mapContainer} class="map-container"></div>

  <div class="map-toolbar" role="group" aria-label="Map tools">
    <div class="search-bar">
      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <circle cx="10.75" cy="10.75" r="6.75" />
        <path d="m16 16 5 5" />
      </svg>
      <input
        type="search"
        placeholder="Search place or address"
        aria-label="Search place or address"
        disabled
      />
    </div>

    <button class="map-button" type="button" aria-label="Reports" disabled>
      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M13 3H6a1 1 0 0 0-1 1v16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V9l-6-6Z" />
        <path d="M13 3v6h6M8.5 13h7M8.5 16.5h7M8.5 9h1" />
      </svg>
    </button>

    <button class="map-button" type="button" aria-label="Menu" disabled>
      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M4 6h16M4 12h16M4 18h16" />
      </svg>
    </button>
  </div>

  <div class="map-actions">
    <button
      bind:this={layerButton}
      class="map-button layer-button"
      class:is-active={isLayerFadeOpen}
      type="button"
      aria-label="Fade map layers"
      aria-expanded={isLayerFadeOpen}
      aria-controls="layer-fade-panel"
      title="Fade map layers"
      onclick={toggleLayerFade}
    >
      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="m3 8 9-5 9 5-9 5-9-5ZM3 12l9 5 9-5M3 16l9 5 9-5" />
      </svg>
    </button>

    <div id="layer-fade-panel" class="layer-fade-panel" hidden={!isLayerFadeOpen}>
      <label class="sr-only" for="satellite-opacity">Fade between map and aerial imagery</label>
      <span class="fade-endpoint" aria-hidden="true">Aerial</span>
      <input
        bind:this={layerSlider}
        id="satellite-opacity"
        class="layer-fade-slider"
        type="range"
        min="0"
        max="1"
        step="0.01"
        bind:value={satelliteOpacity}
        aria-orientation="vertical"
        aria-valuetext={`${Math.round(satelliteOpacity * 100)}% aerial imagery, ${Math.round((1 - satelliteOpacity) * 100)}% map`}
        style={`--fade-position: ${satelliteOpacity * 100}%`}
      />
      <span class="fade-endpoint" aria-hidden="true">Map</span>
    </div>
  </div>

  <div class="location-status" role="status">
    {#if locationMessage}
      <p>{locationMessage}</p>
    {/if}
  </div>
</main>
