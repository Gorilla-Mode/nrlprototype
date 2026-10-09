<script lang="ts">
  import { onMount, tick, type Snippet } from 'svelte';

  let { onback, subtitle, children }: {
    onback: () => void;
    /** Grey line under the large title, e.g. "13 reports · sorted by last edited". */
    subtitle: string;
    /** Search, filters and tabs, shown under the large title. */
    children: Snippet;
  } = $props();

  let title: HTMLHeadingElement;
  let topbar: HTMLElement;
  // iPadOS large title: once it scrolls under the bar, a small title takes its place there.
  let collapsed = $state(false);

  onMount(() => {
    // Browser Forward can close the modal drawer in this same update.
    void tick().then(() => title.focus({ preventScroll: true }));
    const observer = new IntersectionObserver(([entry]) => { collapsed = !entry.isIntersecting; }, {
      root: title.closest('.reports-page'),
      rootMargin: `-${topbar.offsetHeight}px 0px 0px 0px`,
    });
    observer.observe(title);
    return () => observer.disconnect();
  });
</script>

<header class="reports-header" bind:this={topbar}>
  <div class="reports-topbar">
    <div class="reports-header-row reports-topbar-content">
      <button class="reports-back" type="button" aria-label="Back to map" onclick={onback}>
        <svg viewBox="0 0 8 14" fill="none" aria-hidden="true"><path d="M7 1 1 7l6 6" /></svg>
        <span>Map</span>
      </button>
      <!-- Visual echo of the h1 below; screen readers already have the heading. -->
      <span class="reports-topbar-collapsed-title" class:visible={collapsed} aria-hidden="true">Reports</span>
    </div>
  </div>
</header>

<section class="reports-intro" aria-labelledby="reports-title">
  <div class="reports-header-row">
    <h1 id="reports-title" class="reports-large-title" bind:this={title} tabindex="-1">Reports</h1>
    <p class="reports-subtitle">{subtitle}</p>
  </div>
  <!-- Toolbar and tabs bring their own .reports-header-row alignment. -->
  {@render children()}
</section>
