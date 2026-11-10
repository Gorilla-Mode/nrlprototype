<script lang="ts">
  import { onMount } from 'svelte';
  import { Map as MapLibreMap, Marker } from 'maplibre-gl';
  import MapButton from './MapButton.svelte';
  import { createTopoStyle, mapDefaults, PREVIEW_MAX_ZOOM } from './mapConfig';

  interface Props {
    /** Names the example for assistive technology. */
    label: string;
  }

  let { label }: Props = $props();

  // The Figma example: a Point beside Storelva and Fv 241 in Hønefoss. A fixed sample,
  // not the reader's position; nothing here creates, edits or stores a report.
  const exampleCenter: [number, number] = [10.2583, 60.1706];
  const exampleZoom = PREVIEW_MAX_ZOOM;
  const minZoom = 5;

  let host: HTMLDivElement;
  let markerElement: HTMLDivElement;
  let map = $state.raw<MapLibreMap | null>(null);
  let zoom = $state(exampleZoom);

  onMount(() => {
    // One interactive instance for the page's lifetime. Wheel zoom is off and touch
    // needs two fingers, so scrolling the guide past the map never moves the map.
    const instance = new MapLibreMap({
      container: host,
      style: createTopoStyle(),
      center: exampleCenter,
      zoom: exampleZoom,
      minZoom,
      maxZoom: mapDefaults.maxZoom,
      attributionControl: false,
      scrollZoom: false,
      cooperativeGestures: true,
      dragRotate: false,
      pitchWithRotate: false,
      touchPitch: false,
    });
    instance.touchZoomRotate.disableRotation();
    instance.keyboard.disableRotation();
    const marker = new Marker({ element: markerElement, anchor: 'center' }).setLngLat(exampleCenter).addTo(instance);
    instance.on('zoom', () => { zoom = instance.getZoom(); });
    map = instance;
    return () => {
      marker.remove();
      instance.remove();
      map = null;
    };
  });

  // MapLibre already shortens camera animations when the reader prefers reduced motion.
  const recenter = () => map?.easeTo({ center: exampleCenter, zoom: exampleZoom });
</script>

<div class="guide-map" role="group" aria-label={label}>
  <div class="guide-map-canvas" bind:this={host}></div>
  <!-- MapLibre moves this into the map and keeps it on the example coordinate. -->
  <div class="guide-map-marker" bind:this={markerElement} aria-hidden="true">
    <svg viewBox="0 0 150 150" fill="none">
      <circle class="marker-radius" cx="75" cy="75" r="74" />
      <ellipse class="marker-shadow" cx="75" cy="99" rx="16" ry="5" />
      <path class="marker-pin" d="M75 11C58.5 11 45 24.5 45 41C45 62.8 75 94 75 94C75 94 105 62.8 105 41C105 24.5 91.5 11 75 11Z" />
      <circle class="marker-pin-center" cx="75" cy="41" r="10.5" />
    </svg>
  </div>
  <div class="guide-map-controls">
    <MapButton aria-label="Centre on the example obstacle" disabled={!map} onclick={recenter}>
      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><circle cx="12" cy="12" r="3" /><path d="M12 3v3m0 12v3M3 12h3m12 0h3" /></svg>
    </MapButton>
    <MapButton aria-label="Zoom in" disabled={!map || zoom >= mapDefaults.maxZoom} onclick={() => map?.zoomIn()}>
      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M12 5v14M5 12h14" /></svg>
    </MapButton>
    <MapButton aria-label="Zoom out" disabled={!map || zoom <= minZoom} onclick={() => map?.zoomOut()}>
      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M5 12h14" /></svg>
    </MapButton>
  </div>
  <p class="guide-map-coordinates">60.1706° N · 10.2583° E · ±4 m</p>
  <span class="guide-map-attribution">© Kartverket</span>
</div>

<style>
  .guide-map {
    position: relative;
    width: 100%;
    aspect-ratio: var(--guide-map-aspect);
    min-height: var(--guide-map-min-height);
    overflow: hidden;
    border: var(--border-default);
    border-radius: var(--radius-card);
    background: var(--color-background-subtle);
    /* Keep the rounded clip on Safari while MapLibre composites its canvas. */
    isolation: isolate;
  }
  .guide-map-canvas { position: absolute; inset: 0; }
  .guide-map-marker { width: var(--guide-map-marker-size); height: var(--guide-map-marker-size); pointer-events: none; }
  .guide-map-marker svg { display: block; width: 100%; height: 100%; }
  .marker-radius { fill: var(--guide-map-radius-fill); stroke: var(--guide-map-radius-stroke); stroke-width: 2; }
  .marker-shadow { fill: var(--guide-map-marker-shadow); }
  .marker-pin { fill: var(--color-registered-obstacle); }
  .marker-pin-center { fill: var(--color-registered-obstacle-outline); }

  .guide-map-controls {
    position: absolute;
    top: 50%;
    right: var(--space-3);
    z-index: var(--layer-map-overlay);
    display: grid;
    gap: var(--map-control-gap);
    transform: translateY(-50%);
  }
  .guide-map-controls svg {
    width: var(--icon-size-default);
    height: var(--icon-size-default);
    stroke: currentColor;
    stroke-width: var(--icon-stroke-width);
    stroke-linecap: round;
  }

  .guide-map-coordinates, .guide-map-attribution {
    position: absolute;
    z-index: var(--layer-map-overlay);
    margin: 0;
    border-radius: var(--radius-small);
    background: var(--color-background-raised);
    color: var(--color-text-secondary);
    pointer-events: none;
  }
  .guide-map-coordinates {
    left: var(--space-4);
    bottom: var(--space-4);
    max-width: calc(100% - 2 * var(--space-4));
    padding: var(--space-2) var(--space-4);
    font-size: var(--guide-eyebrow-size);
    font-weight: var(--guide-font-weight-strong);
  }
  .guide-map-attribution {
    right: var(--space-2);
    bottom: var(--space-2);
    padding: var(--space-1) var(--space-2);
    font-size: var(--font-size-caption);
  }
</style>
