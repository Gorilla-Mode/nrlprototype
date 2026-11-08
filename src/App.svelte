<script lang="ts">
  import { onMount, tick } from 'svelte';
  import { placementEditingSettings, placementEditingVariantUrl } from './lib/map/placementEditing';
  import { userTestEnabled } from './lib/usertest/userTestSettings';
  import HomeMap from './lib/map/HomeMap.svelte';
  import FaqPage from './lib/faq/FaqPage.svelte';
  import ReportsPage from './lib/reports/ReportsPage.svelte';
  import NotificationsPage from './lib/notifications/NotificationsPage.svelte';
  import SettingsPage from './lib/settings/SettingsPage.svelte';
  import { settingsSectionFromHash, type SettingsSection, type LanguagePreference } from './lib/settings/settings';
  import { canonicalReportsHash, isReportsHash, reportEditIdFromHash, reportEditRoute, reportsRoute } from './lib/reports/reports';
  import { isNotificationsHash, markAllRead, notificationsRoute, sampleNotifications, type ReportStatusNotification } from './lib/notifications/notifications';
  import type { GeolocationState } from './lib/map/createGeolocationController';
  import type { CameraTarget } from './lib/map/createMapController';
  import { reportingGuideRoute } from './lib/map/tutorial';
  import ReportObstacleGuide from './lib/map/ReportObstacleGuide.svelte';
  import { createDetailsController, initialDetailsState, missingDetailsFields, type DetailsHooks, type DetailsState } from './lib/reporting/createDetailsController';
  import { reportingSettings, reportingVariantUrl, resolveReportingRoute, summaryRoute } from './lib/reporting/reporting';
  import { reportingVariants } from './lib/reporting/reportingVariants';
  import ReportingDebug from './lib/reporting/ReportingDebug.svelte';
  import ObstacleReportSummary from './lib/reporting/ObstacleReportSummary.svelte';
  import ReportSummaryDialog, { type SummaryRow } from './lib/reporting/ReportSummaryDialog.svelte';
  import { errorReportRows, type ErrorReportRecord } from './lib/obstacles/errorReport';
  import { deliverErrorReport, errorReportToDraft, errorReportToReport } from './lib/reports/errorReportRecords';
  import StatusBadge from './lib/reports/StatusBadge.svelte';
  import Dialog from './lib/components/Dialog.svelte';
  import ConfirmationToast, { type ConfirmationNotice } from './lib/components/ConfirmationToast.svelte';
  import type { StatusTabKey } from './lib/reports/reportsData';
  import type { Obstacle } from './lib/reporting/obstacle';
  import type { CompleteReport, DetailsPayload } from './lib/reporting/createDetailsController';
  import { reportStore } from './lib/reports/reportStore';
  import { detailsToDraft, detailsToReport } from './lib/reports/detailsReport';
  import { downscalePhoto, type ReportPhoto } from './lib/reports/photos';
  import { startPlaceNames } from './lib/reports/placeNames';

  let { onSaveDraft, onContinue, onFinish }: DetailsHooks = $props();
  let details = $state.raw<DetailsState>(initialDetailsState);
  const detailsController = createDetailsController({
    onChange: (state) => { details = state; },
    // Saved drafts and finished reports go to the report store; optional integrations are awaited after.
    getHooks: () => ({
      onSaveDraft: async (payload, reason) => { await storeDraft(payload); await onSaveDraft?.(payload, reason); },
      onContinue,
      onFinish: async (payload, context) => { await storeReady(payload); await onFinish?.(payload, context); },
    }),
  });

  // Each attached file is downscaled once, however often the draft is saved.
  const reportPhotoCache = new WeakMap<File, Promise<ReportPhoto>>();
  async function reportPhotos(files: readonly File[]): Promise<ReportPhoto[]> {
    const results = await Promise.allSettled(files.map((file) => {
      let photo = reportPhotoCache.get(file);
      if (!photo) reportPhotoCache.set(file, photo = downscalePhoto(file));
      return photo;
    }));
    return results.flatMap((result) => (result.status === 'fulfilled' ? [result.value] : []));
  }

  function storedRecord(id: string) {
    const { drafts, reports } = reportStore.getState();
    const draft = drafts.find((item) => item.id === id);
    if (draft) return { name: draft.title, createdAt: draft.createdAt };
    const report = reports.find((item) => item.id === id);
    return report && { name: report.name, createdAt: report.createdAt };
  }

  async function storeDraft(payload: DetailsPayload) {
    const { step, variant } = detailsController.getState();
    const draft = detailsToDraft(payload, { step, totalSteps: variant?.stepRoutes.length ?? 1, photos: await reportPhotos(payload.photos), existing: storedRecord(payload.id) });
    if (!reportStore.saveDraft(draft)) throw new Error('This report has already been sent.');
  }

  async function storeReady(payload: CompleteReport) {
    const report = detailsToReport(payload, { photos: await reportPhotos(payload.photos), existing: storedRecord(payload.id) });
    if (!reportStore.markReady(report)) throw new Error('This report has already been sent.');
  }
  let returnFocus: HTMLElement | null = null;
  let hash = $state(typeof window !== 'undefined' ? window.location.hash : '');
  let search = $state(typeof window !== 'undefined' ? window.location.search : '');
  let reporting = $derived(reportingSettings(search, reportingVariants));
  let placementEditing = $derived(placementEditingSettings(search));
  let userTest = $derived(userTestEnabled(search));
  let guideOpen = $derived(hash === reportingGuideRoute);
  let ActiveReportingView = $derived(reportingVariants.find(({ id }) => id === details.variant?.id)?.component);
  let faqOpen = $derived(hash === '#/FAQ');
  // #/reports/{id}/edit: the Reports page with that draft's or Ready report's edit page open.
  let reportEditId = $derived(reportEditIdFromHash(hash));
  let reportsOpen = $derived(isReportsHash(hash) || reportEditId !== null);
  // Unsaved edits on the edit page, and the question asked before leaving them.
  let editDirty = $state(false);
  let leaveEdit = $state.raw<(() => void) | null>(null);
  let notificationsOpen = $derived(isNotificationsHash(hash));
  let settingsSection = $derived(settingsSectionFromHash(hash));
  let pageOpen = $derived(guideOpen || faqOpen || reportsOpen || notificationsOpen || settingsSection !== null);
  // A finished error report's summary; the report is already saved as Ready.
  let errorSummary = $state.raw<{ id: string; record: ErrorReportRecord } | null>(null);
  let reportOpen = $derived(details.open || details.summaryOpen || errorSummary !== null);
  let menuOpen = $state(false);
  let menuWasOpen = false;
  let opacity = $state(0);
  let grayscale = $state(false);
  let language = $state<LanguagePreference>('en');
  let notifications = $state.raw<readonly ReportStatusNotification[]>(sampleNotifications);
  let locationState = $state<GeolocationState>('unavailable');
  let locationMessage = $state('');
  let accuracy = $state<number | null>(null);
  let homeMap: HomeMap;
  // Camera requested from a full-screen page; applied once that page has closed so an
  // inert, hidden map is never moved.
  let pendingCamera: CameraTarget | null = null;
  // Page requested from the summary; opened once its report history entries are gone.
  let pendingPage: { hash: string; highlightReportId: string | null; openReportId?: string | null; filter?: StatusTabKey } | null = null;
  let highlightReportId = $state<string | null>(null);
  // The report Reports opens straight into, by ID; the list stays behind its back button.
  let openReportId = $state<string | null>(null);
  // The tab Reports opens on.
  let reportsFilter = $state<StatusTabKey>('all');
  // Feedback after a summary action, shown once right after it; never stored with the report.
  let summaryOutcome = $state.raw<{ kind: 'failed' } | null>(null);
  // Report sent or saved: confirmed at the bottom of the map, with a link to that report.
  let mapNotice = $state.raw<ConfirmationNotice | null>(null);
  // Required fields a just-saved draft still lacks, from the same check as Ready to send.
  let draftMissing = $state<string[]>([]);
  // While the draft confirmation shows, the Reports button is highlighted: that is where it went.
  let reportsHighlight = $derived(mapNotice?.icon === 'draft');
  // The saved report's status, named and styled by its tag in the saved confirmation.
  let savedStatus = $state<'ready' | 'draft'>('ready');
  // A map confirmation never floats over a page or report form opened after it.
  $effect(() => { if (pageOpen || reportOpen) mapNotice = null; });

  function restoreMapFocus() {
    void tick().then(() => {
      if (pageOpen || reportOpen || menuOpen) return;
      if (returnFocus?.isConnected && !returnFocus.closest('[inert]')) returnFocus.focus({ preventScroll: true });
      else homeMap?.focusDetails();
    });
  }

  function syncRoute() {
    // #/Reports and other spellings: rewrite to the lower-case route in place, keeping the history entry.
    const canonical = canonicalReportsHash(window.location.hash);
    if (canonical) history.replaceState(history.state, '', canonical);
    // Browser back/forward or a typed address away from an edit page with unsaved changes:
    // put the edit page back and ask first.
    const editing = reportEditIdFromHash(hash);
    if (editDirty && editing !== null && reportEditIdFromHash(window.location.hash) !== editing) {
      history.pushState({ nrlEditEntry: true }, '', reportEditRoute(editing));
      leaveEdit = () => { editDirty = false; history.back(); };
      return;
    }
    const wasPageOpen = pageOpen;
    const wasReportOpen = reportOpen || hash.startsWith('#/Report/');
    hash = window.location.hash;
    search = window.location.search;
    const route = resolveReportingRoute(hash, details.draft ? details.variant : null, !!details.draft?.type, !!details.result);
    if (route?.kind !== 'summary' && details.result) detailsController.closeSummary();
    if (route?.kind === 'details') {
      detailsController.resume(route.step);
      if (hash !== route.hash) {
        history.replaceState(history.state, '', route.hash);
        hash = route.hash;
      }
    } else {
      if (details.open) void detailsController.dismiss();
      if (route?.kind === 'map') {
        history.replaceState(null, '', window.location.pathname + window.location.search);
        hash = '';
      }
    }
    if (pageOpen) {
      if (!wasPageOpen) menuWasOpen = menuOpen;
      menuOpen = false;
    } else if (wasPageOpen) menuOpen = menuWasOpen;
    if ((wasReportOpen && !reportOpen) || (wasPageOpen && !pageOpen)) restoreMapFocus();
    if (!reportsOpen) { highlightReportId = null; openReportId = null; reportsFilter = 'all'; }
    if (pendingPage && !pageOpen && !reportOpen) {
      const page = pendingPage;
      pendingPage = null;
      highlightReportId = page.highlightReportId;
      openReportId = page.openReportId ?? null;
      reportsFilter = page.filter ?? 'all';
      openPage(page.hash);
    }
    if (pendingErrorEdit && !pageOpen) {
      const edit = pendingErrorEdit;
      pendingErrorEdit = null;
      void tick().then(() => homeMap?.openErrorReport(edit.id, edit.record));
    }
    if (pendingCamera && !pageOpen) {
      const target = pendingCamera;
      pendingCamera = null;
      void tick().then(() => homeMap?.flyToLocation(target));
    }
  }

  function selectReportingVariant(id: string) {
    const variant = reportingVariants.find((entry) => entry.id === id);
    if (!variant || variant.id === reporting.variant.id) return;
    window.location.replace(reportingVariantUrl(window.location.href, variant));
  }

  function selectPlacementEditing(id: string) {
    const url = placementEditingVariantUrl(window.location.href, id);
    if (url) window.location.replace(url);
  }

  function openDetails(report?: Obstacle, positionReady?: Promise<Obstacle['gps_position']>) {
    returnFocus = document.activeElement instanceof HTMLElement && document.activeElement !== document.body ? document.activeElement : null;
    if (report) {
      detailsController.begin(report, details.variant ?? reporting.variant, positionReady);
      if (pageOpen) { void detailsController.dismiss(); return; }
    }
    if (!details.draft || !details.variant) return;
    menuOpen = false;
    for (let index = 0; index < details.step; index++) {
      history.pushState({ nrlDetailsDepth: index + 1 }, '', details.variant.stepRoutes[index]);
    }
    syncRoute();
  }

  function closeDetails() {
    if (history.state?.nrlDetailsDepth) history.go(-history.state.nrlDetailsDepth);
    else {
      history.replaceState(null, '', window.location.pathname + window.location.search);
      syncRoute();
    }
  }

  // Save draft: back on the map, a confirmation says it is a draft, not sent, what is missing and where it is.
  async function saveDetails() {
    const draft = details.draft;
    if (!await detailsController.saveAndDismiss()) return;
    closeDetails();
    // The draft is stored: end the drawing session like Finish does, so no selection or
    // Resume details remains and the draft shows as an ordinary report marker.
    homeMap.clearSelection();
    detailsController.clear();
    if (!draft) return;
    const id = draft.report.id;
    draftMissing = missingDetailsFields(draft);
    mapNotice = {
      title: 'Draft saved',
      icon: 'draft',
      description: draftDescription,
      action: { label: 'View drafts', onclick: () => showInReports(id, 'draft') },
    };
  }

  async function continueDetails() {
    if (!await detailsController.continue() || !details.variant) return;
    history.pushState({ nrlDetailsDepth: (history.state?.nrlDetailsDepth ?? 0) + 1 }, '', details.variant.stepRoutes[details.step - 1]);
    syncRoute();
  }

  function previousDetailsStep() {
    if (!details.variant || details.step <= 1) return;
    if (history.state?.nrlDetailsDepth > 1) history.back();
    else {
      history.replaceState(history.state, '', details.variant.stepRoutes[details.step - 2]);
      syncRoute();
    }
  }

  async function finishDetails() {
    if (!await detailsController.finish()) return;
    homeMap.clearSelection();
    if (details.summaryOpen) {
      history.replaceState(history.state, '', summaryRoute);
      syncRoute();
    }
  }

  function closeSummary() {
    detailsController.closeSummary();
    closeDetails();
  }

  function editSummary(step: number) {
    if (!detailsController.editResult(step) || !details.variant) return;
    history.replaceState(history.state, '', details.variant.stepRoutes[details.step - 1]);
    syncRoute();
  }

  // Closing a form opened from the summary returns to the summary, not the map.
  function dismissDetails() {
    if (!detailsController.cancelEdit()) { closeDetails(); return; }
    history.replaceState(history.state, '', summaryRoute);
    syncRoute();
  }

  // The report is already saved; a new location from the summary is stored the same way.
  async function editSummaryGeometry(geometry: Obstacle['obstacle_position']) {
    const result = details.result;
    if (!result) return;
    try {
      await storeReady({ ...result.report, obstacle_position: geometry });
    } catch {
      return;
    }
    if (details.result?.report.id === result.report.id) detailsController.setResultGeometry(geometry);
  }

  // Sends a saved Ready report and confirms it on the map; a failed send leaves it Ready.
  function confirmSent(id: string | undefined) {
    const sent = id ? reportStore.submitReport(id) : undefined;
    if (!sent) { summaryOutcome = { kind: 'failed' }; return; }
    deliverErrorReport(sent);
    mapNotice = {
      title: 'Report sent',
      description: "Kartverket will review it. You'll be notified when it's registered.",
      action: { label: 'View report', onclick: () => viewReport(sent.id, 'sent') },
    };
  }

  // Opens Reports on a tab with this item first and highlighted, without opening it.
  function showInReports(id: string, filter: StatusTabKey) {
    pendingPage = { hash: reportsRoute, highlightReportId: id, openReportId: null, filter };
    if (!history.state?.nrlDetailsDepth) syncRoute();
  }

  // Opens a report's or draft's detail page by its id, over its status tab.
  function viewReport(id: string, filter: StatusTabKey) {
    pendingPage = { hash: reportsRoute, highlightReportId: id, openReportId: id, filter };
    if (!history.state?.nrlDetailsDepth) syncRoute();
  }

  function sendSummaryReport() {
    const id = details.result?.report.id;
    returnFocus = null;
    closeSummary();
    confirmSent(id);
  }

  // The report stays saved, not sent; back on the map, a confirmation names its status and where it is.
  function confirmSaved(id: string | undefined) {
    const { reports, drafts } = reportStore.getState();
    const status = reports.some((report) => report.id === id) ? 'ready' : drafts.some((draft) => draft.id === id) ? 'draft' : null;
    if (!id || !status) return;
    savedStatus = status;
    mapNotice = {
      title: 'Report saved',
      // Saved, not sent: a waiting clock, not the sent check.
      icon: 'pending',
      description: savedDescription,
      action: { label: 'View report', onclick: () => viewReport(id, status) },
    };
  }

  function continueFromSummary() {
    const id = details.result?.report.id;
    returnFocus = null;
    closeSummary();
    confirmSaved(id);
  }

  // Error reports: the same Draft and Ready records, summary and confirmations as new obstacles.
  function saveErrorDraft(id: string, record: ErrorReportRecord) {
    if (reportStore.saveDraft(errorReportToDraft(id, record, { existing: storedRecord(id) }))) confirmSaved(id);
  }

  function finishErrorReport(id: string, record: ErrorReportRecord) {
    if (reportStore.markReady(errorReportToReport(id, record, { existing: storedRecord(id) }))) errorSummary = { id, record };
  }

  // Every answer is edited in the error form; the obstacle itself is not an answer.
  let errorSummaryRows = $derived<SummaryRow[]>(errorSummary
    ? errorReportRows(errorSummary.record).map((row) => ({ ...row, edit: row.key === 'obstacle' ? undefined : { onclick: editErrorSummary } }))
    : []);

  function editErrorSummary() {
    const summary = errorSummary;
    errorSummary = null;
    if (summary) homeMap.openErrorReport(summary.id, summary.record);
  }

  function leaveErrorSummary(next: (id: string | undefined) => void) {
    const id = errorSummary?.id;
    errorSummary = null;
    returnFocus = null;
    next(id);
  }

  function closeErrorSummary() {
    errorSummary = null;
    restoreMapFocus();
  }

  // Edit draft / Edit report on an error report in Reports: back to the map, into the error form.
  let pendingErrorEdit: { id: string; record: ErrorReportRecord } | null = null;
  function editStoredErrorReport(id: string) {
    const { drafts, reports } = reportStore.getState();
    const record = (drafts.find((draft) => draft.id === id) ?? reports.find((report) => report.id === id))?.errorReport;
    if (!record) return;
    pendingErrorEdit = { id, record };
    backToMap();
  }

  function outcomeToMap() {
    summaryOutcome = null;
    restoreMapFocus();
  }

  // Opens Reports on a tab once the summary's history is gone.
  function outcomeToReports(filter: StatusTabKey) {
    summaryOutcome = null;
    pendingPage = { hash: reportsRoute, highlightReportId: null, filter };
    if (!history.state?.nrlDetailsDepth) syncRoute();
  }

  function openReportEdit(id: string) {
    history.pushState({ ...history.state, nrlEditEntry: true }, '', reportEditRoute(id));
    syncRoute();
  }

  // Back to the list: the entry before the edit page, or the list itself after a direct link.
  function exitReportEdit(saved: boolean) {
    if (!saved && editDirty) {
      leaveEdit = () => exitReportEdit(true);
      return;
    }
    editDirty = false;
    if (history.state?.nrlEditEntry) history.back();
    else {
      history.replaceState(history.state, '', reportsRoute);
      syncRoute();
    }
  }

  // Read the pending exit before clearing it: once cleared, nothing is left to call.
  function leaveWithoutSavingNow() {
    const leave = leaveEdit;
    leaveEdit = null;
    leave?.();
  }

  // Reloading or closing the tab with unsaved edits gets the browser's own question.
  $effect(() => {
    if (!editDirty) return;
    const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  });

  function openPage(nextHash: string) {
    if (!pageOpen) {
      returnFocus = document.activeElement instanceof HTMLElement && document.activeElement !== document.body
        ? document.activeElement : document.querySelector<HTMLElement>('[aria-label="Menu"]');
    }
    history.pushState({ ...history.state, nrlPageEntry: true }, '', nextHash);
    syncRoute();
  }

  function selectSettings(section: SettingsSection) {
    history.replaceState(history.state, '', '#/Settings/' + section);
    syncRoute();
  }

  function showOnMap(target: CameraTarget) {
    pendingCamera = target;
    backToMap();
  }

  function backToMap() {
    if (history.state?.nrlPageEntry || history.state?.nrlFaqEntry) history.back();
    else {
      history.replaceState(history.state, '', window.location.pathname + window.location.search);
      syncRoute();
    }
  }

  onMount(() => {
    syncRoute();
    window.addEventListener('popstate', syncRoute);
    window.addEventListener('hashchange', syncRoute);
    // Place names for report cards, looked up once per location and stored.
    const stopPlaceNames = startPlaceNames(reportStore);
    return () => {
      stopPlaceNames();
      // Invalidate a Finish waiting on GPS before the map releases its request.
      detailsController.clear();
      window.removeEventListener('popstate', syncRoute);
      window.removeEventListener('hashchange', syncRoute);
    };
  });
