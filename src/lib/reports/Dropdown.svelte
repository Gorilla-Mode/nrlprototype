<script lang="ts" generics="T extends string">
  import { tick } from 'svelte';

  interface Option {
    value: T;
    label: string;
  }

  interface Props {
    /** Prefix for the trigger, listbox and option ids. */
    id: string;
    /** Id of the visible label that names the field. */
    labelledby: string;
    options: readonly Option[];
    value: T;
  }

  let { id, labelledby, options, value = $bindable() }: Props = $props();

  let open = $state(false);
  let openUpward = $state(false);
  /** Caps the list to the room on the chosen side; null keeps the stylesheet maximum. */
  let maxHeight = $state<number | null>(null);
  let highlighted = $state(0);
  let root = $state<HTMLDivElement | undefined>();
  let trigger = $state<HTMLButtonElement | undefined>();
  let listbox = $state<HTMLUListElement | undefined>();

  let selectedIndex = $derived(Math.max(0, options.findIndex((option) => option.value === value)));
  let selectedLabel = $derived(options[selectedIndex]?.label ?? '');
  const optionId = (index: number) => `${id}-option-${index}`;

  /** Visible area of the nearest scrolling ancestor, so the list never opens into a clipped region. */
  function visibleBounds(element: HTMLElement): { top: number; bottom: number } {
    for (let parent = element.parentElement; parent; parent = parent.parentElement) {
      if (/(auto|scroll)/.test(getComputedStyle(parent).overflowY)) {
        const rect = parent.getBoundingClientRect();
        return { top: Math.max(0, rect.top), bottom: Math.min(window.innerHeight, rect.bottom) };
      }
    }
    return { top: 0, bottom: window.innerHeight };
  }

  async function show(index = selectedIndex) {
    highlighted = index;
    openUpward = false;
    maxHeight = null;
    open = true;
    await tick();
    if (!trigger || !listbox) return;
    const box = trigger.getBoundingClientRect();
    const bounds = visibleBounds(trigger);
    const gap = listbox.offsetTop - trigger.offsetHeight;
    const below = bounds.bottom - box.bottom - gap;
    const above = box.top - bounds.top - gap;
    // Below unless it does not fit there and the room above is larger.
    openUpward = below < listbox.offsetHeight && above > below;
    const room = Math.floor(openUpward ? above : below);
    if (room < listbox.offsetHeight) maxHeight = room;
    revealHighlighted();
  }

  function hide() {
    open = false;
  }

  function choose(index: number) {
    value = options[index].value;
    hide();
    trigger?.focus();
  }

  /** Scrolls only the list; scrollIntoView would also scroll the page and move the field away from its list. */
  function revealHighlighted() {
    const option = listbox?.querySelector<HTMLElement>(`#${CSS.escape(optionId(highlighted))}`);
    if (!listbox || !option) return;
    if (option.offsetTop < listbox.scrollTop) listbox.scrollTop = option.offsetTop;
    else if (option.offsetTop + option.offsetHeight > listbox.scrollTop + listbox.clientHeight) {
      listbox.scrollTop = option.offsetTop + option.offsetHeight - listbox.clientHeight;
    }
  }

  function move(index: number) {
    highlighted = Math.min(options.length - 1, Math.max(0, index));
    revealHighlighted();
  }

  function onkeydown(event: KeyboardEvent) {
    if (!open) {
      if (['ArrowDown', 'ArrowUp', 'Enter', ' '].includes(event.key)) {
        event.preventDefault();
        void show();
      }
      return;
    }
    switch (event.key) {
      case 'ArrowDown': event.preventDefault(); move(highlighted + 1); break;
      case 'ArrowUp': event.preventDefault(); move(highlighted - 1); break;
      case 'Home': event.preventDefault(); move(0); break;
      case 'End': event.preventDefault(); move(options.length - 1); break;
      case 'Enter':
      case ' ': event.preventDefault(); choose(highlighted); break;
      // preventDefault also keeps the page's own Escape handler from closing the page.
      case 'Escape': event.preventDefault(); hide(); break;
      case 'Tab': hide(); break;
    }
  }

  function onwindowpointerdown(event: PointerEvent) {
    if (open && root && !root.contains(event.target as Node)) hide();
  }
</script>

<svelte:window onpointerdown={onwindowpointerdown} />

