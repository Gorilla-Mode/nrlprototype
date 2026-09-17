<script lang="ts">
  import { tick } from 'svelte';
  import ProfileSettings from './ProfileSettings.svelte';
  import AccountSettings from './AccountSettings.svelte';
  import MapSettings from './MapSettings.svelte';
  import LanguageSettings from './LanguageSettings.svelte';
  import { settingsSections, type SettingsSection, type LanguagePreference } from './settings';
  import type { GeolocationState } from '../map/createGeolocationController';

  let { section, onsection, onclose, opacity = $bindable(0), grayscale = $bindable(false),
    language = $bindable<LanguagePreference>('en'), locationState, locationMessage, accuracy, onlocation }: {
    section: SettingsSection;
    onsection: (section: SettingsSection) => void;
    onclose: () => void;
    opacity?: number;
    grayscale?: boolean;
    language?: LanguagePreference;
    locationState: GeolocationState;
    locationMessage: string;
    accuracy: number | null;
    onlocation: () => void;
  } = $props();
  let heading: HTMLHeadingElement;
  let content: HTMLElement;
  let title = $derived(settingsSections.find(item => item.id === section)!.label);
  $effect(() => {
    void section;
    void tick().then(() => { content.scrollTop = 0; heading.focus({ preventScroll: true }); });
  });
  function closeOnEscape(event: KeyboardEvent) {
    // Native select popups own Escape while choosing an option.
    if (event.key === 'Escape' && !event.defaultPrevented && !(event.target instanceof HTMLSelectElement)) {
      event.preventDefault(); onclose();
    }
  }
</script>

<svelte:window onkeydown={closeOnEscape} />
<main class="settings-page" aria-label="Settings">
  <div class="settings-shell">
    <header class="settings-header"><h2>Settings</h2><button class="menu-close" type="button" aria-label="Close Settings" onclick={onclose}><svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="m6 6 12 12M6 18 18 6" /></svg></button></header>
    <aside class="settings-sidebar">
      <nav aria-label="Settings sections">
        {#each ['ACCOUNT', 'NOTIFICATIONS', 'MAP & DATA', 'SUPPORT', 'ACCESSIBILITY'] as group}
          <section class="settings-nav-group"><h3>{group}</h3>
            {#each settingsSections.filter(item => item.group === group) as item}
              <button type="button" class="settings-nav-row" aria-current={section === item.id ? 'page' : undefined} onclick={() => onsection(item.id)}><svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d={item.icon} /></svg><span>{item.label}</span></button>
            {/each}
            {#if group === 'SUPPORT'}
              <button class="settings-nav-row" type="button" disabled>How to Report an Obstacle</button>
              <button class="settings-nav-row" type="button" disabled>Help &amp; Contact</button>
              <p class="settings-nav-notice">Not available in this prototype.</p>
            {/if}
          </section>
        {/each}
      </nav>
      <footer class="settings-sidebar-footer"><button class="settings-nav-row" type="button" disabled>Log Out</button><p class="settings-nav-notice">Authentication is not connected.</p></footer>
    </aside>
    <label class="settings-mobile-nav">Settings section
      <select value={section} onchange={(event) => onsection(event.currentTarget.value as SettingsSection)}>
        {#each settingsSections as item}<option value={item.id}>{item.label}</option>{/each}
        <optgroup label="SUPPORT"><option disabled>How to Report an Obstacle — unavailable</option><option disabled>Help &amp; Contact — unavailable</option></optgroup>
        <option disabled>Log Out — unavailable</option>
      </select>
    </label>
    <section class="settings-content" bind:this={content} aria-labelledby="settings-title">
      <div class="settings-content-column">
        <h1 id="settings-title" bind:this={heading} tabindex="-1">{title}</h1>
        {#if section === 'profile'}<ProfileSettings />
        {:else if section === 'security' || section === 'notifications'}<AccountSettings {section} />
        {:else if section === 'language'}<LanguageSettings bind:language />
        {:else}<MapSettings {section} bind:opacity bind:grayscale {locationState} {locationMessage} {accuracy} {onlocation} />{/if}
      </div>
    </section>
  </div>
</main>
