<script lang="ts">
  import { onMount, untrack } from 'svelte';
  import { Map as MapLibreMap, Marker, NavigationControl, type GeoJSONSource, type MapMouseEvent } from 'maplibre-gl';
  import type { Feature, FeatureCollection } from 'geojson';
  import Lightbox from './Lightbox.svelte';
  import Dialog from '../components/Dialog.svelte';
  import DialogActions from '../components/DialogActions.svelte';
  import { createLocationEditorStyle, emptyFeatures, LOCATION_CONNECTOR_SOURCE_ID, LOCATION_EDIT_SOURCE_ID, mapDefaults } from './mapConfig';
  import { previewCamera, readPreviewVisuals } from './previewMap';
  import {
    applyCoordinate, convertVertices, formatCoordinate, locationGeometry, locationPreview, locationTypes, locationVertices,
    missingVerticesMessage, needsPointConfirmation, type CoordinateAxis, type LocationType, type Vertex,
  } from '../reports/locationEdit';
  import type { ReportGeometry } from '../reports/reportGeometry';

  interface Props {
    /** The report's location when the editor opens; Reset returns to it. */
    geometry: ReportGeometry;
    /** "Use this location": the only way a change reaches the report. */
    onuse: (geometry: ReportGeometry) => void;
    /** Cancel, X, Escape and the backdrop discard every change. */
    oncancel: () => void;
  }

  let { geometry, onuse, oncancel }: Props = $props();

  const registered = untrack(() => structuredClone(geometry));
  const registeredType = registered.type;
  const registeredVertices = locationVertices(registered);

  let type = $state<LocationType>(registeredType);
  let vertices = $state.raw<Vertex[]>(registeredVertices);
  let selected = $state<number | null>(null);
  /** A change to Point that drops vertices, waiting for the user to confirm it. */
  let pendingType = $state<LocationType | null>(null);
  // Coordinate fields keyed "index-axis": the text being typed, and fields that cannot be used.
  let focusedField = $state<string | null>(null);
  let fieldText = $state<Record<string, string>>({});
  let fieldErrors = $state<Record<string, string>>({});

  let mapHost: HTMLDivElement;
  let map = $state.raw<MapLibreMap | null>(null);
  let loaded = $state(false);
  let handles: Marker[] = [];
  let registeredLabel: Marker | null = null;

  let changed = $derived(type !== registeredType || JSON.stringify(vertices) !== JSON.stringify(registeredVertices));
  // About a centimetre; panning back by hand rarely lands exactly on the registered point.
  let pointMoved = $derived(type === 'Point' && !!vertices[0] &&
    Math.hypot(vertices[0][0] - registeredVertices[0][0], vertices[0][1] - registeredVertices[0][1]) > 1e-7);
  let missing = $derived(missingVerticesMessage(type, vertices.length));
  let hasErrors = $derived(Object.keys(fieldErrors).length > 0);
  let helper = $derived(missing ?? (hasErrors ? 'Correct the coordinate marked in red.' : null));
  let typeLabel = $derived(locationTypes.find((choice) => choice.type === type)!.label);

  const fieldKey = (index: number, axis: CoordinateAxis) => `${index}-${axis}`;
  const coordinate = (vertex: Vertex, axis: CoordinateAxis) => formatCoordinate(axis === 'lat' ? vertex[1] : vertex[0]);

  function resetFields() {
    focusedField = null;
    fieldText = {};
    fieldErrors = {};
  }

  function centerOnPoint() {
    if (type === 'Point' && vertices[0]) map?.jumpTo({ center: vertices[0] });
  }

  function setVertex(index: number, vertex: Vertex) {
    vertices = vertices.map((current, at) => (at === index ? vertex : current));
    centerOnPoint();
  }

  function applyType(next: LocationType) {
    const center = map?.getCenter();
    let kept = convertVertices(vertices, next);
    if (next === 'Point' && kept.length === 0 && center) kept = [[center.lng, center.lat]];
    type = next;
    vertices = kept;
    selected = null;
    pendingType = null;
    resetFields();
    centerOnPoint();
  }

  function chooseType(next: LocationType) {
    if (next === type) return;
    if (needsPointConfirmation(next, vertices.length)) pendingType = next;
    else applyType(next);
  }

  function undoLastPoint() {
    if (vertices.length === 0) return;
    vertices = vertices.slice(0, -1);
    if (selected !== null && selected >= vertices.length) selected = null;
    resetFields();
  }

  function deletePoint(index: number) {
    vertices = vertices.filter((_, at) => at !== index);
    selected = null;
    resetFields();
  }

  function reset() {
    type = registeredType;
    vertices = registeredVertices;
    selected = null;
    resetFields();
    centerOnPoint();
  }

  function use() {
    const next = locationGeometry(type, vertices);
    if (next && !hasErrors) onuse(next);
  }

  // Typing applies every usable value at once; a value that cannot be used is reported when
  // the field is left, so half-typed numbers do not flash an error.
  function typeCoordinate(index: number, axis: CoordinateAxis, text: string, final: boolean) {
    const key = fieldKey(index, axis);
    fieldText = { ...fieldText, [key]: text };
    const result = applyCoordinate(vertices[index], axis, text);
    if ('vertex' in result) {
      const { [key]: _resolved, ...rest } = fieldErrors;
      fieldErrors = rest;
      setVertex(index, result.vertex);
    } else if (final) {
      fieldErrors = { ...fieldErrors, [key]: result.error };
    }
  }

  function fieldValue(index: number, axis: CoordinateAxis): string {
    const key = fieldKey(index, axis);
    return (focusedField === key || key in fieldErrors) && key in fieldText ? fieldText[key] : coordinate(vertices[index], axis);
  }

  function focusField(index: number, axis: CoordinateAxis) {
    const key = fieldKey(index, axis);
    focusedField = key;
    if (!(key in fieldErrors)) fieldText = { ...fieldText, [key]: coordinate(vertices[index], axis) };
  }

  // Point: the position under the fixed pin follows the map.
  function followPin() {
    if (type !== 'Point' || !map) return;
    const { lng, lat } = map.getCenter();
    vertices = [[lng, lat]];
  }

  // Line and polygon: a click on the map itself, not on a handle, adds a point at the end.
  function addPoint(event: MapMouseEvent) {
    if (type === 'Point' || event.originalEvent.target !== map?.getCanvas()) return;
    vertices = [...vertices, [event.lngLat.lng, event.lngLat.lat]];
    selected = null;
    resetFields();
  }

  function createHandle(target: MapLibreMap, index: number): Marker {
    const element = document.createElement('button');
    element.type = 'button';
    element.className = 'location-handle';
    element.setAttribute('aria-label', `Point ${index + 1}. Drag to move; press Delete to remove.`);
    const dot = document.createElement('span');
    dot.className = 'location-handle-dot';
    const number = document.createElement('span');
    number.className = 'location-label location-handle-number';
    number.textContent = String(index + 1);
    element.append(dot, number);
    element.addEventListener('click', (event) => { event.stopPropagation(); selected = index; });
    element.addEventListener('keydown', (event) => {
      if (event.key !== 'Delete' && event.key !== 'Backspace') return;
      event.preventDefault();
      deletePoint(index);
    });
    const marker = new Marker({ element, draggable: true }).setLngLat(vertices[index]).addTo(target);
    marker.on('dragstart', () => { selected = index; });
    marker.on('drag', () => {
      const { lng, lat } = marker.getLngLat();
      vertices = vertices.map((current, at) => (at === index ? [lng, lat] : current));
    });
    return marker;
  }

  function featureOf(shape: ReportGeometry | null): Feature | FeatureCollection {
    return shape ? { type: 'Feature', properties: {}, geometry: shape } : emptyFeatures;
  }

  // Draws the edited location; handles are only rebuilt when points are added or removed.
  $effect(() => {
    const target = map;
    const currentType = type;
    const current = vertices;
    const active = selected;
    const moved = pointMoved;
    const altered = changed;
    if (!target || !loaded) return;
    target.getSource<GeoJSONSource>(LOCATION_EDIT_SOURCE_ID)?.setData(featureOf(locationPreview(currentType, current)));
    target.getSource<GeoJSONSource>(LOCATION_CONNECTOR_SOURCE_ID)?.setData(featureOf(moved
      ? { type: 'LineString', coordinates: [registeredVertices[0], current[0]] } : null));
    const count = currentType === 'Point' ? 0 : current.length;
    if (handles.length !== count) {
      for (const handle of handles) handle.remove();
      handles = Array.from({ length: count }, (_, index) => createHandle(target, index));
    }
    handles.forEach((handle, index) => {
      handle.setLngLat(current[index]);
      handle.getElement().classList.toggle('selected', index === active);
    });
    registeredLabel?.getElement().classList.toggle('hidden', !altered);
    target.getCanvas().setAttribute('aria-label', currentType === 'Point'
      ? 'Map. Pan the map to move the point under the pin.'
      : `Map. Click to add a point to the ${currentType === 'Polygon' ? 'polygon' : 'line'}; drag a point to move it.`);
  });

  // The Lightbox has already opened its dialog, so the map measures its real size.
  onMount(() => {
    const { width, height } = mapHost.getBoundingClientRect();
    const created = new MapLibreMap({
      container: mapHost,
      style: createLocationEditorStyle(registered, readPreviewVisuals(mapHost)),
      attributionControl: false,
      maxZoom: mapDefaults.maxZoom,
      dragRotate: false,
      pitchWithRotate: false,
      touchPitch: false,
      ...previewCamera(registered, width, height),
    });
    created.touchZoomRotate.disableRotation();
    created.keyboard.disableRotation();
    created.addControl(new NavigationControl({ showCompass: false }), 'top-right');
    created.on('move', followPin);
    created.on('click', addPoint);
    created.once('load', () => { loaded = true; });
    const label = document.createElement('span');
    label.className = 'location-label location-registered-label hidden';
    label.textContent = 'Registered';
    registeredLabel = new Marker({ element: label, anchor: 'top', offset: [0, 10] }).setLngLat(registeredVertices[0]).addTo(created);
    map = created;
    return () => {
      for (const handle of handles) handle.remove();
      handles = [];
      registeredLabel?.remove();
      created.remove();
      map = null;
    };
  });
