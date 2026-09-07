<script lang="ts">
  import MapButton from './MapButton.svelte';
  import type { GeolocationState } from './createGeolocationController';

  interface Props {
    state: GeolocationState;
    onclick: () => void;
  }

  let { state, onclick }: Props = $props();
  const labels: Record<GeolocationState, string> = {
    idle: 'Find my location',
    locating: 'Finding location. Stop tracking',
    following: 'Stop tracking my location',
    background: 'Recenter on my location',
    error: 'Retry finding my location',
    unavailable: 'Location unavailable',
  };
  let tracking = $derived(state === 'locating' || state === 'following' || state === 'background');
</script>

<MapButton
  class="geolocation-button"
  data-state={state}
  active={state === 'locating' || state === 'following'}
  disabled={state === 'unavailable'}
  aria-label={labels[state]}
  title={labels[state]}
  aria-busy={state === 'locating'}
  aria-pressed={tracking}
  {onclick}
>
  <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <circle cx="12" cy="12" r="5" />
    <path d="M12 3v4m0 10v4M3 12h4m10 0h4" />
  </svg>
</MapButton>