<div class="dropdown" bind:this={root}>
  <button
    bind:this={trigger}
    id={`${id}-trigger`}
    type="button"
    class="dropdown-trigger"
    role="combobox"
    aria-haspopup="listbox"
    aria-expanded={open}
    aria-controls={`${id}-listbox`}
    aria-labelledby={`${labelledby} ${id}-trigger`}
    aria-activedescendant={open ? optionId(highlighted) : undefined}
    onclick={() => (open ? hide() : show())}
    {onkeydown}
  >
    <span class="dropdown-value">{selectedLabel}</span>
    <svg class="dropdown-chevron" class:open viewBox="0 0 9 16" fill="none" aria-hidden="true"><path d="M1.5 1.5 7.5 8l-6 6.5" /></svg>
  </button>

  <ul
    bind:this={listbox}
    id={`${id}-listbox`}
    class="dropdown-listbox"
    class:upward={openUpward}
    style:max-height={maxHeight === null ? undefined : `${maxHeight}px`}
    role="listbox"
    aria-labelledby={labelledby}
    tabindex="-1"
    hidden={!open}
  >
    {#each options as option, index (option.value)}
      <!-- Keyboard access runs through the trigger's aria-activedescendant; options are pointer targets only. -->
      <!-- svelte-ignore a11y_click_events_have_key_events -->
      <li
        id={optionId(index)}
        class="dropdown-option"
        class:highlighted={index === highlighted}
        role="option"
        aria-selected={option.value === value}
        onclick={() => choose(index)}
        onpointermove={() => (highlighted = index)}
      >
        <span>{option.label}</span>
        {#if option.value === value}
          <svg class="dropdown-check" viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M3 8.5l3 3 7-7" /></svg>
        {/if}
      </li>
    {/each}
  </ul>
</div>

<style>
  .dropdown { position: relative; width: 100%; }

  .dropdown-trigger {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--space-2);
    width: 100%;
    min-height: var(--target-size-min);
    padding: 0 var(--space-4) 0 var(--space-3);
    border: var(--border-default);
    border-radius: var(--radius-control);
    background: var(--color-background-raised);
    color: var(--color-text-primary);
    font: inherit;
    text-align: left;
    cursor: pointer;
  }
  .dropdown-trigger:hover { background: var(--color-map-control-hover); }
  .dropdown-trigger[aria-expanded='true'] { border-color: var(--color-action-secondary); }

  .dropdown-value { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

  .dropdown-chevron, .dropdown-check {
    flex: none;
    width: 1em;
    height: 1em;
    stroke: currentColor;
    stroke-width: var(--icon-stroke-width);
    stroke-linecap: round;
    stroke-linejoin: round;
  }
  .dropdown-chevron {
    color: var(--color-text-secondary);
    transform: rotate(90deg);
    transition: transform var(--duration-default) var(--ease-standard);
  }
  .dropdown-chevron.open { transform: rotate(270deg); }

  .dropdown-listbox {
    position: absolute;
    top: calc(100% + var(--space-2));
    left: 0;
    right: 0;
    z-index: var(--layer-popover);
    max-height: calc(6 * var(--target-size-min) + 2 * var(--space-1) + 2 * var(--border-width-default));
    overflow-y: auto;
    margin: 0;
    padding: var(--space-1);
    list-style: none;
    box-sizing: border-box;
    border: var(--border-default);
    border-radius: var(--radius-control);
    background: var(--color-background-raised);
    box-shadow: var(--shadow-control);
  }
  .dropdown-listbox[hidden] { display: none; }
  .dropdown-listbox.upward { top: auto; bottom: calc(100% + var(--space-2)); }

  .dropdown-option {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--space-2);
    min-height: var(--target-size-min);
    padding: 0 var(--space-3);
    border-radius: var(--radius-small);
    color: var(--color-text-primary);
    cursor: pointer;
  }
  .dropdown-option.highlighted { background: var(--color-map-control-hover); }
  .dropdown-option[aria-selected='true'] { background: var(--color-action-selected); color: var(--color-action-secondary); }
  .dropdown-option[aria-selected='true'].highlighted { box-shadow: inset 0 0 0 var(--border-width-emphasis) var(--color-action-secondary); }
  .dropdown-check { color: var(--color-action-secondary); }
</style>
