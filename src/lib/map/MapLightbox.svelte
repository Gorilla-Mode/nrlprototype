<script lang="ts">
  import { onMount } from 'svelte';
  import { Map as MapLibreMap, NavigationControl } from 'maplibre-gl';
  import Lightbox from './Lightbox.svelte';
  import { createPreviewStyle, mapDefaults } from './mapConfig';
  import { previewCamera, readPreviewVisuals } from './previewMap';
  import type { ReportGeometry } from '../reports/reportGeometry';

  interface Props {
    geometry: ReportGeometry;
    /** Obstacle name, shown as the dialog title. */
    label: string;
    /** The opener closes the dialog and returns focus to its own trigger. */
    onclose: () => void;
  }

  let { geometry, label, onclose }: Props = $props();
  let mapHost: HTMLDivElement;

  // Lightbox has already opened the dialog, so the map measures its real size.
  onMount(() => {
    // One interactive instance for as long as the dialog is open; north stays up.
    const { width, height } = mapHost.getBoundingClientRect();
    const map = new MapLibreMap({
      container: mapHost,
      style: createPreviewStyle(geometry, readPreviewVisuals(mapHost)),
      attributionControl: false,
      maxZoom: mapDefaults.maxZoom,
      dragRotate: false,
      pitchWithRotate: false,
      touchPitch: false,
      ...previewCamera(geometry, width, height),
    });
    map.touchZoomRotate.disableRotation();
    map.keyboard.disableRotation();
    map.addControl(new NavigationControl({ showCompass: false }), 'top-right');
    return () => map.remove();
  });
</script>

<Lightbox title={label} closeLabel="Close map" {onclose}>
  <div class="map-lightbox-canvas" bind:this={mapHost}></div>
  <span class="map-lightbox-attribution">© Kartverket</span>
</Lightbox>

<style>
  .map-lightbox-canvas { position: absolute; inset: 0; }
  .map-lightbox-attribution {
    position: absolute;
    right: var(--space-2);
    bottom: var(--space-2);
    padding: var(--space-1) var(--space-2);
    border-radius: var(--radius-small);
    background: var(--color-background-raised);
    color: var(--color-text-secondary);
    font-size: var(--font-size-caption);
  }
</style>
