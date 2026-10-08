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
  import { obstacleGeometryChoices, type GeographicVertex, type Obstacle } from '../reporting/obstacle';
  import { obstacleMenuInnerRadius, obstacleMenuOuterRadius } from './createMapDrawingInteraction';
  import { loadRegisteredObstacles, type RegisteredObstacle, type ScreenPoint } from '../obstacles/registeredObstacles';

  let { oncomplete, onreportstart, onresumedetails, onselectiondelete, debugContent, menuOpen = $bindable(false), visible = true, showHelp = false, onfaq, onnotifications, onreports, onsettings,
    opacity = $bindable(0), isGrayscale = $bindable(false),
    geolocationState = $bindable<GeolocationState>('unavailable'), locationMessage = $bindable(''),
    accuracy = $bindable<number | null>(null),
    selectedObstacle = $bindable<RegisteredObstacle | null>(null),
  }: {
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
    if (!errorMatch) return;
    selectedObstacle = errorMatch;
    console.log('Selected obstacle for error report:', errorMatch);
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
    mapWrapper.querySelector<HTMLElement>('.error-report-circle')?.focus({ preventScroll: true });
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
  {#if errorReportMode && errorCircle && !holdOrigin}
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
    ongeolocationclick={() => mapCanvas?.toggleGeolocation()}
  />
  <MapCanvas
    {visible}
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
    onholdchange={(origin) => { holdOrigin = origin; holdPointer = null; }}
    onholdmove={(x, y) => { holdPointer = { x, y }; }}
    ondrawingchange={handleDrawingChange}
    onobstacleregistered={oncomplete}
  />
  <div class="map-center-crosshair" aria-hidden="true">
    <svg viewBox="0 0 24 24">
      <g class="halo">
        <path d="M12 1v8M12 15v8M1 12h8M15 12h8" />
        <circle cx="12" cy="12" r="2" fill="var(--palette-neutral-0)" stroke="none" />
      </g>
      <g class="mark">
        <path d="M12 1v8M12 15v8M1 12h8M15 12h8" />
        <circle cx="12" cy="12" r="1.6" fill="var(--palette-black)" stroke="none" />
      </g>
    </svg>
  </div>
  <MapToolbar
    {menuOpen}
    {showHelp}
    {helpOpen}
    onhelp={() => { isLayerFadeOpen = false; helpOpen = true; }}
    onmenu={() => { isLayerFadeOpen = false; menuOpen = true; }}
    {drawing}
    onsearchselect={(suggestion) => mapCanvas?.flyToLocation(suggestion)}
    onundo={() => mapCanvas?.undoDrawing()}
    ondelete={deleteSelection}
    oncomplete={() => mapCanvas?.completeDrawing()}
    {onresumedetails}
    onreports={() => { isLayerFadeOpen = false; onreports(); }}
  />

  {#if errorReportMode && positionPick && selectedObstacle}
    <PositionCorrectionToolbar
      bind:height={positionPanelHeight}
      newPosition={pickedPosition}
      registered={selectedObstacle}
      move={pickedPosition ? moveParts(selectedObstacle, pickedPosition) : null}
      canConfirm={pickedDistanceM >= minimumMoveM}
      editing={positionPick.editing}
      oncancel={() => finishPositionPick({ kind: 'cancel' })}
      onconfirm={() => { if (pickedPosition) finishPositionPick({ kind: 'set', position: pickedPosition }); }}
      onunknown={() => finishPositionPick({ kind: 'unknown' })}
      onremove={() => finishPositionPick({ kind: 'remove' })}
    />
  {:else if errorReportMode}
    <ErrorReportToolbar placed={!!errorCircle} match={errorMatch} oncancel={endErrorReport} onselect={selectErrorObstacle} />
  {/if}

  {#if selectedObstacle}
    {#key selectedObstacle.id}
      <ErrorReportPanel bind:this={errorPanel} obstacle={selectedObstacle} hidden={!!positionPick}
        ondismiss={() => { selectedObstacle = null; }} onfinish={finishErrorReport} onpickposition={pickPosition} />
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
  .map-center-crosshair .halo { stroke: var(--palette-neutral-0); stroke-width: calc(var(--icon-stroke-width) * 1.3); }
  .map-center-crosshair .mark { stroke: var(--palette-black); stroke-width: calc(var(--icon-stroke-width) * 0.8); }

</style>
