<script lang="ts">
  import DraftsPage from './lib/drafts/DraftsPage.svelte';
  import DraftDetailPage from './lib/drafts/DraftDetailPage.svelte';
  import type { Draft } from './lib/drafts/types';

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
  <DraftsPage onOpenDraft={openDraft} />
{/if}
