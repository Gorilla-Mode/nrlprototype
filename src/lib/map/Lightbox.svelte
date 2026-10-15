<script lang="ts">
  import { onMount, type Snippet } from 'svelte';

  interface Props {
    title: string;
    /** Accessible name of the close button, e.g. "Close map". */
    closeLabel: string;
    /** The opener closes the dialog and returns focus to its own trigger. */
    onclose: () => void;
    children: Snippet;
  }

  let { title, closeLabel, onclose, children }: Props = $props();
  const titleId = $props.id();
  let dialog: HTMLDialogElement;
  let closeButton: HTMLButtonElement;
  let backdropPress = false;

  // Runs before a parent's onMount, so content that measures itself (a map) sees the open dialog.
  onMount(() => {
    dialog.showModal();
    closeButton.focus({ preventScroll: true });
    return () => { if (dialog.open) dialog.close(); };
  });

  function isBackdrop(event: MouseEvent) {
    const box = dialog.getBoundingClientRect();
    return event.target === dialog && (event.clientX < box.left || event.clientX > box.right || event.clientY < box.top || event.clientY > box.bottom);
  }

  function keydown(event: KeyboardEvent) {
    if (event.key !== 'Escape') return;
    // Handled here so the Reports page's own Escape handler does not also close the page.
    event.preventDefault();
    event.stopPropagation();
    onclose();
  }
</script>

<dialog class="dialog-shell lightbox" bind:this={dialog} aria-labelledby={titleId}
  oncancel={(event) => { event.preventDefault(); onclose(); }}
  onkeydown={keydown}
  onpointerdown={(event) => { backdropPress = isBackdrop(event); }}
  onclick={(event) => { if (backdropPress && isBackdrop(event)) onclose(); backdropPress = false; }}>
  <header class="lightbox-header">
    <h2 id={titleId}>{title}</h2>
    <button class="menu-close" type="button" bind:this={closeButton} aria-label={closeLabel} onclick={onclose}>
      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="m6 6 12 12M6 18 18 6" /></svg>
    </button>
  </header>
  <div class="lightbox-body">
    {@render children()}
  </div>
</dialog>

<style>
  .lightbox {
    width: min(64rem, calc(100dvw - var(--map-control-inset-left) - var(--map-control-inset-right)));
    height: min(48rem, calc(100dvh - var(--map-control-inset-top) - var(--map-control-inset-bottom)));
    max-width: none;
    max-height: none;
    margin: auto;
    padding: 0;
    overflow: hidden;
  }
  .lightbox[open] { display: flex; flex-direction: column; }
  .lightbox::backdrop { background: var(--color-background-scrim); }

  .lightbox-header {
    flex: none;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--space-4);
    padding: var(--space-2) var(--space-2) var(--space-2) var(--dialog-padding-inline);
    border-bottom: var(--border-default);
  }
  h2 { min-width: 0; margin: 0; overflow-wrap: anywhere; font-size: var(--font-size-heading-small); font-weight: var(--font-weight-semibold); line-height: var(--line-height-tight); }
  .lightbox-header svg { width: var(--icon-size-large); height: var(--icon-size-large); stroke: currentColor; stroke-width: var(--icon-stroke-width); stroke-linecap: round; }

  .lightbox-body { position: relative; flex: 1; min-height: 0; }
</style>
