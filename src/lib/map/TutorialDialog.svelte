<script lang="ts">
  import { onMount } from 'svelte';
  import TutorialBlock from './TutorialBlock.svelte';
  import { tutorialBlocks, type TutorialEntry } from './tutorial';

  let { blocks = tutorialBlocks, ondismiss }: {
    blocks?: readonly TutorialEntry[];
    ondismiss: () => void;
  } = $props();
  let dialog: HTMLDialogElement;
  let closeButton: HTMLButtonElement;
  let content: HTMLDivElement;
  let backdropPress = false;

  onMount(() => {
    dialog.showModal();
    closeButton.focus({ preventScroll: true });
    return () => dialog.close();
  });

  function isBackdrop(event: MouseEvent) {
    const box = dialog.getBoundingClientRect();
    return event.target === dialog && (event.clientX < box.left || event.clientX > box.right || event.clientY < box.top || event.clientY > box.bottom);
  }

  function keydown(event: KeyboardEvent) {
    if (event.key !== 'Tab') return;
    // The scroll region is keyboard accessible even when the tutorial has no blocks.
    if (event.shiftKey && document.activeElement === closeButton) {
      event.preventDefault();
      content.focus();
    } else if (!event.shiftKey && document.activeElement === content) {
      event.preventDefault();
      closeButton.focus();
    }
  }
</script>

<dialog id="map-tutorial" class="dialog-shell tutorial-dialog" bind:this={dialog} aria-labelledby="tutorial-title"
  oncancel={(event) => { event.preventDefault(); event.stopPropagation(); ondismiss(); }}
  onkeydown={keydown}
  onpointerdown={(event) => { backdropPress = isBackdrop(event); }}
  onclick={(event) => { if (backdropPress && isBackdrop(event)) ondismiss(); backdropPress = false; }}>
  <header class="dialog-header">
    <h2 id="tutorial-title">Tutorial</h2>
    <button class="button" type="button" bind:this={closeButton} aria-label="Close tutorial" onclick={ondismiss}>Close</button>
  </header>
  <!-- Keyboard users need to focus this scroll region to read long tutorials. -->
  <!-- svelte-ignore a11y_no_noninteractive_tabindex -->
  <div class="dialog-content" bind:this={content} tabindex="0" role="region" aria-label="Tutorial content">
    {#each blocks as block (block.id)}
      <TutorialBlock {block} />
    {/each}
  </div>
</dialog>

<style>
  .tutorial-dialog {
    width: min(var(--dialog-content-max), calc(100dvw - var(--map-control-inset-left) - var(--map-control-inset-right)));
    max-width: none;
    max-height: calc(100dvh - var(--map-control-inset-top) - var(--map-control-inset-bottom));
    inset: var(--map-control-inset-top) var(--map-control-inset-right) var(--map-control-inset-bottom) var(--map-control-inset-left);
    margin: auto;
    padding: 0;
    overflow: hidden;
  }
  .tutorial-dialog[open] { display: flex; flex-direction: column; }
  .tutorial-dialog::backdrop { background: var(--color-background-scrim); }
  .dialog-header { flex: none; display: flex; align-items: center; justify-content: space-between; gap: var(--space-4); }
  h2 { margin: 0; font-size: var(--font-size-heading); line-height: var(--line-height-tight); }
  .dialog-content { min-height: 0; overflow-y: auto; overscroll-behavior: contain; display: grid; gap: var(--space-4); }
  .dialog-content:focus-visible { outline-offset: calc(-1 * var(--border-width-emphasis)); }
</style>
