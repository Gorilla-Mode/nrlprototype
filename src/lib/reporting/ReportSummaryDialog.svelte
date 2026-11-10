<script module lang="ts">
  /** One summary row; rows without `edit` have no pencil. */
  export interface SummaryRow {
    key: string;
    label: string;
    value: string;
    edit?: { onclick: () => void; /** Set when the pencil opens a dialog, e.g. the location editor. */ haspopup?: 'dialog' };
  }
</script>

<script lang="ts">
  import type { Snippet } from 'svelte';
  import Dialog from '../components/Dialog.svelte';

  let { title, rows, oncontinue, onsend, onclose, children }: {
    title: string;
    rows: readonly SummaryRow[];
    /** Save and continue: the report stays saved, not sent. */
    oncontinue: () => void;
    /** Sends the saved report for review. */
    onsend: () => void;
    /** X and Escape: back to the map; the report stays saved. */
    onclose: () => void;
    /** Shown over the summary, e.g. the location editor. */
    children?: Snippet;
  } = $props();
  let table = $state<HTMLTableElement>();

  /** Returns focus to a row's pencil, e.g. after an editor opened from it closes. */
  export function focusEdit(key: string) {
    table?.querySelector<HTMLElement>(`[data-summary-row="${CSS.escape(key)}"] .summary-edit`)?.focus({ preventScroll: true });
  }
</script>

{#snippet pencil()}
  <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M4 20h4L19 9l-4-4L4 16v4ZM13.5 6.5l4 4" /></svg>
{/snippet}

{#snippet subtitle()}
  <p>Your report is saved and ready to send. You can send it now, or continue and finish it later.</p>
{/snippet}

{#snippet saveAndContinue()}
  <button type="button" class="ds-button summary-action" data-variant="primary" onclick={oncontinue}>Save and continue</button>
{/snippet}

{#snippet sendReport()}
  <button type="button" class="ds-button dialog-action-secondary summary-action" data-variant="tertiary" data-color="brand1" onclick={onsend}>Send report</button>
{/snippet}

<Dialog {title} {subtitle} primary={saveAndContinue} secondary={sendReport} stackedActions {onclose}>
  <table class="summary-table" bind:this={table}>
    <tbody>
      {#each rows as row (row.key)}
        <tr data-summary-row={row.key}>
          <th scope="row">{row.label}</th>
          <td>{row.value}</td>
          <td class="summary-edit-cell">
            {#if row.edit}
              {@const edit = row.edit}
              <button type="button" class="summary-edit" aria-label={`Edit ${row.label.toLowerCase()}`} aria-haspopup={edit.haspopup}
                onclick={edit.onclick}>{@render pencil()}</button>
            {/if}
          </td>
        </tr>
      {/each}
    </tbody>
  </table>
  {@render children?.()}
</Dialog>

<style>
  .summary-table { width: 100%; border-collapse: collapse; }
  .summary-table tr + tr { border-top: var(--border-default); }
  .summary-table th, .summary-table td { padding: var(--space-1) 0; text-align: left; font-weight: var(--font-weight-regular); vertical-align: middle; }
  .summary-table th { width: 40%; padding-right: var(--space-3); color: var(--color-text-secondary); font-weight: var(--font-weight-medium); }
  .summary-table td { color: var(--color-text-primary); overflow-wrap: anywhere; }
  .summary-table .summary-edit-cell { width: var(--target-size-min); padding-left: var(--space-2); }
  /* Large, full-width targets: the dialog is used in flight. */
  .summary-action { min-height: var(--control-height-large); }
  .summary-edit {
    display: grid; place-items: center;
    width: var(--target-size-min); height: var(--target-size-min); padding: 0;
    border: 0; border-radius: var(--radius-round); background: transparent;
    color: var(--color-action-secondary); cursor: pointer;
  }
  .summary-edit:hover { background: var(--color-map-control-hover); }
  .summary-edit svg {
    width: var(--icon-size-default); height: var(--icon-size-default);
    stroke: currentColor; stroke-width: var(--icon-stroke-width); stroke-linecap: round; stroke-linejoin: round;
  }
</style>
