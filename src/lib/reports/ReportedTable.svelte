<script lang="ts">
  import type { ReportedChange, ReportedField } from './sentReport';

  /**
   * The report detail page's reported data as a table: "Reported obstacle" (Field | Reported) or
   * "Reported change(s)" (Field | In NRL today | Reported). Styled by .reported-table in stylesheet.css.
   */
  let { id, heading, rows, withCurrent }: {
    /** Id of the heading, which names the card. */
    id: string;
    heading: string;
    rows: readonly (ReportedField & Partial<ReportedChange>)[];
    /** Error reports: the registered value beside the reported one. */
    withCurrent: boolean;
  } = $props();
</script>

<section class="report-detail-card" aria-labelledby={id}>
  <h2 class="report-detail-card-heading" {id}>{heading}</h2>
  <table class="reported-table">
    <thead>
      <tr><th scope="col" class="reported-field">Field</th>{#if withCurrent}<th scope="col">In NRL today</th>{/if}<th scope="col">Reported</th></tr>
    </thead>
    <tbody>
      {#each rows as row (row.field)}
        <tr>
          <th scope="row">{row.field}</th>
          {#if withCurrent}<td class="current">{#if row.struck}<s>{row.current}</s>{:else}{row.current}{/if}</td>{/if}
          <td class="reported"><strong>{row.reported}</strong>{#if row.note}<span class="reported-note">{row.note}</span>{/if}</td>
        </tr>
      {/each}
    </tbody>
  </table>
</section>
