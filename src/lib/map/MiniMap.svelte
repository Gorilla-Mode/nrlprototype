<script lang="ts">
  import { tick } from 'svelte';
  import { Map as MapLibreMap } from 'maplibre-gl';
  import MapLightbox from './MapLightbox.svelte';
  import { createPreviewStyle } from './mapConfig';
  import { previewCamera, readPreviewVisuals } from './previewMap';
  import type { ReportGeometry } from '../reports/reportGeometry';

  interface Props {
    geometry: ReportGeometry | null;
    /** Names the obstacle for assistive technology and titles the enlarged map. */
    label: string;
    /** Opens the geometry on the main map; only the "Show on map" button does this. */
    onshowonmap?: () => void;
  }

  let { geometry, label, onshowonmap }: Props = $props();

  let frame = $state<HTMLElement | undefined>();
  let host = $state<HTMLDivElement | undefined>();
  // A finished preview is kept as an image and its MapLibre instance removed, so any
  // number of previews never hold WebGL contexts (browsers cap them at about 16).
  let snapshot = $state<string | null>(null);
  let enlarged = $state(false);
  let enlargeButton = $state<HTMLButtonElement | undefined>();

  // Focus goes back to this button explicitly: a click does not focus buttons in every
  // browser (Safari), so the dialog cannot rely on what was focused when it opened.
  // preventScroll keeps the report page exactly where the reader left it.
  async function closeEnlarged() {
    enlarged = false;
    await tick();
    enlargeButton?.focus({ preventScroll: true });
  }

  function render(container: HTMLDivElement, shape: ReportGeometry, onSnapshot: (url: string) => void): MapLibreMap {
    const { width, height } = container.getBoundingClientRect();
    const map = new MapLibreMap({
      container,
      style: createPreviewStyle(shape, readPreviewVisuals(container)),
      interactive: false,
      attributionControl: false,
      fadeDuration: 0,
      canvasContextAttributes: { preserveDrawingBuffer: true },
      ...previewCamera(shape, width, height),
    });
    // 'idle' fires once every tile has loaded or failed, so a slow or offline tile
    // server still ends with a preview of the geometry itself.
    map.once('idle', () => {
      try {
        onSnapshot(map.getCanvas().toDataURL('image/png'));
        map.remove();
      } catch {
        // Unreadable canvas: keep the live, non-interactive map instead.
      }
    });
    return map;
  }

  $effect(() => {
    const shape = geometry;
    const container = host;
    if (!shape || !container || !frame) return;
    snapshot = null;
    let map: MapLibreMap | null = null;
    // Defer the instance until the preview scrolls near the viewport.
    const observer = new IntersectionObserver((entries) => {
      if (!entries.some((entry) => entry.isIntersecting)) return;
      observer.disconnect();
      map = render(container, shape, (url) => { map = null; snapshot = url; });
    }, { rootMargin: '200px' });
    observer.observe(frame);
    return () => {
      observer.disconnect();
      map?.remove();
    };
  });
</script>

{#if !geometry}
  <div class="mini-map mini-map-empty">No location set</div>
{:else}
  <div class="mini-map" bind:this={frame}>
    <button bind:this={enlargeButton} type="button" class="mini-map-enlarge" aria-label={`Enlarge map of ${label}`} aria-haspopup="dialog" onclick={() => (enlarged = true)}>
      {#if snapshot}
        <img class="mini-map-image" src={snapshot} alt="" />
      {:else}
        <div class="mini-map-canvas" bind:this={host}></div>
      {/if}
    </button>
    {#if onshowonmap}
      <!-- A sibling of the enlarge button, not inside it: buttons cannot nest. -->
      <button type="button" class="mini-map-action" onclick={onshowonmap}><span>Show on map</span></button>
    {/if}
    <span class="mini-map-attribution">© Kartverket</span>
  </div>
  {#if enlarged}
    <MapLightbox {geometry} {label} onclose={closeEnlarged} />
  {/if}
{/if}

<style>
  .mini-map {
    position: relative;
    display: block;
    width: 100%;
    height: var(--reports-mini-map-height);
    margin-top: var(--space-2);
    padding: 0;
    overflow: hidden;
    border: var(--border-default);
    border-radius: var(--radius-control);
    background: var(--color-background-subtle);
    color: var(--color-text-secondary);
  }
  .mini-map-enlarge { position: absolute; inset: 0; width: 100%; height: 100%; padding: 0; border: 0; background: transparent; cursor: zoom-in; }
  .mini-map-enlarge:focus-visible { outline: var(--border-width-emphasis) solid var(--color-action-secondary); outline-offset: calc(-1 * var(--border-width-emphasis)); }

  .mini-map-empty {
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: var(--font-size-body-small);
  }

  .mini-map-canvas, .mini-map-image { position: absolute; inset: 0; width: 100%; height: 100%; }
  .mini-map-image { object-fit: cover; }

  .mini-map-action span, .mini-map-attribution {
    padding: var(--space-1) var(--space-2);
    border-radius: var(--radius-small);
    background: var(--color-background-raised);
    font-size: var(--font-size-caption);
  }
  /* 44px target around the small label, which keeps its place in the corner. */
  .mini-map-action {
    position: absolute;
    left: 0;
    bottom: 0;
    display: flex;
    align-items: flex-end;
    min-width: var(--target-size-min);
    min-height: var(--target-size-min);
    padding: 0 0 var(--space-2) var(--space-2);
    border: 0;
    background: transparent;
    color: var(--color-action-secondary);
    font-weight: var(--font-weight-semibold);
    cursor: pointer;
  }
  .mini-map-action:hover span { text-decoration: underline; }
  .mini-map-attribution { position: absolute; right: var(--space-2); bottom: var(--space-2); color: var(--color-text-secondary); pointer-events: none; }
</style>