</script>

{#snippet cancelAction()}
  <button type="button" class="ds-button dialog-action-secondary" data-variant="tertiary" data-color="brand1" onclick={oncancel}>Cancel</button>
{/snippet}
{#snippet useAction()}
  <button type="button" class="ds-button dialog-action-primary" data-variant="primary" disabled={!!helper} aria-describedby={helper ? 'location-helper' : undefined} onclick={use}>Use this location</button>
{/snippet}
{#snippet footer()}
  <div class="location-footer">
    <p id="location-helper" class="location-helper" aria-live="polite">{helper ?? ''}</p>
    <DialogActions primary={useAction} secondary={cancelAction} />
  </div>
{/snippet}

<Lightbox title="Edit location" closeLabel="Close without changing the location" onclose={oncancel} {footer}>
  <div class="location-editor">
    <div class="location-toolbar">
      <div class="reports-segmented" role="group" aria-label="Geometry type">
        {#each locationTypes as choice (choice.type)}
          <button type="button" class="reports-segment" aria-pressed={type === choice.type} onclick={() => chooseType(choice.type)}>{choice.label}</button>
        {/each}
      </div>
      <div class="location-tools">
        {#if type !== 'Point'}
          <button type="button" class="ds-button" data-variant="secondary" data-color="neutral" disabled={vertices.length === 0} onclick={undoLastPoint}>Undo last point</button>
          <button type="button" class="ds-button" data-variant="secondary" data-color="neutral" disabled={selected === null} onclick={() => { if (selected !== null) deletePoint(selected); }}>Delete point</button>
        {/if}
        <button type="button" class="card-cta-link location-text-button" disabled={!changed} onclick={reset}>Reset</button>
      </div>
    </div>

    <div class="location-map">
      <div class="location-map-canvas" bind:this={mapHost}></div>
      {#if type === 'Point'}
        <!-- Fixed in the centre: the map moves underneath it. -->
        <div class="location-pin" aria-hidden="true">
          <span class="location-pin-dot"></span>
          {#if pointMoved}<span class="location-label location-pin-label">New position</span>{/if}
        </div>
      {/if}
      <span class="location-attribution">© Kartverket</span>
    </div>

    <div class="location-coordinates" role="group" aria-label={`${typeLabel} coordinates`}>
      {#if vertices.length === 0}
        <p class="location-empty">No points yet.</p>
      {:else}
        <div class="location-row location-row-head" aria-hidden="true">
          {#if type !== 'Point'}<span></span>{/if}
          <span>Latitude</span>
          <span>Longitude</span>
        </div>
        {#each vertices as vertex, index (index)}
          {@const name = type === 'Point' ? 'Point' : `Point ${index + 1}`}
          <div class="location-row" class:location-row-numbered={type !== 'Point'} class:selected={selected === index}>
            {#if type !== 'Point'}<span class="location-row-number">{index + 1}</span>{/if}
            {#each (['lat', 'lng'] as const) as axis (axis)}
              {@const key = fieldKey(index, axis)}
              <input type="text" inputmode="decimal" autocomplete="off" spellcheck="false"
                aria-label={`${name} ${axis === 'lat' ? 'latitude' : 'longitude'}`}
                aria-invalid={key in fieldErrors} aria-describedby={key in fieldErrors ? `location-error-${key}` : undefined}
                value={fieldValue(index, axis)}
                onfocus={() => focusField(index, axis)}
                onblur={() => { focusedField = null; }}
                oninput={(event) => typeCoordinate(index, axis, event.currentTarget.value, false)}
                onchange={(event) => typeCoordinate(index, axis, event.currentTarget.value, true)} />
            {/each}
          </div>
          {#each (['lat', 'lng'] as const) as axis (axis)}
            {@const key = fieldKey(index, axis)}
            {#if key in fieldErrors}<p id={`location-error-${key}`} class="location-error status--error">{name} {axis === 'lat' ? 'latitude' : 'longitude'}: {fieldErrors[key]}</p>{/if}
          {/each}
        {/each}
      {/if}
    </div>
  </div>

  {#if pendingType}
    <Dialog title="Change to a point?" role="alertdialog" onclose={() => { pendingType = null; }}>
      <p>Only the first point will be kept.</p>
      {#snippet primary()}
        <button type="button" class="ds-button dialog-action-primary" data-variant="primary" onclick={() => { if (pendingType) applyType(pendingType); }}>Change to point</button>
      {/snippet}
      {#snippet secondary()}
        <button type="button" class="ds-button dialog-action-secondary" data-variant="tertiary" data-color="brand1" onclick={() => { pendingType = null; }}>Cancel</button>
      {/snippet}
    </Dialog>
  {/if}
</Lightbox>

<style>
  .location-editor { position: absolute; inset: 0; display: flex; flex-direction: column; }

  .location-toolbar {
    flex: none;
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: space-between;
    gap: var(--space-2) var(--space-4);
    padding: var(--space-3) var(--dialog-padding-inline);
    border-bottom: var(--border-default);
  }
  .location-tools { display: flex; flex-wrap: wrap; align-items: center; gap: var(--space-2); }
  .location-text-button { min-height: var(--target-size-min); padding: 0 var(--space-2); border: 0; background: none; cursor: pointer; }
  .location-text-button:disabled { color: var(--color-text-secondary); cursor: default; }

  .location-map { position: relative; flex: 1; min-height: 12rem; }
  .location-map-canvas { position: absolute; inset: 0; }
  .location-attribution {
    position: absolute;
    right: var(--space-2);
    bottom: var(--space-2);
    padding: var(--space-1) var(--space-2);
    border-radius: var(--radius-small);
    background: var(--color-background-raised);
    color: var(--color-text-secondary);
    font-size: var(--font-size-caption);
    pointer-events: none;
  }

  /* The pin is the point's own marker, drawn over the centre of the map. */
  .location-pin { position: absolute; left: 50%; top: 50%; pointer-events: none; }
  .location-pin-dot {
    position: absolute;
    left: calc(-1 * var(--map-drawing-vertex-radius) - var(--map-drawing-stroke-width));
    top: calc(-1 * var(--map-drawing-vertex-radius) - var(--map-drawing-stroke-width));
    width: calc(2 * var(--map-drawing-vertex-radius));
    height: calc(2 * var(--map-drawing-vertex-radius));
    border: var(--map-drawing-stroke-width) solid var(--color-drawing-casing);
    border-radius: var(--radius-round);
    background: var(--color-map-point);
  }
  .location-pin-label { position: absolute; left: calc(var(--map-drawing-vertex-radius) + var(--space-2)); top: calc(-1 * var(--space-3)); white-space: nowrap; }

  /* Labels and handle dots stay small so the map underneath stays readable. */
  :global(.location-label) {
    padding: 0 var(--space-1);
    border-radius: var(--radius-small);
    background: var(--color-background-raised);
    color: var(--color-text-primary);
    font-size: var(--font-size-caption);
    line-height: var(--line-height-tight);
    white-space: nowrap;
    pointer-events: none;
  }
  :global(.location-registered-label) { color: var(--color-text-secondary); }
  :global(.location-registered-label.hidden) { visibility: hidden; }
  /* A 44 px target around a small dot. */
  :global(.location-handle) {
    display: grid;
    place-items: center;
    width: var(--target-size-min);
    height: var(--target-size-min);
    padding: 0;
    border: 0;
    border-radius: var(--radius-round);
    background: transparent;
    cursor: grab;
  }
  :global(.location-handle-dot) {
    width: calc(2 * var(--map-drawing-vertex-radius));
    height: calc(2 * var(--map-drawing-vertex-radius));
    border: var(--map-drawing-stroke-width) solid var(--color-drawing-casing);
    border-radius: var(--radius-round);
    background: var(--color-map-line);
  }
  :global(.location-handle.selected .location-handle-dot) { outline: var(--border-width-emphasis) solid var(--color-action-secondary); outline-offset: var(--map-drawing-stroke-width); }
  :global(.location-handle:focus-visible) { outline: var(--border-width-emphasis) solid var(--color-action-secondary); }
  :global(.location-handle-number) { position: absolute; left: calc(50% + var(--map-drawing-vertex-radius) + var(--space-1)); top: 0; }

  .location-coordinates {
    flex: none;
    max-height: 30%;
    overflow-y: auto;
    padding: var(--space-3) var(--dialog-padding-inline);
    border-top: var(--border-default);
  }
  .location-row { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: var(--space-2); align-items: center; padding-block: var(--space-1); }
  .location-row-numbered, .location-coordinates:has(.location-row-numbered) .location-row-head { grid-template-columns: var(--space-6) repeat(2, minmax(0, 1fr)); }
  .location-row-head { color: var(--color-text-secondary); font-size: var(--font-size-caption); font-weight: var(--font-weight-semibold); }
  .location-row-number { color: var(--color-text-secondary); font-size: var(--font-size-body-small); text-align: center; }
  .location-row.selected .location-row-number { color: var(--color-action-secondary); font-weight: var(--font-weight-semibold); }
  .location-row input {
    width: 100%;
    min-width: 0;
    min-height: var(--target-size-min);
    padding: 0 var(--space-3);
    border: var(--border-strong);
    border-radius: var(--radius-control);
    background: var(--color-background-raised);
    color: var(--color-text-primary);
    font: inherit;
    font-variant-numeric: tabular-nums;
  }
  .location-row input[aria-invalid='true'] { border-color: var(--color-status-error); }
  .location-error { margin: 0 0 var(--space-1); font-size: var(--font-size-body-small); }
  .location-empty { margin: 0; color: var(--color-text-secondary); font-size: var(--font-size-body-small); }

  .location-footer { display: flex; flex-wrap: wrap; align-items: center; justify-content: flex-end; gap: var(--space-2) var(--space-4); }
  .location-helper { flex: 1 1 12rem; margin: 0; color: var(--color-text-secondary); font-size: var(--font-size-body-small); }
  .location-helper:empty { display: none; }
</style>
