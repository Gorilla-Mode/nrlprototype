<script lang="ts">
  import { onMount, tick, type Snippet } from 'svelte';
  import LargeTitleHeader from '../components/LargeTitleHeader.svelte';

  let { onback, announcement = '', children }: {
    onback: () => void;
    /** Spoken, not shown: the result count, announced when search, a tab or a filter changes it. */
    announcement?: string;
    /** Search, filters and tabs, shown under the title. */
    children: Snippet;
  } = $props();

  let heading = $state<HTMLHeadingElement>();

  onMount(() => {
    // Browser Forward can close the modal drawer in this same update.
    void tick().then(() => heading?.focus({ preventScroll: true }));
  });
</script>

<!-- "‹ Map" says where it goes; the large title and the tools share the white header area. -->
<LargeTitleHeader title="My reports" backText="Map" backLabel="Back to map" {onback} size="list" areaLabel="Find reports" bind:heading below={children}>
  <!-- The count is in the tabs; screen readers hear it here when it changes. -->
  <p class="sr-only" aria-live="polite">{announcement}</p>
</LargeTitleHeader>
