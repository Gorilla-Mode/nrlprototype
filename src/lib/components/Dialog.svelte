<script lang="ts">
  import { onMount, tick, type Snippet } from 'svelte';
  import DialogActions from './DialogActions.svelte';

  interface Props {
    title: string;
    /** Small status icon on the title line. */
    icon?: 'success' | 'warning';
    /** Muted text under the title, indented to the title text; also describes the dialog. */
    subtitle?: Snippet;
    role?: 'dialog' | 'alertdialog';
    /** While busy, X, Escape and the backdrop cannot close the dialog. */
    busy?: boolean;
    /** X and Escape. */
    onclose: () => void;
    children: Snippet;
    primary: Snippet;
    secondary?: Snippet;
  }

  let { title, icon, subtitle, role = 'dialog', busy = false, onclose, children, primary, secondary }: Props = $props();
  const id = $props.id();
  let dialog: HTMLDialogElement;
  let footer: HTMLElement;

  /** Focuses the primary action; call again after content changes, e.g. a new step. */
  export async function focusPrimary() {
    await tick();
    footer.querySelector<HTMLElement>('[data-dialog-action="primary"] button')?.focus({ preventScroll: true });
  }

  onMount(() => {
    dialog.showModal();
    void focusPrimary();
    return () => { if (dialog.open) dialog.close(); };
  });

  function requestClose() {
    if (!busy) onclose();
  }

  function keydown(event: KeyboardEvent) {
    if (event.key !== 'Escape') return;
    // Handled here so a page's own Escape handler does not also close the page.
    event.preventDefault();
    event.stopPropagation();
    requestClose();
  }
</script>

<dialog class="app-dialog" bind:this={dialog} {role} aria-labelledby={`${id}-title`} aria-describedby={subtitle ? `${id}-subtitle` : undefined}
  aria-busy={busy} oncancel={(event) => { event.preventDefault(); requestClose(); }} onkeydown={keydown}>
  <header class="app-dialog-header" class:with-icon={icon}>
    {#if icon}
      <span class="app-dialog-icon" data-icon={icon} aria-hidden="true">
        <svg viewBox="0 0 24 24" fill="none"><path d={icon === 'success' ? 'M6.5 12.5 10.5 16.5 17.5 8' : 'M12 7v6m0 4v.5'} /></svg>
      </span>
    {/if}
    <h2 id={`${id}-title`}>{title}</h2>
    <button class="app-dialog-close" type="button" aria-label="Close" disabled={busy} onclick={requestClose}>
      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="m6 6 12 12M6 18 18 6" /></svg>
    </button>
    {#if subtitle}<div id={`${id}-subtitle`} class="app-dialog-subtitle">{@render subtitle()}</div>{/if}
  </header>

  <div class="app-dialog-body">{@render children()}</div>

  <footer class="app-dialog-footer" bind:this={footer}>
    <DialogActions {primary} {secondary} />
  </footer>
</dialog>

<style>
  .app-dialog {
    width: min(var(--report-panel-max), calc(100dvw - var(--map-control-inset-left) - var(--map-control-inset-right)));
    max-height: calc(100dvh - var(--map-control-inset-top) - var(--map-control-inset-bottom));
    margin: auto;
    padding: 0;
    overflow-y: auto;
    border: var(--border-default);
    border-radius: var(--radius-dialog);
    background: var(--color-background-raised);
    box-shadow: var(--shadow-surface);
    color: var(--color-text-primary);
    text-align: left;
  }
  .app-dialog::backdrop { background: var(--color-background-scrim); }
  svg { stroke: currentColor; stroke-width: var(--icon-stroke-width); stroke-linecap: round; stroke-linejoin: round; }

  /* Title, icon and X share the first line; the X's glyph lines up with the content edge. */
  .app-dialog-header {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    align-items: start;
    column-gap: var(--space-3);
    padding: var(--dialog-header-padding-top) calc(var(--dialog-padding-inline) - var(--space-3)) 0 var(--dialog-padding-inline);
  }
  .app-dialog-header.with-icon { grid-template-columns: var(--icon-size-large) minmax(0, 1fr) auto; }
  h2 {
    margin: 0;
    padding-block: var(--dialog-title-offset);
    font-size: var(--font-size-heading-small);
    font-weight: var(--font-weight-semibold);
    line-height: var(--line-height-tight);
    overflow-wrap: anywhere;
  }
  .app-dialog-icon {
    display: grid;
    place-items: center;
    width: var(--icon-size-large);
    height: var(--icon-size-large);
    margin-top: var(--dialog-icon-offset);
    border-radius: var(--radius-round);
    background: var(--color-status-success);
    color: var(--color-text-inverse);
  }
  .app-dialog-icon[data-icon='warning'] { background: var(--color-status-warning); }
  .app-dialog-icon svg { width: var(--icon-size-small); height: var(--icon-size-small); stroke-width: calc(var(--icon-stroke-width) + 0.75); }
  .app-dialog-close {
    display: grid;
    place-items: center;
    flex: none;
    width: var(--target-size-min);
    min-width: var(--target-size-min);
    height: var(--target-size-min);
    min-height: var(--target-size-min);
    padding: 0;
    border: 0;
    border-radius: var(--radius-round);
    background: transparent;
    color: var(--color-text-secondary);
    cursor: pointer;
  }
  .app-dialog-close:not(:disabled):hover { background: var(--color-map-control-hover); color: var(--color-text-primary); }
  .app-dialog-close svg { width: var(--icon-size-default); height: var(--icon-size-default); }
  .app-dialog-subtitle {
    grid-column: 1;
    display: grid;
    gap: var(--space-1);
    color: var(--color-text-secondary);
    font-size: var(--font-size-body-small);
    line-height: var(--line-height-body);
    overflow-wrap: anywhere;
  }
  .with-icon .app-dialog-subtitle { grid-column: 2; }
  .app-dialog-subtitle :global(p) { margin: 0; }

  .app-dialog-body { padding: var(--space-4) var(--dialog-padding-inline) 0; }
  .app-dialog-footer { padding: var(--space-5) var(--dialog-padding-inline) var(--space-6); }
</style>
