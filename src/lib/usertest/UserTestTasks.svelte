<script lang="ts">
  import { sectionStart, userTestTasks } from './userTestTasks';

  let { open = $bindable(false) }: { open?: boolean } = $props();
  let dialog: HTMLDialogElement;
  let heading: HTMLHeadingElement;

  $effect(() => {
    if (open && !dialog.open) {
      dialog.showModal();
      heading.focus({ preventScroll: true });
    } else if (!open && dialog.open) {
      // Closing the native dialog returns focus to the button that opened it.
      dialog.close();
    }
  });
</script>

<!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_noninteractive_element_interactions -->
<dialog class="user-test-tasks dialog-shell" bind:this={dialog} aria-labelledby="user-test-tasks-heading"
  oncancel={(event) => { event.preventDefault(); open = false; }}
  onclick={(event) => { if (event.target === dialog) open = false; }}>
  <div class="user-test-shell">
    <header class="dialog-header">
      <h2 id="user-test-tasks-heading" bind:this={heading} tabindex="-1">Bruksanvisning for oppgave 1–3</h2>
    </header>

    <div class="dialog-content user-test-scroll">
      {#each userTestTasks as task, taskIndex (task.id)}
        <section class="user-test-task" aria-labelledby={`user-test-task-${task.id}`}>
          <h3 id={`user-test-task-${task.id}`}>{task.title}</h3>
          {#each task.sections as section, sectionIndex (section.heading)}
            <h4>{section.heading}</h4>
            <ol start={sectionStart(userTestTasks[taskIndex], sectionIndex)}>
              {#each section.steps as step (step)}<li>{step}</li>{/each}
            </ol>
            {#if section.note}<p class="user-test-note"><strong>OBS:</strong> {section.note}</p>{/if}
          {/each}
        </section>
      {/each}
    </div>

    <footer class="dialog-footer user-test-footer">
      <button type="button" class="button button--primary" onclick={() => { open = false; }}>Lukk</button>
    </footer>
  </div>
</dialog>

<style>
  .user-test-tasks {
    width: min(var(--dialog-content-max), calc(100dvw - var(--map-control-inset-left) - var(--map-control-inset-right)));
    max-height: calc(100dvh - var(--map-control-inset-top) - var(--map-control-inset-bottom));
    margin: auto;
    padding: 0;
    overflow: hidden;
  }

  .user-test-tasks::backdrop { background: var(--color-background-scrim); }

  .user-test-shell {
    display: flex;
    flex-direction: column;
    max-height: inherit;
  }

  .user-test-scroll {
    flex: 1;
    min-height: 0;
    overflow-y: auto;
    overscroll-behavior: contain;
    overflow-wrap: anywhere;
  }

  .user-test-tasks h2 { margin: 0; font-size: var(--font-size-heading-small); }

  .user-test-task + .user-test-task {
    margin-top: var(--space-6);
    padding-top: var(--space-6);
    border-top: var(--border-default);
  }

  .user-test-task h3 {
    margin: 0;
    font-size: var(--font-size-body);
    font-weight: var(--font-weight-semibold);
    line-height: var(--line-height-tight);
  }

  .user-test-task h4 {
    margin: var(--space-4) 0 var(--space-2);
    color: var(--color-text-secondary);
    font-size: var(--font-size-body-small);
    font-weight: var(--font-weight-semibold);
  }

  .user-test-task ol {
    margin: 0;
    padding-left: var(--space-6);
    line-height: var(--line-height-body);
  }

  .user-test-task li + li { margin-top: var(--space-2); }

  .user-test-note {
    margin: var(--space-3) 0 0;
    padding: var(--space-3) var(--space-4);
    border-left: var(--border-width-emphasis) solid var(--color-status-warning);
    background: var(--color-status-warning-surface);
    line-height: var(--line-height-body);
  }

  .user-test-footer { display: flex; justify-content: flex-end; }
</style>
