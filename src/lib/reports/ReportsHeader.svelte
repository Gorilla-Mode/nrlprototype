<script lang="ts">
  import { onMount, tick, type Snippet } from 'svelte';
  import PageHeader from '../components/PageHeader.svelte';

  let { onback, subtitle, children }: {
    onback: () => void;
    /** Grey line under the header, e.g. "13 reports · sorted by last edited". */
    subtitle: string;
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
  </div>
  <!-- Toolbar and tabs bring their own .reports-header-row alignment. -->
  {@render children()}
</section>
