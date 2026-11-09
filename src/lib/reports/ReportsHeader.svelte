<script lang="ts">
  import { onMount, tick, type Snippet } from 'svelte';
  import LargeTitleHeader from '../components/LargeTitleHeader.svelte';

  let { onback, subtitle, announcement = '', children }: {
    onback: () => void;
    /** Grey line under the title: how the list is sorted. */
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

<!-- "‹ Map" says where it goes; the large title, sort line and tools share the white header area. -->
<LargeTitleHeader title="Reports" backText="Map" backLabel="Back to map" {onback} size="list" areaLabel="Find reports" bind:heading below={children}>
  <p class="reports-subtitle">{subtitle}</p>
  <!-- The count is in the tabs; screen readers hear it here when it changes. -->
  <p class="sr-only" aria-live="polite">{announcement}</p>
</LargeTitleHeader>

<style>
  .reports-subtitle { margin-top: var(--space-1); }
</style>
