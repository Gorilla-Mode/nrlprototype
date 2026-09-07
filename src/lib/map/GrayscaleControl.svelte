<script lang="ts">
  import MapButton from './MapButton.svelte';

  interface Props {
    enabled?: boolean;
  }

  let { enabled = $bindable(false) }: Props = $props();
</script>

<div class="grayscale-actions">
  <MapButton
    class="grayscale-button"
    active={enabled}
    aria-label="Toggle grayscale map"
    aria-pressed={enabled}
    title="Toggle grayscale map"
    onclick={() => { enabled = !enabled; }}
  >
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M12 3.5a8.5 8.5 0 0 0 0 17Z" fill="currentColor" stroke="none" />
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 3.5v17" />
    </svg>
  </MapButton>
</div>

<style>
  .grayscale-actions {
    width: var(--map-control-size);
    height: var(--map-control-size);
  }
</style>
