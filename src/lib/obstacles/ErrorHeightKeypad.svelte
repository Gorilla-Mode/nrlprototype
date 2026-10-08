<script lang="ts">
  import { onMount } from 'svelte';
  import BackspaceIcon from '../icons/BackspaceIcon.svelte';
  import { describeHeightDifference } from './errorReport';

  let { value, registeredHeightM, onconfirm, oncancel }: {
    value: number | null;
    registeredHeightM: number;
    onconfirm: (value: number) => void;
    oncancel: () => void;
  } = $props();

  const maxDigits = 4;
  let dialog: HTMLDialogElement;
  let heading: HTMLHeadingElement;
  let entry = $state('');
  let pointerOnBackdrop = false;
  let height = $derived(entry === '' ? null : Number(entry));
  let canConfirm = $derived(height !== null && height > 0);

  onMount(() => {
    // Mounted afresh for each edit; only whole metres are entered here.
    entry = value !== null && Number.isInteger(value) && value > 0 ? String(value).slice(0, maxDigits) : '';
    dialog.showModal();
    heading.focus({ preventScroll: true });
    return () => { if (dialog.open) dialog.close(); };
  });

  function press(digit: string) {
    // A leading zero would only pad the display.
    if (entry === '' && digit === '0') return;
    entry = (entry + digit).slice(0, maxDigits);
  }

  function erase() { entry = entry.slice(0, -1); }

  function confirm() {
    if (canConfirm && height !== null) onconfirm(height);
  }

  function outside(event: MouseEvent) {
    const bounds = dialog.getBoundingClientRect();
    return event.target === dialog && (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom);
  }

  // A physical keyboard types too, without summoning the device keyboard.
  function keydown(event: KeyboardEvent) {
    if (event.ctrlKey || event.metaKey || event.altKey) return;
    if (/^\d$/.test(event.key)) { event.preventDefault(); press(event.key); }
    else if (event.key === 'Backspace') { event.preventDefault(); erase(); }
    else if (event.key === 'Enter' && !(event.target instanceof HTMLButtonElement)) { event.preventDefault(); confirm(); }
    else if (event.key === 'Tab') {
      const controls = Array.from(dialog.querySelectorAll<HTMLElement>('button:not(:disabled)'));
      const first = controls[0];
      const last = controls[controls.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
    }
  }
</script>

<dialog class="error-height-keypad" bind:this={dialog} aria-labelledby="error-height-keypad-heading"
  oncancel={(event) => { event.preventDefault(); event.stopPropagation(); oncancel(); }}
  onkeydown={keydown}
  onpointerdown={(event) => { pointerOnBackdrop = outside(event); event.stopPropagation(); }}
  onclick={(event) => { if (pointerOnBackdrop && outside(event)) oncancel(); pointerOnBackdrop = false; event.stopPropagation(); }}>
  <h2 id="error-height-keypad-heading" bind:this={heading} tabindex="-1">Enter correct height</h2>

  <div class="display" role="status" aria-live="polite">
    <p class="value"><span>{entry || '0'}</span> m</p>
    <p class="comparison">
      Registered: {registeredHeightM} m
      {#if canConfirm && height !== null}<br /><strong>{describeHeightDifference(height, registeredHeightM)}</strong>{/if}
    </p>
  </div>

  <div class="keys">
    {#each ['1', '2', '3', '4', '5', '6', '7', '8', '9'] as digit (digit)}
      <button type="button" class="key" onclick={() => press(digit)}>{digit}</button>
    {/each}
    <span aria-hidden="true"></span>
    <button type="button" class="key" onclick={() => press('0')}>0</button>
    <button type="button" class="key" aria-label="Delete last digit" disabled={entry === ''} onclick={erase}>
      <svg class="geometry-icon" viewBox="0 0 24 24" fill="none" aria-hidden="true"><BackspaceIcon /></svg>
    </button>
  </div>

  <div class="actions">
    <button type="button" class="button cancel" onclick={oncancel}>Cancel</button>
    <button type="button" class="button done" disabled={!canConfirm} onclick={confirm}>Done</button>
  </div>
</dialog>

<style>
  .error-height-keypad {
    width: min(var(--height-keypad-width), calc(100dvw - var(--map-control-inset-left) - var(--map-control-inset-right)));
    max-width: none; max-height: calc(100dvh - var(--map-control-inset-top) - var(--map-control-inset-bottom));
    margin: auto; overflow-y: auto; overscroll-behavior: contain; color: var(--color-text-primary);
    padding: var(--space-5); border: var(--border-default); border-radius: var(--radius-dialog);
    background: var(--color-background-raised); box-shadow: var(--shadow-surface);
  }
  .error-height-keypad[open] { display: flex; flex-direction: column; gap: var(--space-4); }
  .error-height-keypad::backdrop { background: var(--report-backdrop); backdrop-filter: blur(var(--report-backdrop-blur)); -webkit-backdrop-filter: blur(var(--report-backdrop-blur)); }
  h2 { margin: 0; font-size: var(--font-size-heading-small); text-align: center; }

  .display {
    padding: var(--space-3) var(--space-4); border-radius: var(--radius-control);
    background: var(--color-error-report-highlight-surface); color: var(--color-error-report-on-highlight); text-align: center;
  }
  .value { margin: 0; font-size: var(--font-size-body); font-weight: var(--font-weight-semibold); }
  .value span { font-size: var(--font-size-display); font-variant-numeric: tabular-nums; }
  .comparison { margin: var(--space-1) 0 0; font-size: var(--font-size-body-small); }

  .keys { display: grid; grid-template-columns: repeat(3, 1fr); gap: var(--space-2); }
  .key {
    display: grid; place-items: center; min-height: var(--error-report-keypad-key-size);
    border: 0; border-radius: var(--radius-control);
    background: var(--color-background-subtle); color: var(--color-text-primary); cursor: pointer;
    font-size: var(--font-size-heading-small); font-weight: var(--font-weight-medium); font-variant-numeric: tabular-nums;
  }
  .key:not(:disabled):hover { background: var(--color-map-control-hover); }
  .key:disabled { color: var(--color-text-disabled); cursor: default; }

  .actions { display: flex; gap: var(--space-3); }
  .actions .button { flex: 1; min-height: var(--error-report-keypad-key-size); border: 0; }
  .cancel { background: var(--color-background-subtle); }
  .done { background: var(--color-error-report-finish); color: var(--color-error-report-on-accent); font-weight: var(--font-weight-semibold); }
  .done:not(:disabled):hover { background: var(--color-error-report-finish-hover); }
  .done:disabled { background: var(--color-error-report-finish); color: var(--color-error-report-on-accent); opacity: var(--opacity-disabled); cursor: not-allowed; }
</style>
