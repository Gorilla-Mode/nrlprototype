<script lang="ts">
  import type { GeolocationState } from '../map/createGeolocationController';
  let { section, opacity = $bindable(0), grayscale = $bindable(false), locationState, locationMessage, accuracy, onlocation }: {
    section: 'offline-maps' | 'location' | 'map-layers';
    opacity?: number;
    grayscale?: boolean;
    locationState: GeolocationState;
    locationMessage: string;
    accuracy: number | null;
    onlocation: () => void;
  } = $props();
  const locationLabels: Record<GeolocationState, string> = {
    unavailable: 'Location unavailable', idle: 'Find my location', locating: 'Stop locating',
    following: 'Stop location tracking', background: 'Resume following on map', error: 'Retry location',
  };
  const locationStatuses: Record<GeolocationState, string> = {
    unavailable: 'Unavailable', idle: 'Not tracking', locating: 'Finding your location',
    following: 'Following your location', background: 'Location active; map following paused', error: 'Location could not be obtained',
  };
</script>

{#if section === 'offline-maps'}
  <p class="settings-description">Map areas for use without a connection.</p>
  <section class="settings-card"><h2>Storage used</h2><p>Not available</p></section>
  <fieldset class="settings-card settings-fields" disabled aria-describedby="offline-unavailable">
    <legend class="sr-only">Download a new area</legend>
    <label>Download a new area<input type="text" placeholder="Area name" /></label>
    <button class="button" type="button">Save area</button>
  </fieldset>
  <p class="settings-notice" id="offline-unavailable">Offline map downloading and storage are not available in this prototype.</p>
{:else if section === 'location'}
  <p class="settings-description">Location access and the accuracy reported by your device.</p>
  <section class="settings-card">
    <h2>Browser and device permission</h2>
    <p>Location permission is controlled by your browser and device. Choosing Find my location may request access. The app cannot change this permission for you.</p>
  </section>
  <section class="settings-card">
    <h2>Location on the map</h2>
    <p role="status">{locationStatuses[locationState]}</p>
    {#if locationMessage}<p>{locationMessage}</p>{/if}
    <button class="button" type="button" disabled={locationState === 'unavailable'} onclick={onlocation}>{locationLabels[locationState]}</button>
    <p>This uses the same location control as the map. Following does not move the map while Settings is open.</p>
  </section>
  <section class="settings-card">
    <h2>Reported accuracy</h2>
    <p>{accuracy === null ? 'No location fix available.' : `Approximately ${Math.round(accuracy)} m at the last location fix.`}</p>
    <p>The app requests high accuracy. The browser and device determine the actual accuracy; GPS precision modes cannot be selected here.</p>
  </section>
{:else}
  <p class="settings-description">Change the current map view. Changes apply immediately and last for this session.</p>
  <fieldset class="settings-card settings-layer-options">
    <legend class="sr-only">Map layers</legend>
    <label class:settings-selected={opacity === 0}><input type="radio" name="basemap" checked={opacity === 0} onchange={() => { opacity = 0; }} /><span><strong>Topographic</strong><span>Street and terrain map.</span></span></label>
    <label class:settings-selected={opacity === 1}><input type="radio" name="basemap" checked={opacity === 1} onchange={() => { opacity = 1; }} /><span><strong>Aerial</strong><span>Satellite imagery.</span></span></label>
    <label class="settings-unavailable"><input type="radio" name="basemap" disabled /><span><strong>Hybrid</strong><span>A labels overlay is not available in this prototype.</span></span></label>
  </fieldset>
  <section class="settings-card settings-fields">
    <label for="settings-blend">Map / aerial blend: {Math.round(opacity * 100)}% aerial imagery</label>
    <input id="settings-blend" class="settings-range" type="range" min="0" max="1" step="0.01" bind:value={opacity} aria-valuetext={`${Math.round(opacity * 100)}% aerial imagery`} />
    <label class="settings-switch-row"><span><strong>Grayscale</strong><span>Show map imagery in grayscale.</span></span><input class="settings-switch" type="checkbox" role="switch" bind:checked={grayscale} /></label>
  </section>
{/if}
