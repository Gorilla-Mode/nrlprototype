<script lang="ts">
  let { section }: { section: 'security' | 'notifications' } = $props();
</script>

{#if section === 'security'}
  <p class="settings-description">Account sign-in and security.</p>
  <section class="settings-card">
    <h2>Change password</h2>
    <p id="password-unavailable">Password reset is unavailable until account authentication is connected.</p>
    <button class="button" type="button" disabled aria-describedby="password-unavailable">Send reset link</button>
  </section>
  <section class="settings-card">
    <label class="settings-switch-row"><span><strong>Two-factor authentication</strong><span>Additional sign-in verification is not available in this prototype.</span></span><input class="settings-switch" type="checkbox" role="switch" disabled /></label>
  </section>
{:else}
  <p class="settings-description">Notification preferences and delivery.</p>
  <p class="settings-notice" id="notifications-unavailable">Notifications are not connected. These controls are unavailable and do not represent saved preferences.</p>
  <fieldset class="settings-card settings-switches" disabled aria-describedby="notifications-unavailable">
    <legend class="sr-only">Notification preferences</legend>
    <label class="settings-switch-row"><span><strong>Obstacle report updates</strong><span>Updates about reports.</span></span><input class="settings-switch" type="checkbox" role="switch" /></label>
    <label class="settings-switch-row"><span><strong>New notifications</strong><span>A badge for unread notifications.</span></span><input class="settings-switch" type="checkbox" role="switch" /></label>
  </fieldset>
  <fieldset class="settings-card settings-switches" disabled aria-describedby="notifications-unavailable">
    <legend class="sr-only">Delivery</legend>
    <h2 class="settings-section-label">DELIVERY</h2>
    <label class="settings-switch-row"><span><strong>Email alerts</strong><span>Notification delivery by email.</span></span><input class="settings-switch" type="checkbox" role="switch" /></label>
    <label class="settings-switch-row"><span><strong>In-app alerts</strong><span>Notifications within the app.</span></span><input class="settings-switch" type="checkbox" role="switch" /></label>
  </fieldset>
{/if}
