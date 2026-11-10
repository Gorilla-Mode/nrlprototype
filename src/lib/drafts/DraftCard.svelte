<script lang="ts">
  import StatusBadge from '../reports/StatusBadge.svelte';
  import type { Draft } from './types';
  import { draftType, heightInMeters, missingDraftFields } from './types';
  import { editedText, formatShortDate, obstacleHeading } from '../reports/reportsData';
  import { geometryKind } from '../reports/reportGeometry';
  import { placeLabel } from '../reports/placeName';
  import PinIcon from '../icons/PinIcon.svelte';
  import { errorKindsLabel, errorReportHeading } from '../obstacles/errorReport';

  export let draft: Draft;
  export let onEdit: (draft: Draft) => void = () => {};
  /** Drafts cannot be sent from select mode, so they are dimmed and do nothing there. */
  export let selectMode = false;
  /** Briefly marks the draft the reporting flow just saved. */
  export let justSaved = false;
  /** Id of the page's text explaining why a card cannot be selected. */
  export let unavailableHint: string | undefined = undefined;

  const open = () => { if (!selectMode) onEdit(draft); };
  $: type = draftType(draft);
  // The stored place name for this location, or its coordinates.
  $: place = placeLabel(draft.place, draft.geometry) ?? 'Location not set';
  // Geometry, then what keeps it from Ready to send: the same check as saving.
  $: missing = missingDraftFields(draft);
  $: detail = [geometryKind(draft.geometry), missing.length ? `Missing: ${missing.join(', ')}` : null].filter(Boolean).join(' · ');
</script>

<button type="button" class="ds-card reports-card" class:reports-card-dimmed={selectMode} class:reports-card-just-saved={justSaved} on:click={open}
  aria-disabled={selectMode ? true : undefined} aria-describedby={selectMode ? unavailableHint : undefined}>
  <div class="reports-card-main">
    <div class="reports-card-top">
      {#if draft.errorReport}
        <span class="reports-card-name">{errorReportHeading(draft.errorReport)}</span>
      {:else if type === null}
        <!-- No type chosen: never shown as Other, which is a real choice. -->
        {@const meters = heightInMeters(draft.heightAboveGround)}
        <span class="reports-card-name"><span class="reports-card-untitled">Untitled obstacle</span>{#if meters !== null && meters > 0}{' · '}{meters}&nbsp;m{/if}</span>
      {:else}
        <span class="reports-card-name">{obstacleHeading(type, heightInMeters(draft.heightAboveGround))}</span>
      {/if}
      <StatusBadge status="draft" />
    </div>

    <!-- The optional name; empty when the pilot gave none. -->
    <div class="reports-card-place"><svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><PinIcon /></svg><span>{place}</span></div>
    {#if detail}<div class="reports-card-step">{detail}{#if draft.errorReport}{' · '}{errorKindsLabel(draft.errorReport.answers.errorKinds)}{/if}</div>{/if}
  </div>

  <div class="reports-card-bottom">
    <span class="reports-card-meta">
      <time datetime={draft.updatedAt} title={formatShortDate(draft.updatedAt)}>{editedText(draft.updatedAt)}</time>
    </span>
    {#if !selectMode}
      <span class="reports-card-cta card-cta-link">
        Edit draft
        <svg viewBox="0 0 9 16" fill="none" aria-hidden="true"><path d="M1.5 1.5 7.5 8l-6 6.5" /></svg>
      </span>
    {/if}
  </div>
</button>
