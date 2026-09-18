<script lang="ts">
  import type { LanguagePreference } from './settings';
  let { language = $bindable<LanguagePreference>('en') }: { language?: LanguagePreference } = $props();
</script>

<p class="settings-description">Choose your preferred interface language.</p>
<label class="settings-fields">Language
  <select bind:value={language} aria-describedby="language-availability">
    <option value="nb">🇳🇴 Norsk</option>
    <option value="en">🇬🇧 English</option>
  </select>
</label>
<p id="language-availability" class="settings-notice">The interface is currently available in English only. This preference lasts for this session and resets when you refresh. Selecting Norsk does not translate the app yet.</p>
