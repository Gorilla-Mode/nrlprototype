<script lang="ts">
  import { onMount, tick } from 'svelte';
  import HomeMap from './lib/map/HomeMap.svelte';
  import FaqPage from './lib/faq/FaqPage.svelte';
  import ReportsPage from './lib/reports/ReportsPage.svelte';
  import SettingsPage from './lib/settings/SettingsPage.svelte';
  import { settingsSectionFromHash, type SettingsSection, type LanguagePreference } from './lib/settings/settings';
  import { isReportsHash, reportsRoute } from './lib/reports/reports';
  import type { GeolocationState } from './lib/map/createGeolocationController';
  import ObstacleDetails from './lib/reporting/ObstacleDetails.svelte';
  import { createDetailsController, detailsRoute, additionalInformationRoute, detailsStepFromHash, initialDetailsState, type DetailsHooks, type DetailsState } from './lib/reporting/createDetailsController';
  import type { Obstacle } from './lib/reporting/obstacle';

  let { onSaveDraft, onContinue, onFinish }: DetailsHooks = $props();
  let details = $state.raw<DetailsState>(initialDetailsState);
  const detailsController = createDetailsController({
    onChange: (state) => { details = state; },
    getHooks: () => ({ onSaveDraft, onContinue, onFinish }),
  });
  let returnFocus: HTMLElement | null = null;

  let hash = $state(typeof window !== 'undefined' ? window.location.hash : '');
  let faqOpen = $derived(hash === '#/FAQ');
  let reportsOpen = $derived(isReportsHash(hash));
  let settingsSection = $derived(settingsSectionFromHash(hash));
  let pageOpen = $derived(faqOpen || reportsOpen || settingsSection !== null);
  let menuOpen = $state(false);
  let menuWasOpen = false;
  let opacity = $state(0);
  let grayscale = $state(false);
  let language = $state<LanguagePreference>('en');
  let locationState = $state<GeolocationState>('unavailable');
  let locationMessage = $state('');
  let accuracy = $state<number | null>(null);
  let homeMap: HomeMap;

  function syncRoute() {
    const wasOpen = pageOpen;
    const wasDetailsRoute = detailsStepFromHash(hash) !== null;
    hash = window.location.hash;
    const requestedStep = detailsStepFromHash(hash);
    if (requestedStep) {
      if (details.draft) {
        detailsController.resume(requestedStep);
        if (requestedStep === 2 && details.step === 1) {
          history.replaceState(history.state, '', detailsRoute);
          hash = detailsRoute;
        }
      }
      else {
        history.replaceState(null, '', window.location.pathname + window.location.search);
        hash = '';
      }
    } else if (details.open || wasDetailsRoute) {
      void detailsController.dismiss();
      void tick().then(() => {
        if (pageOpen || details.open) return;
        if (returnFocus?.isConnected && !returnFocus.closest('[inert]')) returnFocus.focus({ preventScroll: true });
        else homeMap?.focusDetails();
      });
    }
    // The drawer opens FAQ and Settings, the toolbar opens Reports: restore whichever state we left.
    if (pageOpen) {
      if (!wasOpen) menuWasOpen = menuOpen;
      menuOpen = false;
    } else if (wasOpen) menuOpen = menuWasOpen;
  }

  function openDetails(report?: Obstacle) {
    returnFocus = document.activeElement instanceof HTMLElement && document.activeElement !== document.body ? document.activeElement : null;
    if (report) detailsController.begin(report);
    if (!details.draft) return;
    const step = details.step;
    history.pushState({ nrlDetailsDepth: 1 }, '', detailsRoute);
    if (step === 2) history.pushState({ nrlDetailsDepth: 2 }, '', additionalInformationRoute);
    syncRoute();
  }

  function closeDetails() {
    if (history.state?.nrlDetailsDepth) history.go(-history.state.nrlDetailsDepth);
    else {
      history.replaceState(null, '', window.location.pathname + window.location.search);
      syncRoute();
    }
  }

  async function continueDetails() {
    if (!await detailsController.continue()) return;
    history.pushState({ nrlDetailsDepth: (history.state?.nrlDetailsDepth ?? 0) + 1 }, '', additionalInformationRoute);
    syncRoute();
  }

  function previousDetailsStep() {
    if (history.state?.nrlDetailsDepth === 2) history.back();
    else {
      history.replaceState(history.state, '', detailsRoute);
      syncRoute();
    }
  }

  async function finishDetails() {
    if (!await detailsController.finish()) return;
    homeMap.clearSelection();
    if (detailsStepFromHash(window.location.hash)) closeDetails();
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

<div class="map-page" class:map-page-hidden={pageOpen} inert={pageOpen || details.open} aria-hidden={pageOpen || details.open}>
  <HomeMap bind:this={homeMap} bind:menuOpen bind:opacity bind:isGrayscale={grayscale}
    bind:geolocationState={locationState} bind:locationMessage bind:accuracy
    onfaq={() => openPage('#/FAQ')} onreports={() => openPage(reportsRoute)}
    onsettings={(section) => openPage('#/Settings/' + section)} visible={!pageOpen && !details.open}
    oncomplete={openDetails} onresumedetails={details.draft ? () => openDetails() : undefined}
    onselectiondelete={() => detailsController.clear()} />
</div>
{#if details.open && details.draft}
  <ObstacleDetails draft={details.draft} step={details.step} busy={details.busy} error={details.error}
    canSave={!!onSaveDraft} canFinish={!!onFinish}
    ontype={detailsController.setType} onheight={detailsController.setHeight}
    onillumination={detailsController.cycleIllumination} onabsence={detailsController.setNotPresent}
    oncustomtype={detailsController.setCustomType} ondescription={detailsController.setDescription}
    onphotos={detailsController.addPhotos} onremovephoto={detailsController.removePhoto}
    onsave={detailsController.save} oncontinue={continueDetails} onfinish={finishDetails}
    onback={previousDetailsStep} ondismiss={closeDetails} />
{:else if details.error}
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
