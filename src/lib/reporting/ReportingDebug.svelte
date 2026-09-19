<script lang="ts">
  import type { ReportingVariant } from './reporting';
  let { variants, selectedId, onchange }: {
    variants: readonly ReportingVariant[];
    selectedId: string;
    onchange: (id: string) => void;
  } = $props();
</script>

<section class="menu-section reporting-debug" aria-labelledby="reporting-debug-heading">
  <h3 id="reporting-debug-heading">DEBUG</h3>
  <label for="reporting-variant">Reporting process</label>
  <select id="reporting-variant" class="form-control" value={selectedId}
    aria-describedby="reporting-variant-help" onchange={(event) => onchange(event.currentTarget.value)}>
    {#each variants as variant (variant.id)}<option value={variant.id}>{variant.label}</option>{/each}
  </select>
  <p id="reporting-variant-help">Switching reloads the page and clears the current drawing, draft and map view. The current URL can be shared.</p>
</section>

<style>
  .reporting-debug { display: flex; flex-direction: column; gap: var(--space-2); }
  label { color: var(--color-text-primary); font-weight: var(--font-weight-medium); }
  select { width: 100%; min-height: var(--target-size-min); }
  p { margin: 0; font-size: var(--font-size-body-small); color: var(--color-text-secondary); line-height: var(--line-height-body); }
</style>
