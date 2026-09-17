<script lang="ts">
  import { onMount } from 'svelte';
  import HomeMap from './lib/map/HomeMap.svelte';
  import FaqPage from './lib/faq/FaqPage.svelte';
  import SettingsPage from './lib/settings/SettingsPage.svelte';
  import { settingsSectionFromHash, type SettingsSection, type LanguagePreference } from './lib/settings/settings';
  import type { GeolocationState } from './lib/map/createGeolocationController';

  let hash = $state(typeof window !== 'undefined' ? window.location.hash : '');
  let faqOpen = $derived(hash === '#/FAQ');
  let settingsSection = $derived(settingsSectionFromHash(hash));
  let pageOpen = $derived(faqOpen || settingsSection !== null);
  let menuOpen = $state(false);
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
    if (pageOpen) menuOpen = false;
    else if (wasOpen) menuOpen = true;
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
    window.addEventListener('popstate', syncRoute);
    window.addEventListener('hashchange', syncRoute);
    return () => {
      window.removeEventListener('popstate', syncRoute);
      window.removeEventListener('hashchange', syncRoute);
    };
  });
</script>

<div class="map-page" class:map-page-hidden={pageOpen} inert={pageOpen} aria-hidden={pageOpen}>
  <HomeMap bind:this={homeMap} bind:menuOpen bind:opacity bind:isGrayscale={grayscale}
    bind:geolocationState={locationState} bind:locationMessage bind:accuracy
    onfaq={() => openPage('#/FAQ')} onsettings={(section) => openPage('#/Settings/' + section)} visible={!pageOpen} />
</div>
{#if faqOpen}<FaqPage onback={backToMap} />{/if}
{#if settingsSection}
  <SettingsPage section={settingsSection} onsection={selectSettings} onclose={backToMap}
    bind:opacity bind:grayscale bind:language {locationState} {locationMessage} {accuracy}
    onlocation={() => homeMap.toggleGeolocation()} />
{/if}

<style>
  .map-page { height: 100%; }
  .map-page-hidden { visibility: hidden; pointer-events: none; }
</style>
