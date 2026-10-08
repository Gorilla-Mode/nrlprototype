<script lang="ts">
  import { onMount, tick, type Snippet } from 'svelte';
  import type { SettingsSection } from '../settings/settings';
  import MenuDrawer from './MenuDrawer.svelte';
  import GeometryIcon from './GeometryIcon.svelte';
  import MapCanvas from './MapCanvas.svelte';
  import MapToolbar from './MapToolbar.svelte';
  import TutorialDialog from './TutorialDialog.svelte';
  import RightMapControls from './RightMapControls.svelte';
  import ErrorReportCircle from './ErrorReportCircle.svelte';
  import ErrorReportToolbar from './ErrorReportToolbar.svelte';
  import PositionCorrectionToolbar from './PositionCorrectionToolbar.svelte';
  import ErrorReportPanel from '../obstacles/ErrorReportPanel.svelte';
  import type { ErrorReport, PositionChoice } from '../obstacles/errorReport';
  import { distanceM, minimumMoveM, moveParts, type GeoPosition } from '../obstacles/position';
  import type { GeolocationState } from './createGeolocationController';
  import type { HoldOrigin } from './createMapHoldController';
  import RadialMenu from '../radial-menu/RadialMenu.svelte';
  import { idleDrawingState, type DrawingState } from '../reporting/createDrawingController';
  import { obstacleGeometryChoices, type GeographicVertex, type Obstacle, type ObstacleGeometryType } from '../reporting/obstacle';
  import { obstacleMenuInnerRadius, obstacleMenuOuterRadius } from './createMapDrawingInteraction';
  import { loadRegisteredObstacles, type RegisteredObstacle, type ScreenPoint } from '../obstacles/registeredObstacles';

  import type { PlacementEditingVariantId } from './placementEditing';
  import type { EditableVertexHandle } from './createVertexEditingInteraction';

  let { placementEditing = 'default', oncomplete, onreportstart, onresumedetails, onselectiondelete, debugContent, menuOpen = $bindable(false), visible = true, showHelp = false, onfaq, onnotifications, onreports, onsettings,
    opacity = $bindable(0), isGrayscale = $bindable(false),
    geolocationState = $bindable<GeolocationState>('unavailable'), locationMessage = $bindable(''),
    accuracy = $bindable<number | null>(null),
    selectedObstacle = $bindable<RegisteredObstacle | null>(null),
  }: {
    placementEditing?: PlacementEditingVariantId;
    oncomplete?: (obstacle: Obstacle, positionReady?: Promise<Obstacle['gps_position']>) => void;
    onreportstart?: () => void;
    debugContent?: Snippet;
    onresumedetails?: () => void;
    onselectiondelete?: () => void;
    menuOpen?: boolean;
    visible?: boolean;
    showHelp?: boolean;
    onfaq: () => void;
    onnotifications: () => void;
    onreports: () => void;
    onsettings: (section: SettingsSection) => void;
    opacity?: number;
    isGrayscale?: boolean;
    geolocationState?: GeolocationState;
    locationMessage?: string;
    accuracy?: number | null;
    /** The registered obstacle chosen for an error report; read by the report form. */
    selectedObstacle?: RegisteredObstacle | null;
  } = $props();
  let mapWrapper: HTMLElement;

  let isLayerFadeOpen = $state(false);
  let crosshairMode = $state(false);
  let crosshairSize = $state(0);
  let geometryType = $state<ObstacleGeometryType>('Point');
  let errorReportMode = $state(false);
  let registeredObstacles = $state.raw<RegisteredObstacle[]>([]);
  let errorCircle = $state<ScreenPoint | null>(null);
  let errorMatch = $state.raw<RegisteredObstacle | null>(null);
  let errorCirclePosition = $state.raw<GeographicVertex | null>(null);
  // Set while the report form is hidden and the circle picks the obstacle's correct position.
  let positionPick = $state<{ editing: boolean } | null>(null);
  let positionDragging = $state(false);
  let positionPanelHeight = $state(0);
  let errorPanel = $state<ErrorReportPanel>();
  let pickedPosition = $derived<GeoPosition | null>(
    positionPick && errorCirclePosition ? { lng: errorCirclePosition[0], lat: errorCirclePosition[1] } : null);
  let pickedDistanceM = $derived(selectedObstacle && pickedPosition ? distanceM(selectedObstacle, pickedPosition) : 0);
  let reportSent = $state(false);
  let reportSentTimer: ReturnType<typeof setTimeout> | undefined;
  onMount(() => {
    let cancelled = false;
    void loadRegisteredObstacles().then((obstacles) => { if (!cancelled) registeredObstacles = obstacles; });
    return () => { cancelled = true; clearTimeout(reportSentTimer); };
  });

  function endErrorReport() {
    errorReportMode = false;
    mapCanvas?.focus();
  }

  // The mode stays active behind the form, so Cancel returns to the placed circle.
  function selectErrorObstacle() {
    const target = mapCanvas?.sampleErrorReportTarget();
    if (!target?.match) return;
    selectedObstacle = target.match;
  }

  // The toggle stays reachable while picking; turning the mode off abandons the whole report.
  $effect(() => {
    if (errorReportMode) return;
    positionPick = null;
    selectedObstacle = null;
  });

  async function pickPosition({ selected, position }: { selected: boolean; position: GeoPosition | null }) {
    if (!selectedObstacle) return;
    const origin: GeographicVertex = [selectedObstacle.lng, selectedObstacle.lat];
    positionPick = { editing: selected };
    mapCanvas?.startPositionCorrection(origin, position ? [position.lng, position.lat] : origin);
    await tick();
    focusPositionInput();
  }

  function focusPositionInput() {
    if (crosshairMode) mapCanvas?.focus();
    else mapWrapper.querySelector<HTMLElement>('.error-report-circle')?.focus({ preventScroll: true });
  }

  async function toggleCrosshairMode() {
    crosshairMode = !crosshairMode;
    await tick();
    if (positionPick) focusPositionInput();
  }

  function confirmPositionPick() {
    const position = mapCanvas?.sampleErrorReportTarget()?.position;
    if (!position || !selectedObstacle) return;
    const candidate = { lng: position[0], lat: position[1] };
    if (distanceM(selectedObstacle, candidate) >= minimumMoveM) finishPositionPick({ kind: 'set', position: candidate });
  }

  async function dismissErrorForm() {
    selectedObstacle = null;
    await tick();
    mapWrapper.querySelector<HTMLElement>('[data-report-error]')?.focus({ preventScroll: true });
  }

  function finishPositionPick(choice: PositionChoice) {
    mapCanvas?.endPositionCorrection();
    positionPick = null;
    errorPanel?.applyPosition(choice);
  }

  function finishErrorReport(report: ErrorReport) {
    // No backend yet: the console is the only consumer.
    console.log('Error report:', report);
    selectedObstacle = null;
    endErrorReport();
    reportSent = true;
    clearTimeout(reportSentTimer);
    reportSentTimer = setTimeout(() => { reportSent = false; }, 4000);
  }
  let helpOpen = $state(false);
  $effect(() => {
    if (!visible || !showHelp) helpOpen = false;
  });

  async function dismissHelp() {
    helpOpen = false;
    await tick();
    if (visible && showHelp) mapWrapper.querySelector<HTMLButtonElement>('.map-help')?.focus({ preventScroll: true });
  }
  let mapCanvas: MapCanvas;
  let vertexHandles = $state.raw<readonly EditableVertexHandle[]>([]);
  let holdOrigin = $state<HoldOrigin | null>(null);
  let holdPointer = $state<{ x: number; y: number } | null>(null);
  export function toggleGeolocation() { mapCanvas?.toggleGeolocation(); }
  export function clearSelection() { mapCanvas?.deleteDrawing(); }
  export function focusDetails() {
    const resume = mapWrapper.querySelector<HTMLButtonElement>('[data-resume-details]');
    if (resume) resume.focus({ preventScroll: true });
    else mapCanvas?.focus();
  }

  async function deleteSelection() {
    mapCanvas?.deleteDrawing();
    onselectiondelete?.();
    await tick();
    mapCanvas?.focus();
  }

  let drawing = $state.raw<DrawingState>(idleDrawingState);
  function handleDrawingChange(state: DrawingState) {
    if (drawing.status === 'idle' && state.status === 'drawing') onreportstart?.();
    drawing = state;
  }

  function movePersistentCenter(event: KeyboardEvent) {
    if (!holdOrigin) return;
    if (event.key === 'Escape') { event.preventDefault(); mapCanvas?.cancelPlacement(); return; }
    const step = event.shiftKey ? 64 : 16;
    const offsets: Record<string, [number, number]> = {
      ArrowUp: [0, -step], ArrowDown: [0, step], ArrowLeft: [-step, 0], ArrowRight: [step, 0],
    };
    const offset = offsets[event.key];
    if (!offset) return;
    event.preventDefault();
    mapCanvas?.movePersistentCenter(holdOrigin.x + offset[0], holdOrigin.y + offset[1]);
  }

  function handleHoldChange(origin: HoldOrigin | null) {
    holdOrigin = origin;
    holdPointer = null;
  }

  function handleMapClick() {
    isLayerFadeOpen = false;
    locationMessage = '';
  }

  function handleGeolocationStateChange(state: GeolocationState, message: string) {
    geolocationState = state;
    locationMessage = message;
  }
