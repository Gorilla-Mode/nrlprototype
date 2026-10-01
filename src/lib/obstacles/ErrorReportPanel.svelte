<script lang="ts">
  import { onMount, tick, type Component } from 'svelte';
  import ObstacleIcon from '../icons/ObstacleIcon.svelte';
  import DoesNotExistIcon from '../icons/DoesNotExistIcon.svelte';
  import WrongPositionIcon from '../icons/WrongPositionIcon.svelte';
  import WrongHeightIcon from '../icons/WrongHeightIcon.svelte';
  import OtherIcon from '../icons/OtherIcon.svelte';
  import LitIcon from '../icons/LitIcon.svelte';
  import MicIcon from '../icons/MicIcon.svelte';
  import SendIcon from '../icons/SendIcon.svelte';
  import ErrorHeightKeypad from './ErrorHeightKeypad.svelte';
  import type { RegisteredObstacle } from './registeredObstacles';
  import {
    buildErrorReport, describeHeightDifference, describeLightingCorrection, errorKindChoices, formatCoordinates, isErrorReportValid,
    isValidHeight, toggleErrorKind, type ErrorKind, type ErrorReport,
  } from './errorReport';

  let { obstacle, ondismiss, onfinish }: {
    obstacle: RegisteredObstacle;
    ondismiss: () => void;
    onfinish: (report: ErrorReport) => void;
  } = $props();

  const kindIcons: Record<ErrorKind, Component> = {
    'does-not-exist': DoesNotExistIcon,
    'wrong-position': WrongPositionIcon,
    'wrong-height': WrongHeightIcon,
    'wrong-lighting': LitIcon,
    other: OtherIcon,
  };
  const closeIcon = 'm6 6 12 12M6 18 18 6';

  let errorKinds = $state<ErrorKind[]>([]);
  let heightValue = $state<number | null>(null);
  let description = $state('');

  let heightWrong = $derived(errorKinds.includes('wrong-height'));
  let descriptionRequired = $derived(errorKinds.includes('other'));
  let actualHeightM = $derived(heightValue);
  let lightingWrong = $derived(errorKinds.includes('wrong-lighting'));
  let input = $derived({ errorKinds, actualHeightM, description });
  let valid = $derived(isErrorReportValid(input));

  let dialog: HTMLDialogElement;
  let heading: HTMLHeadingElement;
  let descriptionField = $state<HTMLTextAreaElement>();
  let heightButton = $state<HTMLButtonElement>();
  let keypadOpen = $state(false);
  let backdropPress = false;

  function closeKeypad(value?: number) {
    if (value !== undefined) heightValue = value;
    keypadOpen = false;
    void tick().then(() => heightButton?.focus({ preventScroll: true }));
  }

  onMount(() => {
    dialog.showModal();
    heading.focus({ preventScroll: true });
    return () => { if (dialog.open) dialog.close(); };
  });

  function outside(event: MouseEvent) {
    const bounds = dialog.getBoundingClientRect();
    return event.target === dialog && (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom);
  }

  function resizeDescription() {
    if (!descriptionField) return;
    descriptionField.style.height = 'auto';
    descriptionField.style.height = `${descriptionField.scrollHeight}px`;
  }

  function finish() {
    if (valid) onfinish(buildErrorReport(obstacle, input));
  }
</script>

<dialog
  class="obstacle-report-dialog dialog-shell report-panel"
  bind:this={dialog}
  aria-labelledby="error-report-heading"
  oncancel={(event) => { event.preventDefault(); ondismiss(); }}
  onpointerdown={(event) => { backdropPress = outside(event); }}
  onclick={(event) => { if (backdropPress && outside(event)) ondismiss(); backdropPress = false; }}
