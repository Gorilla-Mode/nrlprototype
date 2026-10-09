<script module lang="ts">
  export type ToolOptionKind = 'point' | 'line' | 'area';
</script>

<script lang="ts">
  interface Props {
    kind: ToolOptionKind;
    /** Single-letter badge beside the title, e.g. "P". */
    badge: string;
    title: string;
    description: string;
  }

  let { kind, badge, title, description }: Props = $props();
</script>

<!-- Describes a drawing tool; it is not itself a control, so it renders no button. -->
<article class="tool-option-card" aria-labelledby={`tool-option-${kind}`}>
  <span class="tool-option-badge" aria-hidden="true">{badge}</span>
  <div class="tool-option-text">
    <h3 id={`tool-option-${kind}`}>{title}</h3>
    <p>{description}</p>
  </div>
  <svg class="tool-option-diagram" viewBox="0 0 76 56" fill="none" aria-hidden="true">
    {#if kind === 'point'}
      <path class="diagram-fill" d="M38 10C31.2 10 25.7 15.5 25.7 22.3C25.7 31.5 38 43.7 38 43.7C38 43.7 50.3 31.5 50.3 22.3C50.3 15.5 44.8 10 38 10Z" />
      <circle class="diagram-node-fill" cx="38" cy="22" r="4" />
    {:else if kind === 'line'}
      <path class="diagram-stroke diagram-path" d="M17 39L31 22L45 32L61 13" />
      {#each [[17, 39], [31, 22], [45, 32], [61, 13]] as [cx, cy] (`${cx}-${cy}`)}
        <circle class="diagram-node" {cx} {cy} r="3.8" />
      {/each}
    {:else}
      <path class="diagram-stroke diagram-area" d="M17 37L26 11L53 15L62 39L37 48L17 37Z" />
      {#each [[17, 37], [26, 11], [53, 15], [62, 39], [37, 48]] as [cx, cy] (`${cx}-${cy}`)}
        <circle class="diagram-node" {cx} {cy} r="3.5" />
      {/each}
    {/if}
  </svg>
</article>

<style>
  .tool-option-card {
    display: grid;
    grid-template-columns: var(--guide-badge-size) minmax(0, 1fr) auto;
    align-items: start;
    gap: var(--space-4);
    padding: var(--space-4);
    border: var(--border-default);
    border-radius: var(--radius-card);
    background: var(--color-background-raised);
  }
  .tool-option-badge {
    display: grid;
    place-items: center;
    width: var(--guide-badge-size);
    height: var(--guide-badge-size);
    border-radius: var(--radius-round);
    background: var(--color-status-info-surface);
    color: var(--color-action-secondary);
    font-size: var(--guide-caption-size);
    font-weight: var(--guide-font-weight-strong);
  }
  .tool-option-text { display: grid; gap: var(--space-2); min-width: 0; }
  h3 { margin: 0; font-size: var(--guide-card-title-size); font-weight: var(--guide-font-weight-strong); line-height: var(--line-height-tight); }
  p { margin: 0; color: var(--color-text-secondary); font-size: var(--guide-card-text-size); line-height: var(--line-height-relaxed); }
  .tool-option-diagram {
    width: var(--guide-diagram-width);
    height: var(--guide-diagram-height);
    border-radius: var(--radius-control);
    background: var(--color-background-subtle);
  }
  .diagram-fill { fill: var(--color-map-line); }
  .diagram-node-fill { fill: var(--color-drawing-casing); }
  .diagram-stroke { stroke: var(--color-map-line); stroke-width: 2; stroke-linejoin: round; }
  .diagram-path { stroke-width: 2.4; stroke-linecap: round; }
  .diagram-area { fill: var(--guide-diagram-area-fill); }
  .diagram-node { fill: var(--color-drawing-casing); stroke: var(--color-map-line); stroke-width: 2; }

  /* Phones: the diagram moves under the text so descriptions keep a readable measure. */
  @media (max-width: 30rem) {
    .tool-option-card { grid-template-columns: var(--guide-badge-size) minmax(0, 1fr); }
    .tool-option-diagram { grid-column: 2; }
  }
</style>
