<script lang="ts">
  import type { TutorialEntry } from './tutorial';

  let { block }: { block: TutorialEntry } = $props();
</script>

<section class="tutorial-block" aria-labelledby={`tutorial-${block.id}`}>
  <h3 id={`tutorial-${block.id}`}>{block.header}</h3>
  <div class="tutorial-row question">
    <strong>Question</strong>
    <p>{block.question}</p>
  </div>
  <div class="tutorial-row answer">
    <strong>Answer</strong>
    <p>{block.answer}</p>
  </div>
</section>

<style>
  .tutorial-block { border: var(--border-default); border-radius: var(--radius-card); overflow-wrap: anywhere; }
  h3 { margin: 0; padding: var(--space-4); font-size: var(--font-size-heading-small); line-height: var(--line-height-tight); }
  .tutorial-row { padding: var(--space-4); border-top: var(--border-default); font-size: var(--font-size-body); line-height: var(--line-height-body); }
  .question { background: var(--color-background-subtle); }
  strong { font-size: var(--font-size-body-small); color: var(--color-text-secondary); }
  p { margin: var(--space-2) 0 0; white-space: pre-line; }
</style>
