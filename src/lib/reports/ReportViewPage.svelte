<script lang="ts">
  import { tick, untrack } from 'svelte';
  import LocationEditor from '../map/LocationEditor.svelte';
  import PageHeader from '../components/PageHeader.svelte';
  import StatusBadge from './StatusBadge.svelte';
  import MiniMap from '../map/MiniMap.svelte';
  import PhotoField from './PhotoField.svelte';
  import { formatHeightFromMeters, lightingValueLabel } from '../drafts/types';
  import { obstacleTypeLabel } from '../reporting/obstacle';
  import { describeLightingCorrection, errorKindsLabel, errorReportHeading, isValidHeight, type ErrorReportRecord } from '../obstacles/errorReport';
  import { describeMoveFromRegistered } from '../obstacles/position';
  import { coordinateLabel, geometryCameraTarget, type GeometryCameraTarget, type ReportGeometry } from './reportGeometry';
  import { lastEditedLabel, reportPageTitle, type Report } from './reportsData';
  import { reportStore } from './reportStore';
  import { deliverErrorReport } from './errorReportRecords';
  import type { ReportPhoto } from './photos';

  /**
   * The read-only page for a Ready to send report (#/reports/{id}): the edit page's layout and
   * styles without inputs. Edit report opens #/reports/{id}/edit; Send for Review sends it.
   * An error report (record) uses the same page and cards; only the cards' content differs.
   */
  let { report, record, onback, onedit, onsent, onshowonmap }: {
    /** The stored report, kept current, so returning from the edit page shows the edits. */
    report: Report;
    /** Set for an error report: what is wrong, the registered obstacle and reported corrections. */
    record?: ErrorReportRecord;
    onback: () => void;
    onedit: (id: string) => void;
    /** After sending: the page leaves and the list shows the sent confirmation. */
    onsent: (sent: Report) => void;
    /** Show on map: the main map, zoomed in on the report. */
    onshowonmap?: (target: GeometryCameraTarget) => void;
  } = $props();

  let title = $derived(record ? errorReportHeading(record) : report.name || reportPageTitle(report));
  let description = $derived(report.pilotReportText.trim());

  // Error reports: only what was reported, and the registered position beside a moved one.
  let answers = $derived(record?.answers);
  let heightReported = $derived(!!answers?.errorKinds.includes('wrong-height') && isValidHeight(answers.actualHeightM));
  let lightingReported = $derived(!!answers?.errorKinds.includes('wrong-lighting'));
  let moved = $derived(answers?.errorKinds.includes('wrong-position') && answers.correctedPosition ? answers.correctedPosition : null);
  let registered = $derived(record && moved ? { lat: record.obstacle.lat, lng: record.obstacle.lng } : null);
  let locationCaption = $derived(record && moved ? `${describeMoveFromRegistered(record.obstacle, moved)} · ${coordinateLabel(report.geometry)}` : undefined);

  // An error report's Add photo saves at once: this page has no working copy.
  let photos = $state<ReportPhoto[]>(untrack(() => [...report.photos]));
  $effect(() => {
    const next = photos;
    const current = untrack(() => report);
    if (!untrack(() => record)) return;
    if (next.length !== current.photos.length || next.some((photo, index) => photo.id !== current.photos[index]?.id)) {
      reportStore.updateReport({ ...current, photos: [...next] });
    }
  });

  // Edit location, as Ready reports always had it: the location editor opens over the page; the
  // map also opens it. This page has no working copy, so the new location is stored at once.
  let editingLocation = $state(false);
  let editLocationButton = $state<HTMLButtonElement>();

  async function closeLocationEditor() {
    editingLocation = false;
    await tick();
    editLocationButton?.focus({ preventScroll: true });
  }

  function useLocation(geometry: ReportGeometry) {
    if (!record) {
      reportStore.updateReport({ ...report, geometry });
    } else if (geometry.type === 'Point') {
      // An error report's location is a point: the reported (corrected) position.
      const [lng, lat] = geometry.coordinates;
      const kinds = record.answers.errorKinds;
      const errorKinds = kinds.includes('wrong-position')
        ? [...kinds]
        : [...kinds.filter((kind) => kind !== 'does-not-exist'), 'wrong-position' as const];
      const errorReport: ErrorReportRecord = { obstacle: record.obstacle, answers: { ...record.answers, errorKinds, correctedPosition: { lat, lng } } };
      reportStore.updateReport({ ...report, geometry, errorReport });
    }
    void closeLocationEditor();
  }

  function sendForReview() {
    const sent = reportStore.submitReport(report.id);
    if (!sent) return;
    if (record) deliverErrorReport(sent);
    onsent(sent);
  }
</script>

