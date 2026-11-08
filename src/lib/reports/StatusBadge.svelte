<script lang="ts">
  import type { Component } from 'svelte';
  import type { ReportStatus } from './reportsData';
  import PencilIcon from '../icons/PencilIcon.svelte';
  import ClockIcon from '../icons/ClockIcon.svelte';
  import CheckIcon from '../icons/CheckIcon.svelte';

  /** A report's or draft's status as a Designsystemet tag; the label always names the status. */
  let { status }: { status: ReportStatus | 'draft' } = $props();

  // One name per status everywhere: the Reports filter says "Ready to send", so do the cards.
  const labels: Record<ReportStatus | 'draft', string> = {
    draft: 'Draft',
    ready: 'Ready to send',
    pending: 'Sent',
    approved: 'Approved',
    declined: 'Declined',
  };
  // Decorative: the label says the status. Draft pencil, Ready to send clock, Sent check.
  const icons: Partial<Record<ReportStatus | 'draft', Component>> = { draft: PencilIcon, ready: ClockIcon, pending: CheckIcon };
  let Icon = $derived(icons[status]);
</script>

<!-- Colours come from the --color-status-* tokens, set per data-status in stylesheet.css. -->
<span class="ds-tag reports-status-badge" data-size="sm" data-status={status}>{#if Icon}<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><Icon /></svg>{/if}{labels[status]}</span>
