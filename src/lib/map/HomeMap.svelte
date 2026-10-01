<script lang="ts">
  import { tick, type Snippet } from 'svelte';
  import type { SettingsSection } from '../settings/settings';
  import MenuDrawer from './MenuDrawer.svelte';
  import GeometryIcon from './GeometryIcon.svelte';
  import MapCanvas from './MapCanvas.svelte';
  import MapToolbar from './MapToolbar.svelte';
  import TutorialDialog from './TutorialDialog.svelte';
  import RightMapControls from './RightMapControls.svelte';
  import type { GeolocationState } from './createGeolocationController';
  import type { HoldOrigin } from './createMapHoldController';
  import RadialMenu from '../radial-menu/RadialMenu.svelte';
  import { idleDrawingState, type DrawingState } from '../reporting/createDrawingController';
  import { obstacleGeometryChoices, type Obstacle } from '../reporting/obstacle';
  import { obstacleMenuInnerRadius } from './createMapDrawingInteraction';

  let { oncomplete, onreportstart, onresumedetails, onselectiondelete, debugContent, menuOpen = $bindable(false), visible = true, showHelp = false, onfaq, onnotifications, onreports, onsettings,
    opacity = $bindable(0), isGrayscale = $bindable(false),
    geolocationState = $bindable<GeolocationState>('unavailable'), locationMessage = $bindable(''),
    accuracy = $bindable<number | null>(null),
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
  } = $props();
  let mapWrapper: HTMLElement;

  let isLayerFadeOpen = $state(false);
  let errorReportMode = $state(false);
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
  <RightMapControls
    bind:opacity
    bind:open={isLayerFadeOpen}
    bind:grayscale={isGrayscale}
    bind:errorReportMode
    errorReportDisabled={drawing.status !== 'idle'}
    {geolocationState}
    ongeolocationclick={() => mapCanvas?.toggleGeolocation()}
  />
  <MapCanvas
    {visible}
    bind:this={mapCanvas}
    {opacity}
    grayscale={isGrayscale}
    holdMode={errorReportMode ? 'error-report' : 'obstacle'}
    onmapclick={handleMapClick}
    ongeolocationstatechange={handleGeolocationStateChange}
    onaccuracychange={(value) => { accuracy = value; }}
    onholdchange={(origin) => { holdOrigin = origin; holdPointer = null; }}
    onholdmove={(x, y) => { holdPointer = { x, y }; }}
    ondrawingchange={handleDrawingChange}
    onobstacleregistered={oncomplete}
  />
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
  .hold-menu {
    position: absolute;
    z-index: var(--layer-popover);
    left: var(--hold-x);
    top: var(--hold-y);
    transform: translate(-50%, -50%);
    pointer-events: none;
  }

</style>