<section class="page">
  {#snippet statusTag()}<StatusBadge status={report.status} />{/snippet}
  <PageHeader {title} backLabel="Back to Reports" {onback} actions={statusTag} />

  <div class="scroll-area">
    <div class="safe-area">
      <!-- Who reported it and when, from the report itself: at the top of the content, above the cards. -->
      <p class="report-meta">
        Reported by {report.reportedByName}, {report.reportedByOrg}
        · Last edited <time datetime={report.updatedAt}>{lastEditedLabel(report.updatedAt)}</time>
      </p>
      <!-- Label and value pairs, read-only: the edit page's three cards. -->
      <dl class="fields-row">
        {#if record && answers}
          <div class="field-box">
            <dt class="input-label">What is wrong</dt>
            <dd class="field-value">{errorKindsLabel(answers.errorKinds)}</dd>
          </div>
          <div class="field-box">
            <dt class="input-label">Registered obstacle</dt>
            <dd class="field-value">{record.obstacle.type} · {record.obstacle.heightM} m · ID {record.obstacle.id}</dd>
          </div>
          {#if heightReported}
            <div class="field-box">
              <dt class="input-label">Actual height</dt>
              <dd class="field-value">{answers.actualHeightM} m (registered {record.obstacle.heightM} m)</dd>
            </div>
          {/if}
          {#if lightingReported}
            <div class="field-box">
              <dt class="input-label">Lighting</dt>
              <dd class="field-value">{describeLightingCorrection(record.obstacle.lit)}</dd>
            </div>
          {/if}
        {:else}
          <div class="field-box">
            <dt class="input-label">Obstacle type</dt>
            <dd class="field-value">{obstacleTypeLabel(report.obstacleType)}</dd>
          </div>
          <div class="field-box">
            <dt class="input-label">Height above ground</dt>
            <dd class="field-value">{formatHeightFromMeters(report.heightMeters)}</dd>
            <dd class="field-help">Above ground, at the highest point</dd>
          </div>
          <div class="field-box">
            <dt class="input-label">Lighting</dt>
            <dd class="field-value">{lightingValueLabel(report.lighting)}</dd>
          </div>
        {/if}
      </dl>

      <section class="info-card" aria-labelledby="view-description-heading">
        <h2 class="section-heading" id="view-description-heading">Description and photo</h2>
        <hr class="divider" />
        {#if record}
          <!-- Error reports keep Add photo here, saved at once. -->
          {#if description}<p class="description">{description}</p>{:else}<p class="muted empty">No description added</p>{/if}
          <div class="photo-row with-text">
            <PhotoField bind:photos editable={true} label={title} showOptional={false} />
          </div>
        {:else}
          {#if description}<p class="description">{description}</p>{/if}
          {#if report.photos.length}
            <div class="photo-row" class:with-text={!!description}>
              <PhotoField photos={report.photos} editable={false} label={title} />
            </div>
          {/if}
          {#if !description && !report.photos.length}<p class="muted empty">No description or photo added</p>{/if}
        {/if}
      </section>

      <section class="location-panel panel" aria-labelledby="view-location-heading">
        <div class="location-heading">
          <h2 class="section-heading" id="view-location-heading">Location</h2>
          {#if report.geometry}
            {@const geometry = report.geometry}
            <div class="location-actions">
              {#if onshowonmap}<button type="button" class="card-cta-link location-action" onclick={() => onshowonmap(geometryCameraTarget(geometry))}>Show on map</button>{/if}
              <button type="button" class="card-cta-link location-action" bind:this={editLocationButton} onclick={() => { editingLocation = true; }}>Edit location</button>
            </div>
          {/if}
        </div>
        <!-- The shared report map: 16:9, its own caption; pressing it edits the location, as before.
             An error report adds the registered position and how far the report moves it. -->
        <MiniMap geometry={report.geometry} label={title} {registered} caption={locationCaption}
          onedit={report.geometry ? () => { editingLocation = true; } : undefined} />
      </section>
    </div>
  </div>

  <footer class="bottom-bar">
    <div class="actions">
      <button type="button" class="ds-button" data-variant="secondary" data-color="neutral" onclick={() => onedit(report.id)}>Edit report</button>
      <!-- The note belongs to Send: right-aligned beside it, above it when narrow. -->
      <div class="send-group">
        <div class="send-note" id="view-send-note">
          <div class="note-strong">Goes straight to the NRL reviewer</div>
          <div class="muted">You cannot edit the report after sending</div>
        </div>
        <button type="button" class="ds-button" data-variant="primary" data-color="brand1" aria-describedby="view-send-note" onclick={sendForReview}>
          <span class="paper-plane" aria-hidden="true">➤</span> Send for Review
        </button>
      </div>
    </div>
  </footer>
  {#if editingLocation && report.geometry}
    <LocationEditor geometry={report.geometry} onuse={useLocation} oncancel={closeLocationEditor} pointOnly={!!record} />
  {/if}
</section>

<style>
  /* The edit page's layout and styles (DraftDetailPage), read-only. */
  .page {
    position: fixed; inset: 0; z-index: var(--layer-dialog);
    display: flex; flex-direction: column;
    background: var(--color-background-page);
  }
  .muted { color: var(--color-text-secondary); }

  /* The bar sits below the scroll area, never over it. */
  .scroll-area { flex: 1; overflow-y: auto; overscroll-behavior: contain; scroll-padding-block: var(--space-6); }
  /* At least the scroll area's height, so the location card can take the room left above the bar. */
  .safe-area {
    display: flex; flex-direction: column; min-height: 100%; width: 100%;
    max-width: calc(var(--page-content-max) + 2 * var(--page-gutter)); margin: 0 auto; box-sizing: border-box;
    padding: var(--page-content-top) max(var(--page-gutter), var(--safe-area-right)) var(--space-8) max(var(--page-gutter), var(--safe-area-left));
  }
  .safe-area > * { flex: none; }

  /* Type, height and lighting in one row; stacked on phones. */
  .fields-row { display: grid; grid-template-columns: minmax(0, 1fr); gap: 14px; margin: 0 0 16px; }
  @media (min-width: 37.5rem) { .fields-row { grid-template-columns: repeat(3, minmax(0, 1fr)); } }
  .field-box { min-width: 0; overflow-wrap: anywhere; border: var(--border-default); border-radius: var(--radius-card); padding: 14px; background: var(--color-background-raised); }
  .input-label { display: block; margin-bottom: var(--space-2); font-size: var(--font-size-body); font-weight: var(--font-weight-semibold); color: var(--color-text-primary); }
  .field-box dd { margin: 0; }
  .field-value { font-size: var(--font-size-body); font-weight: var(--font-weight-regular); color: var(--color-text-primary); }
  .field-box .field-help { margin-top: var(--space-2); font-size: var(--font-size-body-small); color: var(--color-text-secondary); }

  .info-card { border: var(--border-default); border-radius: var(--radius-card); padding: 16px; margin-bottom: 24px; background: var(--color-background-raised); }
  .section-heading { margin: 0; font-size: var(--font-size-heading-small); font-weight: var(--font-weight-semibold); line-height: var(--line-height-tight); color: var(--color-text-primary); }
  .divider { border: 0; height: 1px; background: var(--color-border-default); margin: 8px 0 16px; }
  .description { margin: 0; color: var(--color-text-primary); line-height: var(--line-height-body); white-space: pre-line; overflow-wrap: anywhere; }
  .photo-row.with-text { margin-top: var(--space-4); }
  .empty { margin: 0; }

  .panel { border: var(--border-default); border-radius: var(--radius-card); padding: 14px; background: var(--color-background-raised); }
  .location-panel { margin-bottom: var(--space-4); }
  .location-heading { display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: var(--space-2); }
  .location-actions { display: flex; flex-wrap: wrap; gap: 0 var(--space-4); }
  /* As Edit location on the edit page: a 44 px text button beside the heading. */
  .location-action { min-height: var(--target-size-min); margin-block: calc(-1 * var(--space-3)); padding: 0; border: 0; background: none; font-size: var(--font-size-body-small); cursor: pointer; }

  /* At the top of the content, lined up with the cards, a little space above them. */
  .report-meta { margin: 0 0 var(--space-4); color: var(--color-text-secondary); font-size: var(--font-size-body-small); overflow-wrap: anywhere; }

  .bottom-bar { flex-shrink: 0; background: var(--color-background-raised); border-top: var(--border-default); }
  .actions {
    width: 100%; max-width: calc(var(--page-content-max) + 2 * var(--page-gutter)); margin: 0 auto; box-sizing: border-box;
    padding: var(--space-4) max(var(--page-gutter), var(--safe-area-right)) max(var(--space-4), var(--safe-area-bottom)) max(var(--page-gutter), var(--safe-area-left));
    display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: var(--space-3) var(--space-4);
  }
  .paper-plane { transform: rotate(45deg); display: inline-block; }
  .send-group { display: flex; align-items: center; justify-content: flex-end; flex-wrap: wrap; gap: var(--space-2) var(--space-4); margin-left: auto; }
  .send-note { text-align: right; font-size: 12px; }
  .note-strong { font-weight: 700; color: var(--color-text-primary); }
  .bottom-bar .ds-button, .photo-row :global(button) { min-height: var(--target-size-min); }
</style>
