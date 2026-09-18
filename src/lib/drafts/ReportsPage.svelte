<script lang="ts">
  import DraftsPage from './DraftsPage.svelte';
  import DraftDetailPage from './DraftDetailPage.svelte';
  import ReportDetailPage from './ReportDetailPage.svelte';
  import type { Draft, Report } from './types';

  export let onback: () => void = () => {};

  let view: 'list' | 'draft-detail' | 'report-detail' = 'list';
  let listTab: 'reports' | 'drafts' = 'reports';
  let selectedDraft: Draft | null = null;
  let selectedReport: Report | null = null;

  const openDraft = (draft: Draft) => {
    selectedDraft = draft;
    listTab = 'drafts';
    view = 'draft-detail';
  };

  const openReport = (report: Report) => {
    selectedReport = report;
    listTab = 'reports';
    view = 'report-detail';
  };

  const backToList = () => {
    view = 'list';
    selectedDraft = null;
    selectedReport = null;
  };
</script>

{#if view === 'draft-detail' && selectedDraft}
  <DraftDetailPage draft={selectedDraft} onBack={backToList} />
{:else if view === 'report-detail' && selectedReport}
  <ReportDetailPage report={selectedReport} onBack={backToList} />
{:else}
  <DraftsPage onOpenDraft={openDraft} onOpenReport={openReport} onBack={onback} bind:view={listTab} />
{/if}
