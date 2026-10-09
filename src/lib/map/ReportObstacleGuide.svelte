<script lang="ts">
  import { onMount, tick } from 'svelte';
  import StepSection from '../guide/StepSection.svelte';
  import ToolOptionCard from '../guide/ToolOptionCard.svelte';
  import GuideExample from '../guide/GuideExample.svelte';
  import GuideExampleMap from './GuideExampleMap.svelte';
  import { guideProgressStep } from './tutorial';

  let { onback, onclose }: { onback: () => void; onclose: () => void } = $props();

  const stepCount = 5;
  const progressSteps = Array.from({ length: stepCount }, (_, index) => index);
  let page: HTMLElement;
  let header: HTMLElement;
  let title: HTMLHeadingElement;
  let drawingTools: HTMLUListElement;
  let activeStep = $state(0);
  let frame = 0;

  // Reading progress only: it follows the scroll position and never changes a draft.
  function updateProgress() {
    frame = 0;
    const sections = page.querySelectorAll<HTMLElement>('[data-guide-step]');
    const threshold = header.getBoundingClientRect().bottom + page.clientHeight / 3;
    const atEnd = page.scrollTop + page.clientHeight >= page.scrollHeight - 1;
    activeStep = guideProgressStep([...sections].map((section) => section.getBoundingClientRect().top), threshold, atEnd);
  }

  function scheduleProgress() {
    if (!frame) frame = requestAnimationFrame(updateProgress);
  }

  function showDrawingTools() {
    drawingTools.scrollIntoView({ block: 'start' });
    drawingTools.focus({ preventScroll: true });
  }

  onMount(() => {
    // Browser Forward can close the modal drawer in this same update.
    void tick().then(() => title.focus({ preventScroll: true }));
    updateProgress();
    return () => cancelAnimationFrame(frame);
  });
</script>

<svelte:window onresize={scheduleProgress} />

