<p class="settings-description">Your account information.</p>
<div class="settings-profile">
  <span class="settings-avatar" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none"><path d="M8 7a4 4 0 1 0 8 0 4 4 0 1 0-8 0M4 21v-2a8 8 0 0 1 16 0v2" /></svg></span>
  <p>Profile information is not available in this prototype.</p>
</div>
<fieldset class="settings-card settings-fields" disabled aria-describedby="profile-unavailable">
  <legend class="sr-only">Profile information</legend>
  {#each ['Full name', 'Email', 'Role / Title', 'Organisation'] as label}
    <label>{label}<input type="text" value="" placeholder="Not available" /></label>
  {/each}
</fieldset>
<p id="profile-unavailable" class="settings-notice">Account data and profile editing are not connected.</p>
<button class="button" type="button" disabled aria-describedby="profile-unavailable">Save changes</button>
