<script lang="ts">
  import DraftsPage from './DraftsPage.svelte';
  import DraftDetailPage from './DraftDetailPage.svelte';
  import type { Draft } from './types';

  export let onback: () => void = () => {};

  let view: 'list' | 'detail' = 'list';
  let selectedDraft: Draft | null = null;

  const openDraft = (draft: Draft) => {
    selectedDraft = draft;
    view = 'detail';
  };

  const backToList = () => {
    view = 'list';
    selectedDraft = null;
  };
</script>

{#if view === 'detail' && selectedDraft}
  <DraftDetailPage draft={selectedDraft} onBack={backToList} />
{:else}
  <DraftsPage onOpenDraft={openDraft} onBack={onback} />
{/if}