</script>

{#snippet reportingDebug()}
  <ReportingDebug variants={reportingVariants} selectedId={reporting.variant.id} onchange={selectReportingVariant} {placementEditing} onplacementchange={selectPlacementEditing} />
{/snippet}

<!-- A press anywhere on the map dismisses its confirmation; the toast sits outside this element. -->
<div class="map-page" class:map-page-hidden={pageOpen} inert={pageOpen || reportOpen} aria-hidden={pageOpen || reportOpen}
  onpointerdown={() => { mapNotice = null; }}>
  <HomeMap bind:this={homeMap} bind:menuOpen bind:opacity bind:isGrayscale={grayscale}
    {placementEditing} {userTest}
    bind:geolocationState={locationState} bind:locationMessage bind:accuracy
    onguide={() => openPage(reportingGuideRoute)} onfaq={() => openPage('#/FAQ')} onnotifications={() => openPage(notificationsRoute)} onreports={() => openPage(reportsRoute)}
    onsettings={(section) => openPage('#/Settings/' + section)} visible={!pageOpen && !reportOpen}
    debugContent={reporting.debug ? reportingDebug : undefined}
    onreportstart={() => detailsController.start(reporting.variant)}
    oncomplete={openDetails} onresumedetails={details.draft ? () => openDetails() : undefined}
    onselectiondelete={() => detailsController.clear()}
    onerrorsave={saveErrorDraft} onerrorfinish={finishErrorReport} {reportsHighlight} />
</div>
{#if details.draft && details.variant && ActiveReportingView}
  {#key details.draft.report.id}
  <ActiveReportingView draft={details.draft} open={details.open} step={details.step} totalSteps={details.variant.stepRoutes.length}
    busy={details.busy} error={details.error}
    ontype={detailsController.setType} onheight={detailsController.setHeight}
    onillumination={detailsController.cycleIllumination}
    oncustomtype={detailsController.setCustomType} ondescription={detailsController.setDescription}
    onphotos={detailsController.addPhotos} onremovephoto={detailsController.removePhoto}
    onsave={saveDetails} oncontinue={continueDetails} onfinish={finishDetails}
    onback={previousDetailsStep} ondismiss={dismissDetails} />
  {/key}
{/if}
{#if details.summaryOpen && details.result}
  <ObstacleReportSummary report={details.result.report} totalSteps={details.result.variant.stepRoutes.length}
    onedit={editSummary} ongeometry={editSummaryGeometry} onsend={sendSummaryReport} oncontinue={continueFromSummary} onclose={closeSummary} />
{:else if !details.open && details.error}
  <p class="details-error" role="alert">{details.error}</p>
{/if}
{#if errorSummary}
  <ReportSummaryDialog title="Error report saved – not sent yet" rows={errorSummaryRows}
    oncontinue={() => leaveErrorSummary(confirmSaved)} onsend={() => leaveErrorSummary(confirmSent)} onclose={closeErrorSummary} />
{/if}
{#snippet draftDescription()}Your report is saved as a draft and hasn't been sent.{#if draftMissing.length}{' '}<br />Missing: {draftMissing.join(', ')}{/if}{/snippet}
{#snippet savedDescription()}Saved as <StatusBadge status={savedStatus} />. You can find it in Reports.{/snippet}
{#if summaryOutcome?.kind === 'failed'}
  <!-- Instead of a confirmation: the message is the alert's description, so the body stays empty. -->
  {#snippet failedSubtitle()}<p>The report could not be sent. It is saved under Reports → Ready to send – try again from there.</p>{/snippet}
  {#snippet failedPrimary()}<button type="button" class="ds-button dialog-action-primary" data-variant="primary" onclick={() => outcomeToReports('ready')}>Go to Reports</button>{/snippet}
  {#snippet failedSecondary()}<button type="button" class="ds-button dialog-action-secondary" data-variant="tertiary" data-color="brand1" onclick={outcomeToMap}>Back to map</button>{/snippet}
  <Dialog title="Report not sent" icon="warning" role="alertdialog" subtitle={failedSubtitle} primary={failedPrimary} secondary={failedSecondary} onclose={outcomeToMap}>{''}</Dialog>
{/if}
<ConfirmationToast notice={mapNotice} onclose={() => { mapNotice = null; }} />
{#if guideOpen}<ReportObstacleGuide onback={backToMap} />{/if}
{#if faqOpen}<FaqPage onback={backToMap} onguide={() => openPage(reportingGuideRoute)} />{/if}
{#if reportsOpen}<ReportsPage onback={backToMap} onshowonmap={showOnMap} highlightId={highlightReportId} openId={openReportId} filter={reportsFilter}
  onediterrorreport={editStoredErrorReport} editId={reportEditId} onopenedit={openReportEdit} onexitedit={exitReportEdit}
  oneditdirty={(dirty) => { editDirty = dirty; }} />{/if}
{#if leaveEdit}
  {#snippet leaveSubtitle()}<p>You have unsaved changes. Leave without saving?</p>{/snippet}
  {#snippet keepEditing()}<button type="button" class="ds-button dialog-action-primary" data-variant="primary" onclick={() => { leaveEdit = null; }}>Keep editing</button>{/snippet}
  {#snippet leaveWithoutSaving()}<button type="button" class="ds-button dialog-action-secondary" data-variant="tertiary" data-color="brand1" onclick={leaveWithoutSavingNow}>Leave without saving</button>{/snippet}
  <Dialog title="Unsaved changes" icon="warning" role="alertdialog" subtitle={leaveSubtitle} primary={keepEditing} secondary={leaveWithoutSaving} onclose={() => { leaveEdit = null; }}>{''}</Dialog>
{/if}
{#if notificationsOpen}
  <NotificationsPage {notifications} onback={backToMap} onmarkallread={() => { notifications = markAllRead(notifications); }} />
{/if}
{#if settingsSection}
  <SettingsPage section={settingsSection} onsection={selectSettings} onclose={backToMap}
    bind:opacity bind:grayscale bind:language {locationState} {locationMessage} {accuracy}
    onlocation={() => homeMap.toggleGeolocation()} onguide={() => openPage(reportingGuideRoute)} />
{/if}

<style>
  .map-page { height: 100%; }
  .map-page-hidden { visibility: hidden; pointer-events: none; }
  .details-error { position: fixed; z-index: var(--layer-toast); top: calc(var(--map-control-inset-top) + var(--control-height-large)); left: var(--map-control-inset-left); right: var(--map-control-inset-right); padding: var(--space-3); border-radius: var(--radius-card); background: var(--color-status-error-surface); color: var(--color-status-error); }
</style>
