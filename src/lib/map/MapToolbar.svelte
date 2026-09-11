<script lang="ts">
  import MapButton from './MapButton.svelte';
</script>

<div class="map-toolbar" role="group" aria-label="Map tools">
  <div class="search-bar">
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="10.75" cy="10.75" r="6.75" />
      <path d="m16 16 5 5" />
    </svg>
    <input
      type="search"
      placeholder="Search place or address"
      aria-label="Search place or address"
      disabled
    />
  </div>

  <MapButton type="button" aria-label="Reports" disabled>
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M13 3H6a1 1 0 0 0-1 1v16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V9l-6-6Z" />
      <path d="M13 3v6h6M8.5 13h7M8.5 16.5h7M8.5 9h1" />
    </svg>
  </MapButton>

  <MapButton type="button" aria-label="Menu" disabled>
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M4 6h16M4 12h16M4 18h16" />
    </svg>
  </MapButton>
</div>

<style>
  .map-toolbar {
    position: absolute;
    z-index: var(--layer-map-overlay);
    top: var(--map-control-inset-top);
    right: var(--map-control-inset-right);
    left: var(--map-control-inset-left);
    display: flex;
    align-items: center;
    gap: var(--map-toolbar-gap);
    pointer-events: none;
  }

  .search-bar {
    display: flex;
    flex: 1;
    align-items: center;
    gap: var(--space-3);
    max-width: var(--map-search-max);
    min-width: 0;
    height: var(--map-control-size);
    margin-inline-end: auto;
    padding-inline: var(--map-search-padding-inline);
    border: var(--map-control-border);
    border-radius: var(--radius-control);
    background: var(--color-map-control-surface);
    box-shadow: var(--shadow-control);
    color: var(--color-text-secondary);
    pointer-events: auto;
  }

  .search-bar input {
    width: 100%;
    min-width: 0;
    padding: 0;
    border: 0;
    outline: none;
    background: transparent;
    color: var(--color-text-secondary);
    font-size: var(--font-size-body-small);
    opacity: var(--opacity-opaque);
    -webkit-text-fill-color: var(--color-text-secondary);
  }

  .search-bar:has(input:disabled) {
    opacity: var(--opacity-disabled);
  }

  .search-bar input::placeholder {
    color: var(--color-text-secondary);
    opacity: var(--opacity-opaque);
  }
</style>
