<script lang="ts">
  import LayerFadeControl from './LayerFadeControl.svelte';
  import GrayscaleControl from './GrayscaleControl.svelte';
  import GeolocationControl from './GeolocationControl.svelte';
  import type { GeolocationState } from './createGeolocationController';

  interface Props {
    opacity?: number;
    open?: boolean;
    grayscale?: boolean;
    geolocationState: GeolocationState;
    ongeolocationclick: () => void;
  }

  let {
    opacity = $bindable(0),
    open = $bindable(false),
    grayscale = $bindable(false),
    geolocationState,
    ongeolocationclick,
  }: Props = $props();
</script>

<aside class="right-map-controls" aria-label="Map controls">
  <GeolocationControl state={geolocationState} onclick={ongeolocationclick} />
  <LayerFadeControl bind:opacity bind:open />
  <GrayscaleControl bind:enabled={grayscale} />
</aside>

<style>
  .right-map-controls {
    position: absolute;
    z-index: 2;
    top: var(--map-actions-top);
    right: var(--map-right-inset);
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: var(--map-control-gap);
  }
</style>
