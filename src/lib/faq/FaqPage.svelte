<script lang="ts">
  import { onMount, tick } from 'svelte';
  import { slide } from 'svelte/transition';
  import { filterFaq } from './faq.js';

  let { onback }: { onback: () => void } = $props();
  let query = $state('');
  let expanded = $state<string | null>(null);
  let reducedMotion = $state(false);
  let revealDuration = $state(0);
  let title: HTMLHeadingElement;
  let search: HTMLInputElement;
  let sections = $derived(filterFaq(query));
  let resultCount = $derived(sections.reduce((count, section) => count + section.questions.length, 0));

  function searchQuestions(value: string) {
    query = value;
    if (!sections.some(section => section.questions.some(question => question.id === expanded))) expanded = null;
  }

  onMount(() => {
    // Browser Forward can close the modal drawer in this same update.
    void tick().then(() => title.focus({ preventScroll: true }));
    revealDuration = Number.parseFloat(getComputedStyle(title).getPropertyValue('--faq-reveal-duration'));
    const preference = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => { reducedMotion = preference.matches; };
    update();
    preference.addEventListener('change', update);
    return () => preference.removeEventListener('change', update);
  });
</script>

{#snippet infoIcon()}
  <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><circle cx="12" cy="12" r="9" /><path d="M12 11v6m0-10v1" /></svg>
{/snippet}

{#snippet unavailableAction(label: string, id: string, primary = false)}
  <div class="faq-unavailable">
    <button type="button" class:faq-primary={primary} class:faq-link={!primary} disabled aria-describedby={id}>
      {label}
      {#if !primary}<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="m9 5 7 7-7 7" /></svg>{/if}
    </button>
    <p id={id} class="faq-availability">{label === 'View drawing instructions' ? 'Drawing instructions belong to How to Report an Obstacle, which is not available in this prototype.' : 'Not available in this prototype.'}</p>
  </div>
{/snippet}

<main class="faq-page" aria-label="FAQ">
  <header class="faq-header">
    <div class="faq-header-content">
      <button class="faq-icon-button" type="button" aria-label="Back to map" onclick={onback}>
        <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M15 5l-7 7 7 7" /></svg>
      </button>
      <span>FAQ</span>
    </div>
  </header>

  <div class="faq-content">
    <h1 bind:this={title} tabindex="-1">FAQ</h1>
    <p class="faq-introduction">Find answers about reporting, drawing, drafts and submitted reports.</p>
    <p class="faq-prototype"><strong>Prototype:</strong> Reporting, saved drafts and registrar review are not available in this version. The answers below describe the intended reporting workflow.</p>

    <div class="faq-search">
      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6.5" /><path d="m16 16 5 5" /></svg>
      <input bind:this={search} type="search" aria-label="Search questions" placeholder="Search questions" value={query} oninput={(event) => searchQuestions(event.currentTarget.value)} />
      {#if query}
        <button class="faq-icon-button" type="button" aria-label="Clear search" onclick={() => { searchQuestions(''); search.focus(); }}>
          <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="m6 6 12 12M6 18 18 6" /></svg>
        </button>
      {/if}
    </div>
    <p class="sr-only" role="status">{resultCount} {resultCount === 1 ? 'question' : 'questions'} found</p>

    <aside class="faq-safety" aria-labelledby="faq-safety-heading">
      {@render infoIcon()}
      <div><h2 id="faq-safety-heading">Safety first</h2><p>Only use the app when it is safe to do so and in accordance with your operating procedures.</p></div>
    </aside>

    {#each sections as section (section.title)}
      <section class="faq-section" aria-labelledby={`faq-section-${section.questions[0].id}`}>
        <h2 id={`faq-section-${section.questions[0].id}`}>{section.title}</h2>
        <div class="faq-card">
          {#each section.questions as question (question.id)}
            <div class="faq-item">
              <h3>
                <button id={`faq-question-${question.id}`} class="faq-question" type="button" aria-expanded={expanded === question.id} aria-controls={`faq-answer-${question.id}`} onclick={() => { expanded = expanded === question.id ? null : question.id; }}>
                  <span>{question.question}</span>
                  <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d={expanded === question.id ? 'm5 15 7-7 7 7' : 'm5 9 7 7 7-7'} /></svg>
                </button>
              </h3>
              <div id={`faq-answer-${question.id}`} role="region" aria-labelledby={`faq-question-${question.id}`} inert={expanded !== question.id}>
                {#if expanded === question.id}
                  <div transition:slide={{ duration: reducedMotion ? 0 : revealDuration }}>
                    <div class="faq-answer">
                      <p>{question.answer}</p>
                      {#if question.note}<div class="faq-note">{@render infoIcon()}<p>{question.note}</p></div>{/if}
                      {#if question.link}{@render unavailableAction(question.link, `faq-unavailable-${question.id}`)}{/if}
                    </div>
                  </div>
                {/if}
              </div>
            </div>
          {/each}
        </div>
      </section>
    {:else}
      <section class="faq-empty" aria-labelledby="faq-empty-heading">
        <h2 id="faq-empty-heading">No questions found</h2>
        {@render unavailableAction('Contact support', 'faq-empty-unavailable')}
      </section>
    {/each}

    <section class="faq-help" aria-labelledby="faq-help-heading">
      <h2 id="faq-help-heading">Still need help?</h2>
      <p>Contact support if you cannot find the answer you need.</p>
      {@render unavailableAction('Help and contact', 'faq-help-unavailable', true)}
    </section>
  </div>
</main>
