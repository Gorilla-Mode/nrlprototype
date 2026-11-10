<script lang="ts">
  import { onMount, tick } from 'svelte';
  import PageHeader from '../components/PageHeader.svelte';
  import { formatNotificationAge, notificationStatusLabels, unreadCount, type ReportStatusNotification } from './notifications';

  let { notifications, onback, onmarkallread }: {
    notifications: readonly ReportStatusNotification[];
    onback: () => void;
    onmarkallread: () => void;
  } = $props();
  let title = $state<HTMLHeadingElement>();
  let unread = $derived(unreadCount(notifications));
  const now = new Date();

  async function markAllRead() {
    onmarkallread();
    // The button becomes disabled; keep keyboard focus on the page instead of losing it.
    await tick();
    title?.focus({ preventScroll: true });
  }

  onMount(() => {
    // Browser Forward can close the modal drawer in this same update.
    void tick().then(() => title?.focus({ preventScroll: true }));
  });
</script>

{#snippet markRead()}
  <button class="ds-button notifications-mark-read" data-variant="tertiary" data-color="brand1" type="button" disabled={unread === 0} onclick={markAllRead}>
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M2 12l5 5L17 7M11 16l1 1L22 7" /></svg>
    Mark all read
  </button>
{/snippet}

<main class="notifications-page app-page" aria-label="Notifications">
  <PageHeader title="Notifications" backLabel="Back to map" {onback} bind:heading={title} actions={markRead} />

  <div class="notifications-content app-page-content">
    <p class="notifications-summary" role="status">{unread === 0 ? 'No unread notifications' : `${unread} unread`}</p>

    {#if notifications.length === 0}
      <p class="notifications-empty">No notifications</p>
    {:else}
      <ul class="notifications-list">
        {#each notifications as notification (notification.id)}
          <li class="ds-card notifications-card" class:notifications-card-unread={!notification.read} data-status={notification.status}>
            <span class="notifications-status-dot" aria-hidden="true"></span>
            <div class="notifications-text">
              {#if !notification.read}<p class="sr-only">Unread</p>{/if}
              <p>Status of report "{notification.reportName}" (#{notification.reportReference})</p>
              <p class="notifications-change"><span>changed to</span> <strong>{notificationStatusLabels[notification.status]}</strong></p>
              <time datetime={notification.receivedAt.toISOString()}>{formatNotificationAge(notification.receivedAt, now)}</time>
            </div>
            {#if !notification.read}<span class="notifications-unread-dot" aria-hidden="true"></span>{/if}
          </li>
        {/each}
      </ul>
    {/if}
  </div>
</main>
