<script module lang="ts">
  import type { Snippet } from 'svelte';

  /** A completed action, confirmed at the bottom centre of the screen. */
  export interface ConfirmationNotice {
    title: string;
    /** Secondary text under the title; a snippet when part of it is styled, e.g. a status tag. */
    description?: string | Snippet;
    /** Status icon in a circle; success is the only one so far. */
    icon?: 'success';
    /** Optional link-styled follow-up under the text, e.g. View report. */
    action?: { label: string; onclick: () => void };
  }
</script>

<script lang="ts">
  import { onMount } from 'svelte';
  import { fly } from 'svelte/transition';

  interface Props {
    /** Null renders nothing; the live region stays so the next notice is announced. */
    notice: ConfirmationNotice | null;
    /** Close button, the action, or the timeout. */
    onclose: () => void;
    /** Milliseconds before closing on its own; paused while a mouse is over it or the user has tabbed into it. */
    duration?: number;
    /**
     * card: white card with icon, title, text and action (default).
     * strip: the earlier compact green strip, kept for the error report until it moves to card.
     */
    appearance?: 'card' | 'strip';
  }

  let { notice, onclose, duration = 7000, appearance = 'card' }: Props = $props();
  let hovered = $state(false);
  let focused = $state(false);
  // Zero until mounted and under reduced motion: the card then appears and leaves at once.
  let motionDuration = $state(0);

  onMount(() => {
    const preference = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => {
      motionDuration = preference.matches ? 0
        : Number.parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--confirmation-toast-motion')) || 0;
    };
    update();
    preference.addEventListener('change', update);
    return () => preference.removeEventListener('change', update);
  });

  $effect(() => {
    if (!notice || hovered || focused) return;
    const timer = setTimeout(close, duration);
    return () => clearTimeout(timer);
  });

  // Only a mouse actually moving over the card pauses: pointerenter also fires when the card
  // appears or slides in under a still cursor, and for touch, which never leaves.
  function pointermove(event: PointerEvent) {
    if (notice && event.pointerType === 'mouse') hovered = true;
  }

  // Only keyboard focus pauses; focus from a click or script is not :focus-visible.
  function focusin(event: FocusEvent) {
    if (notice && event.target instanceof HTMLElement && event.target.matches(':focus-visible')) focused = true;
  }

  // The card is removed under the pointer or focus, so no leave event resets the pause.
  // While it slides out, notice is null and its events no longer set the pause.
  function close() {
    hovered = false;
    focused = false;
    onclose();
  }

  function act(action: NonNullable<ConfirmationNotice['action']>) {
    close();
    action.onclick();
  }
</script>

