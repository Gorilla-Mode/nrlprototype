<script lang="ts">
  import { onMount } from 'svelte';
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
    searchState.status === 'empty' ? 'No matches found' :
    searchState.status === 'error' ? 'Search is unavailable right now' : '',
  );
  let announcement = $derived(
    open ? `${searchState.suggestions.length} suggestion${searchState.suggestions.length === 1 ? '' : 's'} available` : note,
  );

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
    gap: 10px;
    min-width: 0;
    height: var(--map-control-size);
    padding: 0 14px;
    border-radius: 999px;
    background: var(--color-surface);
    box-shadow: var(--shadow-control);
    color: var(--color-muted);
    pointer-events: auto;
  }

  .search-bar svg {
    flex: none;
    width: 24px;
    height: 24px;
    stroke: currentColor;
    stroke-width: 1.7;
    stroke-linecap: round;
    stroke-linejoin: round;
  }

  .search-bar input {
    width: 100%;
    min-width: 0;
    padding: 0;
    border: 0;
    outline: none;
    background: transparent;
    color: var(--color-text);
    font-size: 13px;
    opacity: 1;
    -webkit-text-fill-color: var(--color-text);
  }

  .search-bar input::placeholder {
    color: var(--color-muted);
    opacity: 1;
  }

  .search-bar:focus-within {
    outline: 2px solid var(--color-focus);
    outline-offset: 2px;
  }

  .suggestions,
  .search-note {
    position: absolute;
    z-index: 3;
    top: calc(100% + 8px);
    right: 0;
    left: 0;
    margin: 0;
    padding: 0;
    overflow: hidden;
    border-radius: 16px;
    background: var(--color-surface);
    box-shadow: var(--shadow-control);
    pointer-events: auto;
  }

  .suggestions[hidden] {
    display: none;
  }

  .suggestions li {
    display: flex;
    flex-direction: column;
    gap: 2px;
    padding: 9px 16px;
    cursor: pointer;
  }

  .suggestions li + li {
    border-top: 1px solid var(--color-track-muted);
  }

  .suggestions li:hover {
    background: var(--color-surface-hover);
  }

  .suggestions li.is-highlighted {
    background: var(--color-surface-active);
  }

  .suggestion-label {
    color: var(--color-text);
    font-size: 13px;
    line-height: 1.3;
  }

  .suggestions li.is-highlighted .suggestion-label {
    color: var(--color-accent-strong);
  }

  .suggestion-detail {
    color: var(--color-muted);
    font-size: 11px;
    line-height: 1.3;
  }

  .search-note {
    padding: 12px 16px;
    color: var(--color-muted);
    font-size: 13px;
    line-height: 1.3;
  }

  .sr-only {
    position: absolute;
    width: 1px;
    height: 1px;
    padding: 0;
    overflow: hidden;
    clip-path: inset(50%);
    white-space: nowrap;
    border: 0;
  }
</style>
