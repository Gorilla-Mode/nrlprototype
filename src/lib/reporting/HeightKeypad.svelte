<script lang="ts">
  import { onMount } from 'svelte';

  let { value, unit = 'm', max, onconfirm, oncancel }: {
    value: number;
    unit?: 'm' | 'ft';
    max: number;
    onconfirm: (value: number) => void;
    oncancel: () => void;
  } = $props();
  let dialog: HTMLDialogElement;
  let input: HTMLInputElement;
  let entry = $state('');
  let pointerOnBackdrop = false;
  let maxDigits = $derived(String(max).length);

  onMount(() => {
    // This component is mounted afresh for each edit; draft changes never reset it.
    entry = String(value);
    dialog.showModal();
    input.focus({ preventScroll: true });
    return () => dialog.close();
  });

  function confirm() {
    if (entry === '') return;
    onconfirm(Math.max(0, Math.min(max, Number(entry))));
  }

  function outside(event: MouseEvent) {
    const bounds = dialog.getBoundingClientRect();
    return event.target === dialog && (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom);
  }

  function keydown(event: KeyboardEvent) {
    if (event.key !== 'Tab') return;
    const controls = Array.from(dialog.querySelectorAll<HTMLElement>('input, button:not(:disabled)'));
    const first = controls[0];
    const last = controls[controls.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last?.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first?.focus();
    }
  }
</script>

<dialog class="height-keypad" bind:this={dialog} aria-label="Enter obstacle height"
  oncancel={(event) => { event.preventDefault(); event.stopPropagation(); oncancel(); }}
  onkeydown={keydown}
  onpointerdown={(event) => { pointerOnBackdrop = outside(event); event.stopPropagation(); }}
  onclick={(event) => { if (pointerOnBackdrop && outside(event)) oncancel(); pointerOnBackdrop = false; event.stopPropagation(); }}>
  <div class="height-keypad-display-row">
    <input class="height-keypad-display" type="text" inputmode="numeric" pattern="[0-9]*"
      aria-label="Obstacle height value" value={entry} bind:this={input}
      oninput={(event) => {
        entry = event.currentTarget.value.replace(/\D/g, '').slice(0, maxDigits);
        event.currentTarget.value = entry;
      }}
      onkeydown={(event) => { if (event.key === 'Enter') { event.preventDefault(); confirm(); } }} />
    <span class="height-keypad-unit">{unit}</span>
  </div>
  <div class="height-keypad-grid">
    {#each ['1', '2', '3', '4', '5', '6', '7', '8', '9'] as digit}
      <button type="button" class="keypad-key" onclick={() => { entry = (entry + digit).slice(0, maxDigits); }}>{digit}</button>
    {/each}
    <button type="button" class="keypad-key" aria-label="Backspace" onclick={() => { entry = entry.slice(0, -1); }}>
      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M8 6h11a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H8l-5-6 5-6ZM12 10l4 4M16 10l-4 4" /></svg>
    </button>
    <button type="button" class="keypad-key" onclick={() => { entry = (entry + '0').slice(0, maxDigits); }}>0</button>
    <button type="button" class="keypad-key keypad-key--confirm" aria-label="Confirm height" disabled={entry === ''} onclick={confirm}>
      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M5 13l4 4L19 7" /></svg>
    </button>
  </div>
  <div class="height-keypad-actions">
    <button type="button" class="button" onclick={oncancel}>Cancel</button>
    <button type="button" class="button button--primary" disabled={entry === ''} onclick={confirm}>Set height</button>
  </div>
</dialog>

<style>
  .height-keypad {
    width: min(var(--height-keypad-width), calc(100dvw - var(--map-control-inset-left) - var(--map-control-inset-right)));
    max-width: none; max-height: calc(100dvh - var(--map-control-inset-top) - var(--map-control-inset-bottom));
    margin: auto; overflow-y: auto; overscroll-behavior: contain; color: var(--color-text-primary);
    padding: var(--space-4); border: var(--border-default); border-radius: var(--radius-dialog);
    background: var(--color-background-raised); box-shadow: var(--shadow-surface);
  }
  .height-keypad-display-row {
    display: flex; align-items: baseline; justify-content: center; gap: var(--space-2);
    padding: var(--space-3); border: var(--border-default); border-radius: var(--radius-control);
    background: var(--color-background-subtle);
  }
  .height-keypad-display {
    width: 6ch; border: 0; background: transparent; color: var(--color-text-primary);
    font-size: var(--font-size-display); font-weight: var(--font-weight-semibold); text-align: center;
  }
  .height-keypad-display-row:focus-within { outline: var(--border-width-emphasis) solid var(--color-focus-ring); }
  .height-keypad-display:focus-visible { outline: none; }
  .height-keypad-unit {
    color: var(--color-text-secondary); font-size: var(--font-size-body); font-weight: var(--font-weight-semibold);
    text-transform: uppercase;
  }
  .height-keypad-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: var(--space-2); }
  .keypad-key {
    min-height: var(--control-height-large); border: var(--border-default); border-radius: var(--radius-control);
    background: var(--color-background-subtle); color: var(--color-text-primary); cursor: pointer;
    font-size: var(--font-size-heading-small); font-weight: var(--font-weight-medium);
    display: grid; place-items: center;
  }
  .keypad-key:hover { background: var(--color-map-control-hover); }
  .keypad-key--confirm { border-color: var(--color-action-primary); color: var(--color-action-primary); }
  .height-keypad-actions { display: flex; gap: var(--space-3); }
  .height-keypad-actions .button { flex: 1; }

  .height-keypad[open] { display: flex; flex-direction: column; gap: var(--space-4); }
  .height-keypad::backdrop { background: var(--report-backdrop); backdrop-filter: blur(var(--report-backdrop-blur)); -webkit-backdrop-filter: blur(var(--report-backdrop-blur)); }
  svg { width: var(--icon-size-default); height: var(--icon-size-default); stroke: currentColor; stroke-width: var(--icon-stroke-width); stroke-linecap: round; stroke-linejoin: round; }
</style>
