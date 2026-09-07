<script lang="ts">
  import LayerFadeControl from './LayerFadeControl.svelte';
  import GrayscaleControl from './GrayscaleControl.svelte';

  interface Props {
    opacity?: number;
    open?: boolean;
    grayscale?: boolean;
    geolocationContainer?: HTMLDivElement | null;
  }

  let {
    opacity = $bindable(0),
    open = $bindable(false),
    grayscale = $bindable(false),
    geolocationContainer = $bindable(null),
  }: Props = $props();
</script>

<aside class="right-map-controls" aria-label="Map controls">
  <div bind:this={geolocationContainer} class="geolocation-slot"></div>
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

  .geolocation-slot {
    width: var(--map-control-size);
    height: var(--map-control-size);
  }
</style>
