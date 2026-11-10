<script lang="ts">
  import { tick } from 'svelte';
  import { Map as MapLibreMap } from 'maplibre-gl';
  import MapLightbox from './MapLightbox.svelte';
  import { createReportMapStyle } from './mapConfig';
  import { readReportMapVisuals, reportMapCamera } from './previewMap';
  import { coordinateLabel, type ReportGeometry } from '../reports/reportGeometry';
  import { obstacleGeometryChoices } from '../reporting/obstacle';

  interface Props {
    geometry: ReportGeometry | null;
    /** Names the obstacle for assistive technology and titles the enlarged map. */
    label: string;
    /** When set, the preview opens the location editor instead of the enlarged map. */
    onedit?: () => void;
    /**
     * An error report's registered position, when the reported (corrected) one differs:
     * drawn as a hollow ring beside the filled reported point, both in view, with a legend.
     */
    registered?: { lat: number; lng: number } | null;
    /** Replaces the caption under the map, e.g. how far an error report moves the obstacle. */
    caption?: string;
    /** Report detail page: an Enlarge button in the corner, and what the read-only viewer says. */
    viewer?: { title: string; subtitle: string; note: string };
  }

  /**
   * The report map on every report page (edit, Ready, sent and error reports): one height rule
   * (16:9, within --report-map-min/max-height), one zoom, one marker, and the same caption.
   */
  let { geometry, label, onedit, registered = null, caption: captionOverride, viewer }: Props = $props();
  let enlargeCorner = $state<HTMLButtonElement | undefined>();
  let openedFrom: HTMLButtonElement | undefined;
  let registeredPoint = $derived<[number, number] | null>(registered ? [registered.lng, registered.lat] : null);
  // "Point · 60.4053° N, 5.3455° E": the drawing tool's word, then the coordinates, no vertex count.
  let caption = $derived(captionOverride ?? [
    obstacleGeometryChoices.find(({ type }) => type === geometry?.type)?.label,
    coordinateLabel(geometry),
  ].filter(Boolean).join(' · '));

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
    (openedFrom ?? enlargeButton)?.focus({ preventScroll: true });
  }

  function enlarge(from: HTMLButtonElement | undefined) {
    openedFrom = from;
    enlarged = true;
  }

  function render(container: HTMLDivElement, shape: ReportGeometry, point: [number, number] | null, onSnapshot: (url: string) => void): MapLibreMap {
    const { width, height } = container.getBoundingClientRect();
    const map = new MapLibreMap({
      container,
      style: createReportMapStyle(shape, readReportMapVisuals(container), point),
      interactive: false,
      attributionControl: false,
      fadeDuration: 0,
      canvasContextAttributes: { preserveDrawingBuffer: true },
      ...reportMapCamera(shape, width, height, point),
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
    const point = registeredPoint;
    const container = host;
    if (!shape || !container || !frame) return;
    snapshot = null;
    let map: MapLibreMap | null = null;
    // Defer the instance until the preview scrolls near the viewport.
    const observer = new IntersectionObserver((entries) => {
      if (!entries.some((entry) => entry.isIntersecting)) return;
      observer.disconnect();
      map = render(container, shape, point, (url) => { map = null; snapshot = url; });
    }, { rootMargin: '200px' });
    observer.observe(frame);
    return () => {
      observer.disconnect();
      map?.remove();
    };
  });
</script>

{#if !geometry}
  <div class="mini-map-frame"><div class="mini-map mini-map-empty">No location set</div></div>
{:else}
  <div class="mini-map-frame">
  <div class="mini-map" bind:this={frame}>
    <button bind:this={enlargeButton} type="button" class="mini-map-enlarge" aria-label={onedit ? `Edit location of ${label}` : `Enlarge map of ${label}`} aria-haspopup="dialog"
      onclick={() => { if (onedit) onedit(); else enlarge(enlargeButton); }}>
      {#if snapshot}
        <img class="mini-map-image" src={snapshot} alt="" />
      {:else}
        <div class="mini-map-canvas" bind:this={host}></div>
      {/if}
    </button>
    <span class="mini-map-attribution">© Kartverket</span>
    {#if viewer && !onedit}
      <!-- A visible, 44 px way to the viewer besides tapping the map itself. -->
      <button bind:this={enlargeCorner} type="button" class="mini-map-corner" aria-haspopup="dialog" onclick={() => enlarge(enlargeCorner)}>
        <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M14 4h6v6M10 20H4v-6M20 4l-7 7M4 20l7-7" /></svg>
        Enlarge
      </button>
    {/if}
  </div>
  </div>
  {#if registeredPoint}
    <!-- Shape, not only colour, tells the two positions apart: a ring and a filled dot. -->
    <p class="mini-map-legend">
      <span class="mini-map-symbol registered" aria-hidden="true"></span>Registered position
      <span class="mini-map-legend-separator" aria-hidden="true">·</span>
      <span class="mini-map-symbol reported" aria-hidden="true"></span>Reported position
    </p>
  {/if}
  <p class="mini-map-caption">{caption}</p>
  {#if enlarged}
    <MapLightbox {geometry} label={viewer?.title ?? label} subtitle={viewer?.subtitle} note={viewer?.note} registered={registeredPoint} onclose={closeEnlarged} />
  {/if}
{/if}

<style>
  /*
   * The height follows the width through container units, not aspect-ratio: with aspect-ratio
   * the minimum height turns into a minimum width (498 px) that a grid column must make room for.
   */
  .mini-map-frame { container-type: inline-size; width: 100%; }
  .mini-map {
    position: relative;
    display: block;
    width: 100%;
    /* 16:9 of the frame's width, within a minimum and a maximum height; never stretched to fill the page. */
    height: clamp(var(--report-map-min-height), 56.25cqw, var(--report-map-max-height));
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

  .mini-map-corner {
    position: absolute; top: var(--space-2); right: var(--space-2);
    display: inline-flex; align-items: center; gap: var(--space-1);
    min-width: var(--target-size-min); min-height: var(--target-size-min); padding: 0 var(--space-3);
    border: var(--border-default); border-radius: var(--radius-control); background: var(--color-background-raised);
    color: var(--color-text-primary); font-size: var(--font-size-body); font-weight: var(--font-weight-semibold); cursor: pointer;
  }
  .mini-map-corner:hover { background: var(--color-map-control-hover); }
  .mini-map-corner svg { width: var(--icon-size-default); height: var(--icon-size-default); stroke: currentColor; stroke-width: var(--icon-stroke-width); stroke-linecap: round; stroke-linejoin: round; }

  .mini-map-empty {
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: var(--font-size-body-small);
  }

  .mini-map-canvas, .mini-map-image { position: absolute; inset: 0; width: 100%; height: 100%; }
  .mini-map-image { object-fit: cover; }

  .mini-map-attribution {
    position: absolute; right: var(--space-2); bottom: var(--space-2);
    padding: var(--space-1) var(--space-2); border-radius: var(--radius-small);
    background: var(--color-background-raised); color: var(--color-text-secondary);
    font-size: var(--font-size-caption); pointer-events: none;
  }

  .mini-map-caption, .mini-map-legend { margin: var(--space-2) 0 0; color: var(--color-text-secondary); font-size: var(--font-size-body-small); }
  .mini-map-legend { display: flex; flex-wrap: wrap; align-items: center; gap: var(--space-1) var(--space-2); color: var(--color-text-primary); }
  .mini-map-legend-separator { color: var(--color-text-secondary); }
  /* The same symbols as on the map: a hollow ring for registered, a filled dot with a white edge for reported. */
  .mini-map-symbol {
    flex: none; display: inline-block; box-sizing: border-box;
    width: calc(2 * var(--report-map-marker-radius)); height: calc(2 * var(--report-map-marker-radius));
    border-radius: var(--radius-round);
  }
  .mini-map-symbol.registered { border: calc(1.5 * var(--report-map-marker-stroke)) solid var(--color-map-point); box-shadow: 0 0 0 var(--report-map-marker-stroke) var(--color-drawing-casing); }
  .mini-map-symbol.reported { background: var(--color-map-point); box-shadow: 0 0 0 var(--report-map-marker-stroke) var(--color-drawing-casing), 0 0 0 calc(var(--report-map-marker-stroke) + 1px) var(--color-border-strong); }
</style>