<main class="guide-page" aria-label="How to report an obstacle" bind:this={page} onscroll={scheduleProgress}>
  <header class="guide-header" bind:this={header}>
    <div class="guide-header-row">
      <button class="faq-icon-button guide-icon-button" type="button" aria-label="Back" onclick={onback}>
        <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M21 12H5M12 5l-7 7 7 7" /></svg>
      </button>
      <span class="guide-header-title">How to report an obstacle</span>
      <button class="faq-icon-button guide-icon-button guide-close" type="button" aria-label="Close guide" onclick={onclose}>
        <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18" /></svg>
      </button>
    </div>
    <div class="guide-progress" role="progressbar" aria-label="Reading progress" aria-valuemin={1} aria-valuemax={stepCount}
      aria-valuenow={activeStep + 1} aria-valuetext={`Step ${activeStep + 1} of ${stepCount}`}>
      {#each progressSteps as index (index)}<span class:reached={index <= activeStep}></span>{/each}
    </div>
  </header>

  <div class="guide-content">
    <h1 bind:this={title} tabindex="-1">How to report an obstacle</h1>
    <p class="guide-intro">Follow these steps to report an obstacle accurately.</p>
    <div class="guide-notice" role="note">
      <svg viewBox="0 0 19.2 13.2" fill="none" aria-hidden="true"><path d="M1.1 6.1L7.1 12.1L18.1 1.1" /></svg>
      <div>
        <p><strong>Everything is saved as you go.</strong></p>
        <p>Each step is added to the same obstacle report draft automatically — you never need to save between steps.</p>
      </div>
    </div>

    <div class="guide-steps">
      <StepSection step="01" title="Place the obstacle on the map" id="guide-step-place">
        <p>The map opens at your current location and uses it as the starting point for the report.</p>
        <p>Tap the map where you want to place the obstacle. The drawing tools open around that spot — choose Point, Line or Area.</p>
        <ul class="guide-tools" bind:this={drawingTools} tabindex="-1" aria-label="Drawing tools">
          <li><ToolOptionCard kind="point" badge="P" title="Point" description="For obstacles represented by a single location. Tap once on the map to drop a marker at the obstacle’s exact location." /></li>
          <li><ToolOptionCard kind="line" badge="L" title="Line" description="For obstacles that extend along a route or have a linear shape, such as a power line. Tap to add each vertex, then tap Finish line when done." /></li>
          <li><ToolOptionCard kind="area" badge="A" title="Area" description="For obstacles that cover a larger surface. Tap to add the polygon’s corners, then tap Close area to complete the shape." /></li>
        </ul>
        <p class="guide-caption">You can cancel at any time during drawing and start over.</p>
        <p>Draw on the map, then finish the shape.</p>
        <p>Tap <strong>Complete selection</strong> and the obstacle report opens with the shape already attached.</p>
        <GuideExampleMap label="Example map: a Point obstacle placed beside a road" />
        <ol class="guide-checklist">
          <li>Check that the obstacle is positioned correctly on the map.</li>
          <li>Adjust the location if necessary.</li>
          <li>Continue when the position is correct.</li>
        </ol>
      </StepSection>

      <StepSection step="02" title="Obstacle details" id="guide-step-details">
        <p>Select the category that best describes the obstacle.</p>
        <GuideExample label="Example of the Obstacle Details form, step 1 of 2, with Bridge selected as the obstacle type">
          <div class="example-header"><span class="example-title">Obstacle Details</span><span class="example-count">Step 1 of 2</span></div>
          <div class="example-progress"><span class="reached"></span><span></span></div>
          <span class="example-label">OBSTACLE TYPE</span>
          <div class="example-types">
            <span class="selected">Bridge</span><span>Airspace</span><span>Pole</span><span>Building</span><span>Other</span>
          </div>
        </GuideExample>
        <p class="guide-tip"><strong>Tip:</strong> Select <strong>Other</strong> when none of the available categories accurately describe the obstacle.</p>
      </StepSection>

      <StepSection step="03" title="Height" id="guide-step-height">
        <p>Set the height on the same screen as the obstacle type.</p>
        <GuideExample label="Example of the height wheel set to 30 metres">
          <span class="example-label">HEIGHT</span>
          <div class="example-wheel">
            <span>29</span>
            <span class="example-wheel-selected"><strong>30</strong><span class="example-unit">m</span></span>
            <span>31</span>
          </div>
        </GuideExample>
        <p class="guide-definition"><strong>Height</strong> — the height of the obstacle above ground level, in metres (m). Scroll to the value that matches the obstacle.</p>
      </StepSection>

      <StepSection step="04" title="Illuminated" id="guide-step-illuminated">
        <p>Set the lighting status below Height on the same screen.</p>
        <GuideExample label="Example of the Illuminated control set to Unknown">
          <span class="example-label">ILLUMINATED</span>
          <span class="example-illumination">
            <svg viewBox="0 0 11.7 18.623" fill="none" aria-hidden="true">
              <path d="M2.85 13.773H8.85M3.85 17.773H7.85" />
              <path d="M8.95 9.77301C9.76492 9.12905 10.3591 8.2473 10.6499 7.25023C10.9408 6.25315 10.9139 5.19024 10.5731 4.20912C10.2322 3.22801 9.5943 2.37739 8.7479 1.77542C7.9015 1.17345 6.88864 0.85 5.85 0.85C4.81136 0.85 3.7985 1.17345 2.9521 1.77542C2.1057 2.37739 1.46777 3.22801 1.12692 4.20912C0.786061 5.19024 0.759201 6.25315 1.05007 7.25023C1.34093 8.2473 1.93508 9.12905 2.75 9.77301C3.35 10.273 3.85 10.973 3.85 11.773H7.85C7.85 10.973 8.35 10.273 8.95 9.77301Z" />
            </svg>
            Unknown
          </span>
        </GuideExample>
        <p class="guide-definition"><strong>Illuminated</strong> — whether the obstacle is lit. Select <strong>Unknown</strong> if you are not sure.</p>
      </StepSection>

      <StepSection step="05" title="Add description / Additional info" id="guide-step-description">
        <p>Use the description to add relevant information that is not already captured by the other fields.</p>
        <GuideExample label="Example of the Additional Information form, step 2 of 2, with an empty description field">
          <div class="example-header"><span class="example-title">Additional Information</span><span class="example-count">Step 2 of 2</span></div>
          <div class="example-progress"><span class="reached"></span><span class="reached"></span></div>
          <span class="example-label">DESCRIPTION</span>
          <span class="example-field">Additional information about the obstacle...</span>
        </GuideExample>
        <p>Help the person reviewing the report understand:</p>
        <ul class="guide-bullets">
          <li>What the obstacle is.</li>
          <li>Where it is located.</li>
          <li>Relevant size or characteristics.</li>
          <li>Important information about the surrounding area.</li>
        </ul>
        <p>Review the information and finish the report when everything is correct.</p>
        <GuideExample label="Example of the Finish Report button">
          <span class="example-finish">Finish Report</span>
        </GuideExample>
        <button class="guide-related" type="button" onclick={showDrawingTools}>
          <svg class="guide-related-icon" viewBox="0 0 36 36" fill="none" aria-hidden="true">
            <path d="M12 24L24 12" /><circle cx="13" cy="23" r="1.6" /><circle cx="23" cy="13" r="1.6" />
          </svg>
          <span class="guide-related-text">
            <strong>Drawing guide</strong>
            <span>Point, Line and Area in detail</span>
          </span>
          <svg class="guide-related-chevron" viewBox="0 0 9 16" fill="none" aria-hidden="true"><path d="M1 1L8 8L1 15" /></svg>
        </button>
      </StepSection>
    </div>
  </div>
</main>

<style>
  .guide-page {
    position: fixed;
    inset: 0;
    z-index: var(--layer-dialog);
    overflow-y: auto;
    overscroll-behavior: contain;
    /* Keeps in-page targets clear of the sticky app bar and its progress row. */
    scroll-padding-top: calc(var(--safe-area-top) + var(--faq-header-height) + var(--space-8) + var(--guide-progress-height) + var(--space-4));
    background: var(--color-background-raised);
    color: var(--color-text-primary);
  }
  p, h1 { margin: 0; }

  .guide-header {
    position: sticky;
    top: 0;
    z-index: var(--layer-popover);
    padding: var(--safe-area-top) max(var(--guide-header-gutter), var(--safe-area-right)) 0 max(var(--guide-header-gutter), var(--safe-area-left));
    border-bottom: var(--border-default);
    background: var(--color-background-raised);
  }
  .guide-header-row { display: flex; align-items: center; gap: var(--space-3); min-height: var(--faq-header-height); }
  .guide-header-title {
    flex: 1;
    min-width: 0;
    font-size: var(--guide-intro-size);
    font-weight: var(--guide-font-weight-strong);
    line-height: var(--line-height-tight);
  }
  .guide-icon-button svg { stroke: currentColor; stroke-width: var(--icon-stroke-width); stroke-linecap: round; stroke-linejoin: round; }
  .guide-close { background: var(--color-background-subtle); }
  .guide-progress { display: flex; gap: var(--guide-progress-gap); padding-block: var(--space-3) var(--space-4); }
  .guide-progress span { flex: 1; height: var(--guide-progress-height); border-radius: var(--radius-pill); background: var(--color-border-default); }
  .guide-progress span.reached { background: var(--color-text-primary); }

  .guide-content {
    width: 100%;
    max-width: calc(var(--guide-content-max) + 2 * var(--faq-gutter));
    margin-inline: auto;
    padding: var(--space-6) max(var(--faq-gutter), var(--safe-area-right)) max(var(--faq-content-bottom), var(--safe-area-bottom)) max(var(--faq-gutter), var(--safe-area-left));
    font-size: var(--font-size-body);
    line-height: var(--line-height-body);
    overflow-wrap: anywhere;
  }
  h1 { font-size: var(--guide-title-size); font-weight: var(--guide-font-weight-strong); line-height: var(--line-height-tight); }
  .guide-intro { margin-top: var(--space-3); color: var(--color-text-secondary); font-size: var(--guide-intro-size); }
  .guide-content p, .guide-content li { color: var(--color-text-secondary); }
  .guide-content strong { color: var(--color-text-primary); font-weight: var(--guide-font-weight-strong); }

  .guide-notice {
    display: flex;
    align-items: flex-start;
    gap: var(--space-4);
    margin-top: var(--space-6);
    padding: var(--space-5);
    border-radius: var(--radius-card);
    background: var(--color-status-success-surface);
    font-size: var(--font-size-body-small);
  }
  .guide-notice svg { flex: none; width: var(--icon-size-default); margin-top: var(--space-1); stroke: var(--color-status-success); stroke-width: 2.2; stroke-linecap: round; stroke-linejoin: round; }
  .guide-content .guide-notice p, .guide-content .guide-notice strong { color: var(--color-status-success); }

  .guide-steps { margin-top: var(--space-12); }
  .guide-tools, .guide-checklist, .guide-bullets { display: grid; margin: 0; padding: 0; list-style: none; }
  .guide-tools { gap: var(--space-3); margin-top: var(--space-2); border-radius: var(--radius-card); }
  .guide-tools:focus-visible { outline-offset: var(--space-1); }
  .guide-content .guide-caption { color: var(--color-text-secondary); font-size: var(--guide-caption-size); }

  .guide-checklist { gap: var(--space-3); counter-reset: guide-checklist; margin-top: var(--space-2); }
  .guide-checklist li { display: flex; align-items: flex-start; gap: var(--space-3); counter-increment: guide-checklist; }
  .guide-checklist li::before {
    content: counter(guide-checklist);
    display: grid;
    flex: none;
    place-items: center;
    width: var(--guide-number-size);
    height: var(--guide-number-size);
    margin-top: var(--space-1);
    border-radius: var(--radius-round);
    background: var(--color-background-subtle);
    color: var(--color-text-primary);
    font-size: var(--guide-eyebrow-size);
    font-weight: var(--guide-font-weight-strong);
  }
  .guide-bullets { gap: var(--space-2); padding-left: var(--space-1); }
  .guide-bullets li { display: flex; align-items: baseline; gap: var(--space-4); }
  .guide-bullets li::before {
    content: '';
    flex: none;
    width: var(--guide-bullet-size);
    height: var(--guide-bullet-size);
    border-radius: var(--radius-round);
    background: var(--color-border-strong);
    transform: translateY(-0.2em);
  }

  .guide-tip {
    padding: var(--space-4) var(--space-5);
    border-radius: var(--radius-control);
    background: var(--color-background-subtle);
    font-size: var(--font-size-body-small);
  }

  /* Static drawings of the report form, inside GuideExample. */
  .example-header { display: flex; align-items: baseline; justify-content: space-between; gap: var(--space-3); }
  .example-title { font-size: var(--guide-card-title-size); font-weight: var(--guide-font-weight-strong); }
  .example-count { color: var(--color-text-secondary); font-size: var(--guide-eyebrow-size); }
  .example-progress { display: flex; gap: var(--guide-progress-gap); }
  .example-progress span { flex: 1; height: var(--guide-progress-height); border-radius: var(--radius-pill); background: var(--color-border-default); }
  .example-progress span.reached { background: var(--color-text-primary); }
  .example-label {
    margin-top: var(--space-2);
    color: var(--color-text-secondary);
    font-size: var(--guide-label-size);
    font-weight: var(--guide-font-weight-strong);
    letter-spacing: var(--guide-label-tracking);
  }
  .example-header + .example-progress + .example-label { margin-top: var(--space-3); }
  .example-types { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: var(--space-2); }
  .example-types span {
    display: grid;
    place-items: center;
    min-height: var(--guide-option-height);
    border: var(--border-default);
    border-radius: var(--radius-control);
    font-size: var(--guide-card-title-size);
  }
  .example-types span.selected { border: var(--border-width-emphasis) solid var(--color-text-primary); font-weight: var(--guide-font-weight-strong); }

  .example-wheel {
    display: grid;
    justify-items: center;
    gap: var(--space-1);
    padding: var(--space-3);
    border-radius: var(--radius-control);
    background: var(--color-background-subtle);
    color: var(--color-text-disabled);
    font-size: var(--font-size-body-small);
  }
  .example-wheel-selected {
    position: relative;
    display: grid;
    place-items: center;
    width: 100%;
    min-height: var(--target-size-min);
    border-radius: var(--radius-small);
    background: var(--color-background-raised);
  }
  .example-wheel-selected strong { color: var(--color-text-primary); font-size: var(--font-size-heading-small); }
  .example-unit { position: absolute; right: var(--space-5); color: var(--color-text-secondary); font-size: var(--font-size-caption); }

  .example-illumination {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: var(--space-4);
    min-height: var(--control-height-default);
    border-radius: var(--radius-control);
    background: var(--color-background-subtle);
    color: var(--color-text-secondary);
    font-size: var(--font-size-body-small);
  }
  .example-illumination svg { width: var(--space-3); stroke: currentColor; stroke-width: 1.7; stroke-linecap: round; stroke-linejoin: round; }

  .example-field {
    min-height: var(--guide-description-height);
    padding: var(--space-3) var(--space-4);
    border: var(--border-default);
    border-radius: var(--radius-control);
    color: var(--color-text-disabled);
    font-size: var(--font-size-body-small);
  }

  .example-finish {
    display: grid;
    place-items: center;
    min-height: var(--control-height-default);
    border-radius: var(--radius-control);
    background: var(--details-action-background);
    color: var(--details-action-text);
    font-size: var(--guide-card-title-size);
    font-weight: var(--guide-font-weight-strong);
  }

  .guide-related {
    display: flex;
    align-items: center;
    gap: var(--space-4);
    width: 100%;
    min-height: var(--target-size-min);
    margin-top: var(--space-4);
    padding: var(--space-4) var(--space-5);
    border: var(--border-default);
    border-radius: var(--radius-card);
    background: var(--color-background-raised);
    color: var(--color-text-primary);
    text-align: left;
    cursor: pointer;
  }
  .guide-related:hover { background: var(--color-map-control-hover); }
  .guide-related:active { background: var(--color-background-subtle); }
  .guide-related-icon {
    flex: none;
    width: var(--guide-related-icon-size);
    height: var(--guide-related-icon-size);
    border-radius: var(--radius-round);
    background: var(--color-background-subtle);
    stroke: var(--color-text-secondary);
    stroke-width: 1.8;
    stroke-linecap: round;
  }
  .guide-related-text { display: grid; flex: 1; min-width: 0; gap: var(--space-1); line-height: var(--line-height-tight); }
  .guide-related-text strong { font-size: var(--guide-card-title-size); }
  .guide-related-text span { color: var(--color-text-secondary); font-size: var(--guide-caption-size); }
  .guide-related-chevron { flex: none; width: var(--space-2); stroke: var(--color-text-secondary); stroke-width: 2; stroke-linecap: round; stroke-linejoin: round; }
</style>
