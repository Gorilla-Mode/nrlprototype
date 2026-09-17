<script lang="ts">
  import { tick } from 'svelte';
  import type { SettingsSection } from '../settings/settings';

  let { open = $bindable(false), onfaq, onsettings, ondismiss }: {
    open?: boolean;
    onfaq: () => void;
    onsettings: (section: SettingsSection) => void;
    ondismiss: () => void;
  } = $props();

  type MenuAction = 'faq' | 'profile' | 'language' | 'settings';
  interface MenuRow { label: string; icon: string; action?: MenuAction }
  const sections: { title: string; rows: MenuRow[] }[] = [
    { title: 'PROFILE', rows: [{ label: 'My Profile', icon: 'profile', action: 'profile' }] },
    { title: 'WORK', rows: [{ label: 'My Reports', icon: 'reports' }, { label: 'Notifications', icon: 'bell' }] },
    { title: 'HELP', rows: [
      { label: 'How to Report an Obstacle', icon: 'report-guide' },
      { label: 'FAQ', icon: 'faq', action: 'faq' },
      { label: 'Help & Contact', icon: 'contact' },
    ] },
    { title: 'ACCESSIBILITY', rows: [{ label: 'Language', icon: 'language', action: 'language' }] },
    { title: 'ACCOUNT', rows: [{ label: 'Settings', icon: 'settings', action: 'settings' }] },
  ];
  const icons: Record<string, string> = {
    profile: 'M8 7a4 4 0 1 0 8 0 4 4 0 1 0-8 0M4 21v-2a8 8 0 0 1 16 0v2',
    reports: 'M9 4H6v17h12V4h-3M9 3h6v4H9ZM9 11h6m-6 4h6',
    bell: 'M5 17h14l-2-3V9a5 5 0 0 0-10 0v5ZM10 20h4M12 2v2',
    'report-guide': 'M3 12a9 9 0 1 0 18 0 9 9 0 1 0-18 0M9 3v6H3m12-6v6h6M3 15h6v6m6 0v-6h6',
    faq: 'M3 12a9 9 0 1 0 18 0 9 9 0 1 0-18 0M9 9a3 3 0 0 1 6 0c0 2-3 2-3 4m0 3v1',
    contact: 'M4 3h16v14H9l-5 4ZM8 8h8m-8 4h5',
    language: 'M3 12a9 9 0 1 0 18 0 9 9 0 1 0-18 0M3 12h18M12 3c-5 5-5 13 0 18 5-5 5-13 0-18',
    settings: 'M8 12a4 4 0 1 0 8 0 4 4 0 1 0-8 0M12 2v3m0 14v3M2 12h3m14 0h3M5 5l2 2m10 10 2 2M5 19l2-2M17 7l2-2',
    logout: 'M10 3H4v18h6m4-14 5 5-5 5m-6-5h11',
  };

  let dialog: HTMLDialogElement;
  let scroller: HTMLDivElement;
  let returnButton: HTMLButtonElement | undefined;
  let closeButton: HTMLButtonElement;
  let scrollTop = 0;
  let backdropPress = false;

  $effect(() => {
    if (open && !dialog.open) {
      dialog.showModal();
      scroller.scrollTop = scrollTop;
      (returnButton ?? closeButton).focus({ preventScroll: true });
    } else if (!open && dialog.open) {
      scrollTop = scroller.scrollTop;
      dialog.close();
    }
  });

  async function dismiss() {
    returnButton = undefined;
    open = false;
    await tick();
    ondismiss();
  }

  async function activate(action: MenuAction, button: HTMLButtonElement) {
    scrollTop = scroller.scrollTop;
    returnButton = button;
    open = false;
    // Close the native dialog before moving focus or hiding its map ancestor.
    await tick();
    if (action === 'faq') onfaq();
    else onsettings(action === 'language' ? 'language' : 'profile');
  }

  function isBackdrop(event: MouseEvent) {
    if (event.target !== dialog) return false;
    const box = dialog.getBoundingClientRect();
    return event.clientX < box.left || event.clientX > box.right || event.clientY < box.top || event.clientY > box.bottom;
  }

  function dismissBackdrop(event: MouseEvent) {
    if (backdropPress && isBackdrop(event)) {
      event.preventDefault();
      void dismiss();
    }
    backdropPress = false;
  }
</script>

{#snippet icon(name: string)}
  <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d={icons[name]} /></svg>
{/snippet}
{#snippet chevron()}
  <svg class="menu-chevron" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="m9 5 7 7-7 7" /></svg>
{/snippet}

<dialog id="main-menu" class="menu-drawer" bind:this={dialog} aria-labelledby="menu-heading" oncancel={(event) => { event.preventDefault(); void dismiss(); }} onpointerdown={(event) => { backdropPress = isBackdrop(event); }} onclick={dismissBackdrop}>
  <div class="menu-shell">
    <header class="menu-header">
      <h2 id="menu-heading">MENU</h2>
      <button bind:this={closeButton} class="menu-close" type="button" aria-label="Close menu" onclick={dismiss}><svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="m6 6 12 12M6 18 18 6" /></svg></button>
    </header>
    <div class="menu-scroll" bind:this={scroller}>
      <nav aria-label="Main navigation">
        {#each sections as section}
          <div class="menu-section">
            {#if section.title}<h3>{section.title}</h3>{/if}
            {#each section.rows as row}
              {@const unavailable = !row.action}
              <button class="menu-row" type="button" disabled={unavailable} onclick={(event) => { if (row.action) void activate(row.action, event.currentTarget); }}>
                <span class="menu-icon">{@render icon(row.icon)}</span>
                <span class="menu-label">{row.label}{#if unavailable}<span class="menu-unavailable">Not available in this prototype</span>{/if}</span>
                {#if !unavailable}{@render chevron()}{/if}
              </button>
            {/each}
          </div>
        {/each}
      </nav>
      <footer class="menu-footer">
        <button class="menu-row" type="button" disabled>
          <span class="menu-icon">{@render icon('logout')}</span><span class="menu-label">Log Out<span class="menu-unavailable">Not available in this prototype</span></span>
        </button>
      </footer>
    </div>
  </div>
</dialog>
