<script lang="ts">
  import { onMount, tick } from 'svelte';
  import HomeMap from './lib/map/HomeMap.svelte';
  import FaqPage from './lib/faq/FaqPage.svelte';
  import ReportsPage from './lib/reports/ReportsPage.svelte';
  import SettingsPage from './lib/settings/SettingsPage.svelte';
  import { settingsSectionFromHash, type SettingsSection, type LanguagePreference } from './lib/settings/settings';
  import { isReportsHash, reportsRoute } from './lib/reports/reports';
  import type { GeolocationState } from './lib/map/createGeolocationController';
  import { createDetailsController, initialDetailsState, type DetailsHooks, type DetailsState } from './lib/reporting/createDetailsController';
  import { reportingSettings, reportingVariantUrl, resolveReportingRoute, summaryRoute } from './lib/reporting/reporting';
  import { reportingVariants } from './lib/reporting/reportingVariants';
  import ReportingDebug from './lib/reporting/ReportingDebug.svelte';
  import ObstacleReportSummary from './lib/reporting/ObstacleReportSummary.svelte';
  import type { Obstacle } from './lib/reporting/obstacle';

  let { onSaveDraft, onContinue, onFinish }: DetailsHooks = $props();
  let details = $state.raw<DetailsState>(initialDetailsState);
  const detailsController = createDetailsController({
    onChange: (state) => { details = state; },
    // The prototype itself is a session-only consumer. Optional integrations are awaited.
    getHooks: () => ({
      onSaveDraft: (payload, reason) => onSaveDraft?.(payload, reason),
      onContinue,
      onFinish: (payload, context) => onFinish?.(payload, context),
    }),
  });
  let returnFocus: HTMLElement | null = null;
  let hash = $state(typeof window !== 'undefined' ? window.location.hash : '');
  let search = $state(typeof window !== 'undefined' ? window.location.search : '');
  let reporting = $derived(reportingSettings(search, reportingVariants));
  let ActiveReportingView = $derived(reportingVariants.find(({ id }) => id === details.variant?.id)?.component);
  let faqOpen = $derived(hash === '#/FAQ');
  let reportsOpen = $derived(isReportsHash(hash));
  let settingsSection = $derived(settingsSectionFromHash(hash));
  let pageOpen = $derived(faqOpen || reportsOpen || settingsSection !== null);
  let reportOpen = $derived(details.open || details.summaryOpen);
  let menuOpen = $state(false);
  let menuWasOpen = false;
  let opacity = $state(0);
  let grayscale = $state(false);
  let language = $state<LanguagePreference>('en');
  let locationState = $state<GeolocationState>('unavailable');
  let locationMessage = $state('');
  let accuracy = $state<number | null>(null);
  let homeMap: HomeMap;

  function restoreMapFocus() {
    void tick().then(() => {
      if (pageOpen || reportOpen || menuOpen) return;
      if (returnFocus?.isConnected && !returnFocus.closest('[inert]')) returnFocus.focus({ preventScroll: true });
      else homeMap?.focusDetails();
    });
  }

  function syncRoute() {
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
    if (wasReportOpen && !reportOpen) restoreMapFocus();
  }

  function selectReportingVariant(id: string) {
    const variant = reportingVariants.find((entry) => entry.id === id);
    if (!variant) return;
    history.replaceState(history.state, '', reportingVariantUrl(window.location.href, variant));
    syncRoute();
  }

  function openDetails(report?: Obstacle) {
    returnFocus = document.activeElement instanceof HTMLElement && document.activeElement !== document.body ? document.activeElement : null;
    if (report) {
      detailsController.begin(report, details.variant ?? reporting.variant);
      // GPS may settle after the user has opened another page.
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

  async function saveDetails() {
    if (await detailsController.saveAndDismiss()) closeDetails();
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

  function openPage(nextHash: string) {
    history.pushState({ ...history.state, nrlPageEntry: true }, '', nextHash);
    syncRoute();
  }

  function selectSettings(section: SettingsSection) {
    history.replaceState(history.state, '', '#/Settings/' + section);
    syncRoute();
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
    return () => {
      window.removeEventListener('popstate', syncRoute);
      window.removeEventListener('hashchange', syncRoute);
    };
  });
</script>

{#snippet reportingDebug()}
  <ReportingDebug variants={reportingVariants} selectedId={reporting.variant.id} activeVariant={details.variant} onchange={selectReportingVariant} />
{/snippet}

<div class="map-page" class:map-page-hidden={pageOpen} inert={pageOpen || reportOpen} aria-hidden={pageOpen || reportOpen}>
  <HomeMap bind:this={homeMap} bind:menuOpen bind:opacity bind:isGrayscale={grayscale}
    bind:geolocationState={locationState} bind:locationMessage bind:accuracy
    onfaq={() => openPage('#/FAQ')} onreports={() => openPage(reportsRoute)}
    onsettings={(section) => openPage('#/Settings/' + section)} visible={!pageOpen && !reportOpen}
    debugContent={reporting.debug ? reportingDebug : undefined}
    onreportstart={() => detailsController.start(reporting.variant)}
    oncomplete={openDetails} onresumedetails={details.draft ? () => openDetails() : undefined}
    onselectiondelete={() => detailsController.clear()} />
</div>
{#if details.draft && details.variant && ActiveReportingView}
  {#key details.draft.report.id}
  <ActiveReportingView draft={details.draft} open={details.open} step={details.step} totalSteps={details.variant.stepRoutes.length}
    busy={details.busy} error={details.error}
    ontype={detailsController.setType} onheight={detailsController.setHeight}
    onillumination={detailsController.cycleIllumination} onabsence={detailsController.setNotPresent}
    oncustomtype={detailsController.setCustomType} ondescription={detailsController.setDescription}
    onphotos={detailsController.addPhotos} onremovephoto={detailsController.removePhoto}
    onsave={saveDetails} oncontinue={continueDetails} onfinish={finishDetails}
    onback={previousDetailsStep} ondismiss={closeDetails} />
  {/key}
{/if}
{#if details.summaryOpen && details.result}
  <ObstacleReportSummary report={details.result.report} onclose={closeSummary} />
{:else if !details.open && details.error}
  <p class="details-error" role="alert">{details.error}</p>
{/if}
{#if faqOpen}<FaqPage onback={backToMap} />{/if}
{#if reportsOpen}<ReportsPage onback={backToMap} />{/if}
{#if settingsSection}
  <SettingsPage section={settingsSection} onsection={selectSettings} onclose={backToMap}
    bind:opacity bind:grayscale bind:language {locationState} {locationMessage} {accuracy}
    onlocation={() => homeMap.toggleGeolocation()} />
{/if}

<style>
  .map-page { height: 100%; }
  .map-page-hidden { visibility: hidden; pointer-events: none; }
  .details-error { position: fixed; z-index: var(--layer-toast); top: calc(var(--map-control-inset-top) + var(--control-height-large)); left: var(--map-control-inset-left); right: var(--map-control-inset-right); padding: var(--space-3); border-radius: var(--radius-card); background: var(--color-status-error-surface); color: var(--color-status-error); }
</style>