<div class="confirmation-toast" role="status" aria-live="polite">
  {#if notice}
    <!-- Mouse hover and keyboard focus only pause the timer; nothing moves focus here, aria-live announces it. -->
    <div class="confirmation-toast-card" data-appearance={appearance} role="presentation"
      transition:fly={{ y: 16, duration: motionDuration }}
      onpointermove={pointermove} onpointerleave={() => { hovered = false; }}
      onfocusin={focusin} onfocusout={(event) => { if (!event.currentTarget.contains(event.relatedTarget as Node | null)) focused = false; }}>
      <span class="confirmation-toast-icon" data-icon={notice.icon ?? 'success'} aria-hidden="true">
        <svg viewBox="0 0 24 24" fill="none"><path d="M6.5 12.5 10.5 16.5 17.5 8" /></svg>
      </span>
      <div class="confirmation-toast-text">
        <p class="confirmation-toast-title">{notice.title}</p>
        {#if typeof notice.description === 'function'}<p class="confirmation-toast-description">{@render notice.description()}</p>
        {:else if notice.description}<p class="confirmation-toast-description">{notice.description}</p>{/if}
        {#if notice.action}
          {@const action = notice.action}
          <button type="button" class="confirmation-toast-action" onclick={() => act(action)}>{action.label}</button>
        {/if}
      </div>
      <button type="button" class="ds-button confirmation-toast-close" data-variant="tertiary" data-color="neutral" data-icon="true" aria-label="Close" onclick={close}>
        <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="m6 6 12 12M6 18 18 6" /></svg>
      </button>
    </div>
  {/if}
</div>

<style>
  /* Bottom centre, over the map, clear of the safe area and a bottom control row. */
  .confirmation-toast {
    position: fixed;
    z-index: var(--layer-toast);
    left: var(--map-control-inset-left);
    right: var(--map-control-inset-right);
    bottom: calc(var(--map-control-inset-bottom) + var(--control-height-large) + var(--space-3));
    display: flex;
    justify-content: center;
    pointer-events: none;
  }
  .confirmation-toast-card {
    display: flex;
    align-items: flex-start;
    gap: var(--space-3);
    width: min(100%, var(--confirmation-toast-max));
    box-sizing: border-box;
    padding: var(--space-4) var(--space-1) var(--space-4) var(--space-4);
    border: var(--border-default);
    border-radius: var(--radius-card);
    background: var(--color-background-raised);
    box-shadow: var(--shadow-control);
    pointer-events: auto;
  }
  .confirmation-toast-icon {
    flex: none;
    display: grid;
    place-items: center;
    width: var(--icon-size-large);
    height: var(--icon-size-large);
    border-radius: var(--radius-round);
    background: var(--confirmation-toast-success);
    color: var(--confirmation-toast-on-success);
  }
  .confirmation-toast-text { flex: 1; min-width: 0; overflow-wrap: anywhere; }
  .confirmation-toast-text p { margin: 0; }
  .confirmation-toast-title { color: var(--color-text-primary); font-weight: var(--font-weight-semibold); line-height: var(--line-height-body); }
  .confirmation-toast-description { margin-top: var(--space-1); color: var(--color-text-secondary); font-size: var(--font-size-body-small); line-height: var(--line-height-body); }
  /* A link-styled button, 44 px tall; the negative margin keeps the card's bottom padding even. */
  .confirmation-toast-action {
    display: inline-flex;
    align-items: center;
    min-height: var(--target-size-min);
    margin-bottom: calc(-1 * var(--space-3));
    padding: 0;
    border: 0;
    background: none;
    color: var(--color-action-secondary);
    font: inherit;
    font-weight: var(--font-weight-semibold);
    text-decoration: underline;
    text-underline-offset: 0.2em;
    cursor: pointer;
  }
  .confirmation-toast-close {
    flex: none;
    min-width: var(--target-size-min);
    min-height: var(--target-size-min);
    margin-block: calc(-1 * var(--space-3));
  }
  svg {
    width: var(--icon-size-default);
    height: var(--icon-size-default);
    stroke: currentColor;
    stroke-width: var(--icon-stroke-width);
    stroke-linecap: round;
    stroke-linejoin: round;
  }
  .confirmation-toast-icon svg { width: var(--icon-size-small); height: var(--icon-size-small); stroke-width: calc(var(--icon-stroke-width) + 0.75); }

  /* The earlier compact green strip: one line, a bare check, no circle. */
  .confirmation-toast-card[data-appearance='strip'] {
    align-items: center;
    gap: var(--space-2);
    width: fit-content;
    max-width: 100%;
    padding: var(--space-1) var(--space-1) var(--space-1) var(--space-3);
    border: 0;
    background: var(--color-status-success-surface);
  }
  [data-appearance='strip'] .confirmation-toast-icon { width: auto; height: auto; background: none; color: var(--color-status-success); }
  [data-appearance='strip'] .confirmation-toast-icon svg { width: var(--icon-size-default); height: var(--icon-size-default); stroke-width: var(--icon-stroke-width); }
  [data-appearance='strip'] .confirmation-toast-title { color: var(--color-status-success); }
  [data-appearance='strip'] .confirmation-toast-close { margin-block: 0; }
</style>