>
  <div class="report-shell" inert={keypadOpen}>
  <header class="dialog-header report-header">
    <div>
      <h2 id="error-report-heading" bind:this={heading} tabindex="-1">Report error</h2>
      <p class="report-subtitle">{formatCoordinates(obstacle)}</p>
    </div>
    <button type="button" class="menu-close" aria-label="Close error report" onclick={ondismiss}>
      <svg class="geometry-icon" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d={closeIcon} /></svg>
    </button>
  </header>

  <div class="dialog-content report-content">
    <section class="obstacle-card" aria-label="Registered obstacle">
      <span class="obstacle-icon">
        <svg class="geometry-icon" viewBox="0 0 24 24" fill="none" aria-hidden="true"><ObstacleIcon /></svg>
      </span>
      <div>
        <strong>{obstacle.type}</strong>
        <p>Registered: {obstacle.heightM} m · {obstacle.lit ? 'Lit' : 'Not lit'} · ID {obstacle.id}</p>
      </div>
    </section>

    <section>
      <h3 class="section-label" id="error-kinds-label">What is wrong?</h3>
      <p class="section-hint" id="error-kinds-hint">Select all that apply</p>
      <div class="choice-grid" role="group" aria-labelledby="error-kinds-label" aria-describedby="error-kinds-hint">
        {#each errorKindChoices as choice (choice.kind)}
          {@const Icon = kindIcons[choice.kind]}
          <button
            type="button"
            class="choice"
            class:choice--stacked={choice.kind !== 'other'}
            class:choice--wide={choice.kind === 'other'}
            class:selected={errorKinds.includes(choice.kind)}
            aria-pressed={errorKinds.includes(choice.kind)}
            onclick={() => { errorKinds = toggleErrorKind(errorKinds, choice.kind); }}
          >
            <svg class="geometry-icon" viewBox="0 0 24 24" fill="none" aria-hidden="true"><Icon /></svg>
            <span>{choice.label}</span>
            {#if choice.kind === 'wrong-lighting' && lightingWrong}
              <span class="choice-detail">{describeLightingCorrection(obstacle.lit)}</span>
            {/if}
          </button>
        {/each}
      </div>
    </section>

    {#if heightWrong}
      <section>
        <h3 class="section-label" id="error-report-height-label">Actual height (estimate)</h3>
        <div class="height-box">
          <button
            type="button"
            class="height-field"
            bind:this={heightButton}
            aria-haspopup="dialog"
            aria-labelledby="error-report-height-label error-report-height-value"
            aria-describedby="error-report-height-comparison"
            onclick={() => { keypadOpen = true; }}
          >
            <span id="error-report-height-value" class:placeholder={!isValidHeight(actualHeightM)}>
              {isValidHeight(actualHeightM) ? `${actualHeightM} m` : 'Tap to enter'}
            </span>
          </button>
          <p id="error-report-height-comparison" class="height-comparison">
            <span>Registered: {obstacle.heightM} m</span>
            {#if isValidHeight(actualHeightM)}<strong>{describeHeightDifference(actualHeightM, obstacle.heightM)}</strong>{/if}
          </p>
        </div>
      </section>
    {/if}

    <section>
      <label class="section-label" for="error-report-description">Description ({descriptionRequired ? 'required' : 'optional'})</label>
      <div class="description-box">
        <textarea
          id="error-report-description"
          bind:this={descriptionField}
          class="form-control description-field"
          placeholder="Describe what is wrong…"
          required={descriptionRequired}
          bind:value={description}
          oninput={resizeDescription}
        ></textarea>
        <!-- Visual only until dictation is decided. -->
        <button type="button" class="mic-button" aria-label="Dictate description" title="Dictation is not available yet" disabled>
          <svg class="geometry-icon" viewBox="0 0 24 24" fill="none" aria-hidden="true"><MicIcon /></svg>
        </button>
      </div>
    </section>
  </div>

  <footer class="dialog-footer report-footer">
    <button type="button" class="button cancel" onclick={ondismiss}>Cancel</button>
    <button type="button" class="button finish" disabled={!valid} onclick={finish}>
      <svg class="geometry-icon" viewBox="0 0 24 24" fill="none" aria-hidden="true"><SendIcon /></svg>
      Finish report
    </button>
  </footer>
  </div>

  {#if keypadOpen && heightWrong}
    <ErrorHeightKeypad value={heightValue} registeredHeightM={obstacle.heightM}
      onconfirm={(value) => closeKeypad(value)} oncancel={() => closeKeypad()} />
  {/if}
</dialog>

<style>
  /* Layout mirrors ObstacleReportPanel; colours follow the error-report design tokens. */
  .report-panel {
    width: var(--report-panel-width);
    max-width: none;
    max-height: var(--error-report-panel-height);
    margin: auto;
    padding: 0;
    border: var(--border-default);
    overflow: hidden;
  }
  /* Header and footer stay put; only the content between them scrolls. */
  .report-shell {
    display: flex; flex-direction: column;
    max-height: calc(var(--error-report-panel-height) - 2 * var(--border-width-default));
  }
  .report-header, .report-footer { flex: none; }
  .report-content { flex: 1 1 auto; min-height: 0; overflow-y: auto; overscroll-behavior: contain; }
  .report-header { display: flex; align-items: flex-start; justify-content: space-between; gap: var(--space-3); border-bottom: var(--border-default); }
  .report-header h2 { margin: 0; font-size: var(--font-size-heading-small); }
  .report-subtitle { margin: var(--space-1) 0 0; color: var(--color-error-report-coordinates); font-size: var(--font-size-body-small); font-weight: var(--font-weight-semibold); font-variant-numeric: tabular-nums; }
  .report-content { display: flex; flex-direction: column; gap: var(--space-5); }
  .section-label { display: block; margin: 0 0 var(--space-2); font-size: var(--font-size-body-small); font-weight: var(--font-weight-semibold); color: var(--color-text-secondary); }
  .section-hint { margin: calc(-1 * var(--space-1)) 0 var(--space-2); color: var(--color-text-secondary); font-size: var(--font-size-caption); }

  .obstacle-card {
    display: flex; align-items: center; gap: var(--space-3);
    padding: var(--space-3); border: var(--border-default); border-radius: var(--radius-control);
    background: var(--color-background-subtle);
  }
  .obstacle-card p { margin: var(--space-1) 0 0; color: var(--color-text-secondary); font-size: var(--font-size-body-small); }
  .obstacle-icon {
    display: grid; flex: none; place-items: center;
    width: var(--control-height-large); height: var(--control-height-large);
    border: var(--border-default); border-radius: var(--radius-control);
    background: var(--color-background-raised); color: var(--color-text-primary);
  }

  .choice-grid {
    --choice-font-size: clamp(var(--font-size-body-small), 0.831rem + 0.188vw, var(--font-size-body));
    display: grid; grid-template-columns: repeat(2, 1fr); gap: var(--space-2);
  }
  .choice {
    display: flex; align-items: center; justify-content: center; gap: var(--space-2);
    min-height: var(--control-height-large); padding: var(--space-3);
    border: var(--border-default); border-radius: var(--radius-control);
    background: var(--color-background-subtle); color: var(--color-text-primary); cursor: pointer;
    font-size: var(--font-size-body-small); font-weight: var(--font-weight-medium);
    transition: background-color var(--duration-default) var(--ease-standard), border-color var(--duration-default) var(--ease-standard), color var(--duration-default) var(--ease-standard);
  }
  /* Fixed height fits icon, label and the lighting detail line, so selecting never resizes a choice. */
  .choice--stacked {
    flex-direction: column; gap: var(--space-1);
    height: calc(2 * var(--space-3) + 2 * var(--border-width-default) + var(--icon-size-large) + 2 * var(--space-1)
      + var(--line-height-body) * (var(--choice-font-size) + var(--font-size-body-small)));
  }
  .choice--stacked span { line-height: var(--line-height-body); }
  .choice--wide { grid-column: 1 / -1; min-height: var(--control-height-default); padding-block: var(--space-2); }
  /* Follows the button colour, so it adapts to the selected state. */
  .choice-detail { color: inherit; font-size: var(--font-size-body-small); font-weight: var(--font-weight-regular); }
  .choice:hover { background: var(--color-map-control-hover); }
  /* Same selected state as the Obstacle Type choices in ObstacleReportPanel. */
  .choice.selected {
    border-color: var(--color-action-secondary); background: var(--color-action-selected); color: var(--color-action-secondary);
  }

  .height-box {
    display: flex; flex-wrap: wrap; align-items: center; gap: var(--space-3) var(--space-4);
    padding: var(--space-3); border-radius: var(--radius-control);
    background: var(--color-error-report-highlight-surface); color: var(--color-error-report-on-highlight);
  }
  .height-field {
    flex: 0 1 12rem; min-height: var(--control-height-large); padding-inline: var(--space-4);
    border: var(--border-default); border-radius: var(--radius-control);
    background: var(--color-background-raised); color: var(--color-text-primary); cursor: pointer;
    font-size: var(--font-size-body); font-weight: var(--font-weight-semibold); font-variant-numeric: tabular-nums; text-align: start;
  }
  .height-field .placeholder { color: var(--color-text-secondary); font-weight: var(--font-weight-regular); }
  .height-comparison { display: flex; flex-direction: column; gap: var(--space-1); margin: 0; font-size: var(--font-size-body-small); }

  .description-box { position: relative; }
  .description-field {
    min-height: var(--error-report-description-height); padding-block: var(--space-3);
    padding-inline-end: calc(var(--target-size-min) + var(--space-4));
    background: var(--color-background-subtle); resize: none; overflow: hidden;
  }
  .mic-button {
    position: absolute; right: var(--space-2); bottom: var(--space-2);
    display: grid; place-items: center; width: var(--target-size-min); height: var(--target-size-min);
    border: var(--border-default); border-radius: var(--radius-round);
    background: var(--color-background-raised); color: var(--color-text-secondary);
  }
  .mic-button:disabled { cursor: not-allowed; opacity: var(--opacity-disabled); }

  .report-footer { display: flex; gap: var(--space-3); border-top: var(--border-default); }
  .report-footer .button { flex: 1; min-height: var(--report-button-height); border: 0; font-weight: var(--font-weight-semibold); }
  .cancel { background: var(--color-background-subtle); }
  .finish { background: var(--color-error-report-finish); color: var(--color-error-report-on-accent); }
  .finish:not(:disabled):hover, .finish:not(:disabled):active { background: var(--color-error-report-finish-hover); }
  .finish:disabled { background: var(--color-error-report-finish); color: var(--color-error-report-on-accent); opacity: var(--opacity-disabled); cursor: not-allowed; }

  .report-header, .report-footer { padding-block: clamp(var(--space-6), 1.324rem + 0.751vw, var(--space-8)); }
  .report-content { padding-block: clamp(var(--space-5), 1.162rem + 0.376vw, var(--space-6)) clamp(var(--space-6), 1.324rem + 0.751vw, var(--space-8)); gap: clamp(var(--space-5), 1.162rem + 0.376vw, var(--space-6)); }
  .report-header h2 { font-size: clamp(var(--font-size-heading-small), 1.162rem + 0.376vw, var(--font-size-heading)); }
  .section-label { font-size: clamp(var(--font-size-body-small), 0.831rem + 0.188vw, var(--font-size-body)); }
  .choice { font-size: var(--choice-font-size); }
</style>
