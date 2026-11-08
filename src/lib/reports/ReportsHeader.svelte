<script lang="ts">
  import { onMount, tick, type Snippet } from 'svelte';
  import PageHeader from '../components/PageHeader.svelte';

  let { onback, subtitle, announcement = '', children }: {
    onback: () => void;
    /** Grey line under the header: how the list is sorted. */
    subtitle: string;
    /** Spoken, not shown: the result count, announced when search, a tab or a filter changes it. */
    announcement?: string;
    /** Search, filters and tabs, shown under the subtitle. */
    children: Snippet;
  } = $props();

  let heading = $state<HTMLHeadingElement>();

  onMount(() => {
    // Browser Forward can close the modal drawer in this same update.
    void tick().then(() => heading?.focus({ preventScroll: true }));
  });
</script>

<PageHeader title="Reports" backLabel="Back to map" {onback} bind:heading />

<section class="reports-intro" aria-label="Find reports">
  <div class="reports-header-row">
    <p class="reports-subtitle">{subtitle}</p>
    <!-- The count is in the tabs; screen readers hear it here when it changes. -->
    <p class="sr-only" aria-live="polite">{announcement}</p>
  </div>
  <!-- Toolbar and tabs bring their own .reports-header-row alignment. -->
  {@render children()}
</section>