</script>

{#snippet pointIcon()}<GeometryIcon type="Point" />{/snippet}

{#snippet lineIcon()}<GeometryIcon type="LineString" />{/snippet}

{#snippet polygonIcon()}<GeometryIcon type="Polygon" />{/snippet}

{#snippet errorReportIcon()}
  <path d="M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0" />
  <path d="M12 6.5v4M12 13.5h.01" />
{/snippet}

<main bind:this={mapWrapper} class="map-wrapper" aria-label="Home map">
  <!-- Before the controls: same overlay layer, so map controls stay on top of the circle. -->
  {#if errorReportMode && !crosshairMode && errorCircle && !holdOrigin}
    <ErrorReportCircle
      center={errorCircle}
      innerRadius={obstacleMenuInnerRadius}
      outerRadius={obstacleMenuOuterRadius}
      icon={errorReportIcon}
      handle={positionPick ? { dragging: positionDragging } : null}
      onmove={(x, y) => mapCanvas?.moveErrorCircle(x, y)}
    />
  {/if}
  <RightMapControls
    bind:opacity
    bind:open={isLayerFadeOpen}
    bind:grayscale={isGrayscale}
    bind:errorReportMode
    errorReportDisabled={drawing.status !== 'idle'}
    zoomControls={!!positionPick}
    onzoomin={() => mapCanvas?.zoomIn()}
    onzoomout={() => mapCanvas?.zoomOut()}
    {geolocationState}
    {crosshairMode}
    oncrosshairtoggle={toggleCrosshairMode}
    ongeolocationclick={() => mapCanvas?.toggleGeolocation()}
  />
  <MapCanvas
    visible={visible && !menuOpen && !helpOpen && (!selectedObstacle || !!positionPick)}
    {placementEditing}
    onvertexhandleschange={(handles) => { vertexHandles = handles; }}
    {crosshairMode}
    {crosshairSize}
    bind:this={mapCanvas}
    {opacity}
    grayscale={isGrayscale}
    holdMode={errorReportMode ? 'error-report' : 'obstacle'}
    {registeredObstacles}
    bottomInset={positionPick ? positionPanelHeight : 0}
    onerrorcirclechange={(center, match, position) => { errorCircle = center; errorMatch = match; errorCirclePosition = position; }}
    onpositiondragchange={(dragging) => { positionDragging = dragging; }}
    onmapclick={handleMapClick}
    ongeolocationstatechange={handleGeolocationStateChange}
    onaccuracychange={(value) => { accuracy = value; }}
    onholdchange={handleHoldChange}
    onholdmove={(x, y) => { holdPointer = { x, y }; }}
    ondrawingchange={handleDrawingChange}
    onobstacleregistered={oncomplete}
  />
  {#each vertexHandles as handle (handle.index)}
    <button type="button" class="vertex-handle" style:--hold-x={`${handle.x}px`} style:--hold-y={`${handle.y}px`}
      aria-label={`Move point ${handle.index + 1}. Use arrow keys; Shift moves faster; Escape cancels`}
      onkeydown={(event) => mapCanvas?.vertexKeyDown(handle.index, event)}
      onkeyup={(event) => mapCanvas?.vertexKeyUp(event)} onblur={() => mapCanvas?.finishKeyboardMove()}>
      <span aria-hidden="true">{handle.index + 1}</span>
    </button>
  {/each}
  {#if crosshairMode}
  <div class="map-center-crosshair" bind:clientWidth={crosshairSize} aria-hidden="true">
    <svg viewBox="0 0 24 24">
      <g class="halo">
        <path d="M12 1V23M1 12H23" />
      </g>
      <g class="mark">
        <path d="M12 1V23M1 12H23" />
      </g>
    </svg>
  </div>
  {/if}
  <MapToolbar
    {menuOpen}
    showHelp={showHelp && !positionPick}
    {helpOpen}
    onhelp={() => { isLayerFadeOpen = false; helpOpen = true; }}
    onmenu={() => { isLayerFadeOpen = false; menuOpen = true; }}
    {drawing}
    {placementEditing}
    {crosshairMode}
    bind:geometryType
    showSelectionControls={!errorReportMode}
    selectionControlsCovered={isLayerFadeOpen}
    onstart={(type) => mapCanvas?.startAtCrosshair(type)}
    onaddpoint={() => mapCanvas?.appendAtCrosshair()}
    onsearchselect={(suggestion) => mapCanvas?.flyToLocation(suggestion)}
    onundo={() => mapCanvas?.undoDrawing()}
    ondelete={deleteSelection}
    oncomplete={() => mapCanvas?.completeDrawing()}
    {onresumedetails}
    onreports={() => { isLayerFadeOpen = false; onreports(); }}
  />

  <div class:covered={isLayerFadeOpen} inert={isLayerFadeOpen}>
  {#if errorReportMode && positionPick && selectedObstacle}
    <PositionCorrectionToolbar
      bind:height={positionPanelHeight}
      {crosshairMode}
      newPosition={pickedPosition}
      registered={selectedObstacle}
      move={pickedPosition ? moveParts(selectedObstacle, pickedPosition) : null}
      canConfirm={pickedDistanceM >= minimumMoveM}
      editing={positionPick.editing}
      oncancel={() => finishPositionPick({ kind: 'cancel' })}
      onconfirm={confirmPositionPick}
      onunknown={() => finishPositionPick({ kind: 'unknown' })}
      onremove={() => finishPositionPick({ kind: 'remove' })}
    />
  {:else if errorReportMode}
    <ErrorReportToolbar {crosshairMode} helpVisible={showHelp} placed={!!errorCircle} match={errorMatch} oncancel={endErrorReport} onselect={selectErrorObstacle} />
  {/if}

  </div>

  {#if selectedObstacle}
    {#key selectedObstacle.id}
      <ErrorReportPanel bind:this={errorPanel} obstacle={selectedObstacle} hidden={!!positionPick}
        ondismiss={dismissErrorForm} onfinish={finishErrorReport} onpickposition={pickPosition} />
    {/key}
  {/if}

  {#if helpOpen && visible && showHelp}
    <TutorialDialog ondismiss={dismissHelp} />
  {/if}

  <MenuDrawer bind:open={menuOpen} {onfaq} {onnotifications} {onsettings} {debugContent}
    ondismiss={() => mapWrapper.querySelector<HTMLButtonElement>('[aria-label="Menu"]')?.focus({ preventScroll: true })} />

  {#if holdOrigin}
    {@const geometryIcons = { point: pointIcon, line: lineIcon, polygon: polygonIcon }}
    <div class="hold-menu" style:--hold-x={`${holdOrigin.x}px`} style:--hold-y={`${holdOrigin.y}px`}>
      {#if errorReportMode}
        <RadialMenu
          pointer={holdPointer}
          innerRadius={obstacleMenuInnerRadius}
          outerRadius={obstacleMenuOuterRadius}
          label="Choose obstacle to report"
          items={[{ id: 'error-report', label: 'Report an error', color: 'var(--color-map-error-report)', icon: errorReportIcon }]}
        />
      {:else}
        <RadialMenu
          pointer={holdPointer}
          innerRadius={obstacleMenuInnerRadius}
          label="Choose obstacle geometry"
          items={obstacleGeometryChoices.map((choice) => ({
            id: choice.id, label: choice.label, color: `var(${choice.colorToken})`,
            icon: geometryIcons[choice.id],
          }))}
        />
      {/if}
    </div>
  {/if}

  {#if holdOrigin && !errorReportMode && placementEditing !== 'default'}
    {#if placementEditing === 'persistent-donut'}
      <button type="button" class="persistent-center"
        style:--hold-x={`${holdOrigin.x}px`} style:--hold-y={`${holdOrigin.y}px`}
        aria-label="Donut center. Arrow keys move placement; Shift moves faster; Enter or Escape cancels"
        onkeydown={movePersistentCenter} onclick={() => mapCanvas?.cancelPlacement()}>×</button>
    {/if}
    <section class="placement-guidance" aria-label="Placement guidance">
      {#if placementEditing === 'persistent-donut'}
        <p>Drag the center to move placement. Tap the center to cancel, or choose a geometry.</p>
        <div class="placement-choices">
          {#each obstacleGeometryChoices as choice (choice.id)}
            <button type="button" class="button" onclick={() => mapCanvas?.selectPersistentGeometry(choice.type)}>{choice.label}</button>
          {/each}
          <button type="button" class="button" onclick={() => mapCanvas?.cancelPlacement()}>Cancel</button>
        </div>
      {:else if placementEditing === 'two-finger'}
        <p>Keep holding to choose geometry. Add a second finger to pan beneath the donut. The crosshair picker is also available.</p>
      {:else}
        <p>Drag out to choose geometry. Hold placed points to edit them; Complete confirms placement.</p>
      {/if}
    </section>
  {/if}

  <div class="report-sent" role="status">
    {#if reportSent}<p>Report sent</p>{/if}
  </div>

  <div class="location-status" role="status">
    {#if locationMessage}
      <p>{locationMessage}</p>
    {/if}
  </div>

</main>

<style>
  .vertex-handle, .persistent-center {
    position: absolute;
    z-index: var(--layer-map-overlay);
    left: var(--hold-x);
    top: var(--hold-y);
    transform: translate(-50%, -50%);
    width: var(--target-size-min);
    height: var(--target-size-min);
    padding: 0;
    border: var(--border-strong);
    border-radius: var(--radius-round);
    background: var(--color-background-raised);
    color: var(--color-text-primary);
    font-size: var(--font-size-body-small);
    box-shadow: var(--shadow-control);
    pointer-events: none;
  }
  .vertex-handle { background: transparent; border-color: transparent; box-shadow: none; }
  .vertex-handle span { visibility: hidden; }
  .vertex-handle:focus-visible { background: var(--color-background-raised); border: var(--border-strong); }
  .vertex-handle:focus-visible span { visibility: visible; }
  .persistent-center { z-index: var(--layer-popover); }
  .placement-guidance {
    position: absolute;
    z-index: var(--layer-map-overlay);
    inset-inline: var(--map-control-inset-left) var(--map-control-inset-right);
    bottom: var(--map-bottom-toolbar-inset);
    margin-inline: auto;
    width: fit-content;
    max-width: calc(100% - var(--map-control-inset-left) - var(--map-control-inset-right));
    padding: var(--space-3);
    border: var(--border-strong);
    border-radius: var(--radius-card);
    background: var(--color-background-raised);
    color: var(--color-text-primary);
    box-shadow: var(--shadow-control);
    font-size: var(--font-size-body-small);
  }
  .placement-guidance p { margin: 0; line-height: var(--line-height-body); }
  .placement-choices { display: flex; flex-wrap: wrap; gap: var(--space-2); margin-top: var(--space-2); }
  .covered { visibility: hidden; }

  .map-wrapper {
    position: relative;
    width: 100%;
    height: 100%;
    height: 100dvh;
    overflow: hidden;
    isolation: isolate;
  }

  .location-status {
    position: absolute;
    z-index: var(--layer-map-overlay);
    top: calc(var(--map-control-inset-top) + var(--map-control-size) + var(--space-3));
    right: var(--map-control-inset-right);
    left: var(--map-control-inset-left);
    display: flex;
    justify-content: flex-end;
    pointer-events: none;
  }

  .location-status p {
    width: fit-content;
    max-width: var(--map-status-max);
    margin: 0;
    padding: var(--space-3) var(--space-4);
    border: var(--border-default);
    border-radius: var(--radius-card);
    background: var(--color-background-raised);
    box-shadow: var(--shadow-control);
    color: var(--color-text-secondary);
    font-size: var(--font-size-body-small);
    line-height: var(--line-height-body);
  }
  /* Placed like App's .details-error, with success colours. */
  .report-sent {
    position: absolute;
    z-index: var(--layer-toast);
    top: calc(var(--map-control-inset-top) + var(--control-height-large));
    left: var(--map-control-inset-left);
    right: var(--map-control-inset-right);
    pointer-events: none;
  }
  .report-sent p {
    margin: 0;
    padding: var(--space-3);
    border-radius: var(--radius-card);
    background: var(--color-status-success-surface);
    color: var(--color-status-success);
    font-weight: var(--font-weight-semibold);
  }
  .hold-menu {
    position: absolute;
    z-index: var(--layer-popover);
    left: var(--hold-x);
    top: var(--hold-y);
    transform: translate(-50%, -50%);
    pointer-events: none;
  }

  .map-center-crosshair {
    position: absolute;
    z-index: var(--layer-map-overlay);
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    width: var(--map-crosshair-size);
    height: var(--map-crosshair-size);
    pointer-events: none;
  }
  .map-center-crosshair svg { display: block; width: 100%; height: 100%; fill: none; stroke-linecap: round; }
  .map-center-crosshair .halo { stroke: var(--color-map-crosshair-halo); stroke-width: var(--map-crosshair-halo-stroke-width); }
  .map-center-crosshair .mark { stroke: var(--color-map-crosshair-mark); stroke-width: var(--map-crosshair-mark-stroke-width); }

</style>
