<script lang="ts">
  import { onMount, tick } from 'svelte';
  import {
    createLocationSearchController,
    idleSearchState,
    type LocationSearchController,
    type LocationSearchState,
  } from './createLocationSearchController.js';
  import type { LocationSuggestion } from './locationSearch.js';

  let { onselect }: { onselect: (suggestion: LocationSuggestion) => void } = $props();

  const listboxId = 'location-suggestions';
  const optionId = (index: number) => `${listboxId}-option-${index}`;

  let searchState = $state.raw<LocationSearchState>(idleSearchState);
  let controller = $state.raw<LocationSearchController | null>(null);
  let field = $state<HTMLElement | null>(null);
  let input = $state<HTMLInputElement | null>(null);

  let open = $derived(searchState.suggestions.length > 0);
  let note = $derived(
    searchState.status === 'searching' ? 'Searching...' :
    searchState.status === 'empty' ? 'No matches found' :
    searchState.status === 'error' ? 'Search is unavailable right now' : '',
  );
  let announcement = $derived(
    open ? `${searchState.suggestions.length} suggestion${searchState.suggestions.length === 1 ? '' : 's'} available` : note,
  );

  $effect(() => {
    const highlighted = searchState.highlighted;
    if (highlighted < 0) return;
    void tick().then(() => {
      field?.querySelector(`#${optionId(highlighted)}`)?.scrollIntoView({ block: 'nearest' });
    });
  });

  onMount(() => {
    const instance = createLocationSearchController({
      onChange: (next) => { searchState = next; },
      onSelect: (suggestion) => onselect(suggestion),
    });
    controller = instance;

    return () => {
      controller = null;
      instance.destroy();
    };
  });

  function choose(suggestion: LocationSuggestion) {
    controller?.select(suggestion);
    input?.focus();
  }

  function handleKeydown(event: KeyboardEvent) {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      if (!open) return;
      event.preventDefault();
      if (event.key === 'ArrowDown') controller?.highlightNext();
      else controller?.highlightPrevious();
    } else if (event.key === 'Enter' && searchState.highlighted >= 0) {
      event.preventDefault();
      controller?.selectHighlighted();
    } else if (event.key === 'Escape' && (open || note || searchState.status === 'searching')) {
      event.preventDefault();
      controller?.close();
    }
  }

  function handlePointerDown(event: PointerEvent) {
    if (!field || !(event.target instanceof Node) || field.contains(event.target)) return;
    controller?.close();
  }
</script>

<svelte:window onpointerdown={handlePointerDown} />

<div class="search-bar" bind:this={field}>
  <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <circle cx="10.75" cy="10.75" r="6.75" />
    <path d="m16 16 5 5" />
  </svg>
  <input
    bind:this={input}
    type="search"
    placeholder="Search place or address"
    aria-label="Search place or address"
    role="combobox"
    aria-expanded={open}
    aria-controls={listboxId}
    aria-autocomplete="list"
    aria-busy={searchState.status === 'searching'}
    aria-activedescendant={searchState.highlighted >= 0 ? optionId(searchState.highlighted) : undefined}
    autocomplete="off"
    value={searchState.query}
    oninput={(event) => controller?.setQuery(event.currentTarget.value)}
    onkeydown={handleKeydown}
  />

  <ul id={listboxId} class="suggestions" role="listbox" aria-label="Search results" hidden={!open}>
    {#each searchState.suggestions as suggestion, index (suggestion.id)}
      <!--
        Keyboard access runs through the input's aria-activedescendant, which is the
        ARIA combobox pattern; an option must not hold a focusable child of its own.
      -->
      <!-- svelte-ignore a11y_click_events_have_key_events -->
      <li
        id={optionId(index)}
        role="option"
        aria-selected={index === searchState.highlighted}
        class:is-highlighted={index === searchState.highlighted}
        onclick={() => choose(suggestion)}
      >
        <span class="suggestion-label">{suggestion.label}</span>
        {#if suggestion.detail}<span class="suggestion-detail">{suggestion.detail}</span>{/if}
      </li>
    {/each}
  </ul>

  {#if note && !open}
    <p class="search-note">{note}</p>
  {/if}

  <p class="sr-only" role="status">{announcement}</p>
</div>

<style>
  .search-bar {
    position: relative;
    display: flex;
    flex: 1;
    align-items: center;
    gap: var(--space-2);
    min-width: 0;
    max-width: var(--map-search-max);
    margin-inline-end: auto;
    height: var(--map-control-size);
    padding-inline: var(--map-search-padding-inline);
    border: var(--border-strong);
    border-radius: var(--radius-control);
    background: var(--color-background-raised);
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
    color: var(--color-text-primary);
    font-size: var(--font-size-body);
    -webkit-text-fill-color: currentColor;
  }
  .search-bar input::placeholder { color: var(--color-text-secondary); opacity: var(--opacity-opaque); }
  .search-bar:focus-within { outline: var(--border-width-emphasis) solid var(--color-focus-ring); outline-offset: var(--space-1); }
  .suggestions, .search-note {
    position: absolute;
    z-index: var(--layer-popover);
    top: calc(100% + var(--space-2));
    right: 0;
    left: 0;
    margin: 0;
    padding: 0;
    max-height: min(var(--map-search-results-max), calc(100dvh - var(--map-control-inset-top) - var(--map-control-size) - var(--space-8)));
    overflow-y: auto;
    overscroll-behavior: contain;
    border: var(--border-strong);
    border-radius: var(--radius-card);
    background: var(--color-background-raised);
    box-shadow: var(--shadow-control);
    pointer-events: auto;
  }
  .suggestions[hidden] { display: none; }
  .suggestions li {
    display: flex;
    flex-direction: column;
    justify-content: center;
    gap: var(--space-1);
    min-height: var(--target-size-min);
    padding: var(--space-2) var(--space-4);
    cursor: pointer;
  }
  .suggestions li + li { border-top: var(--border-default); }
  .suggestions li:hover { background: var(--color-map-control-hover); }
  .suggestions li.is-highlighted { background: var(--color-action-selected); box-shadow: inset var(--space-1) 0 var(--color-action-secondary); }
  .suggestion-label { color: var(--color-text-primary); font-size: var(--font-size-body-small); line-height: var(--line-height-body); }
  .suggestions li.is-highlighted .suggestion-label { color: var(--color-action-secondary); font-weight: var(--font-weight-semibold); }
  .suggestion-detail { color: var(--color-text-secondary); font-size: var(--font-size-caption); line-height: var(--line-height-body); }
  .search-note { padding: var(--space-3) var(--space-4); color: var(--color-text-secondary); font-size: var(--font-size-body-small); }
</style>
