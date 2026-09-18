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
  import { createDetailsController, detailsRoute, initialDetailsState, type DetailsHooks, type DetailsState } from './lib/reporting/createDetailsController';
  import type { Obstacle } from './lib/reporting/obstacle';

  let { onSaveDraft, onContinue }: DetailsHooks = $props();
  let details = $state.raw<DetailsState>(initialDetailsState);
  const detailsController = createDetailsController({
    onChange: (state) => { details = state; },
    getHooks: () => ({ onSaveDraft, onContinue }),
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
    hash = window.location.hash;
    if (hash === detailsRoute) {
      if (details.draft) detailsController.resume();
      else {
        history.replaceState(null, '', window.location.pathname + window.location.search);
        hash = '';
      }
    } else if (details.open) {
      void detailsController.dismiss();
      void tick().then(() => {
        if (pageOpen) return;
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
    history.pushState({ nrlDetailsEntry: true }, '', detailsRoute);
    syncRoute();
  }

  function closeDetails() {
    if (history.state?.nrlDetailsEntry) history.back();
    else {
      history.replaceState(null, '', window.location.pathname + window.location.search);
      syncRoute();
    }
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
  <ObstacleDetails draft={details.draft} busy={details.busy} error={details.error}
    canSave={!!onSaveDraft} canContinue={!!onContinue}
    ontype={detailsController.setType} onheight={detailsController.setHeight}
    onillumination={detailsController.cycleIllumination} onabsence={detailsController.setNotPresent}
    onsave={detailsController.save} oncontinue={detailsController.continue} ondismiss={closeDetails} />
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
