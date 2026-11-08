import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createRawSnippet, type Component, type Snippet } from 'svelte';
import { render } from 'svelte/server';
import { compileSvelteComponent } from './helpers/svelte-server.js';

type Notice = { title: string; description?: string | Snippet; icon?: 'success' | 'pending' | 'draft'; action?: { label: string; onclick: () => void } };
type Props = { notice: Notice | null; onclose: () => void; duration?: number };
const url = await compileSvelteComponent('src/lib/components/ConfirmationToast.svelte', {
  'svelte/transition': import.meta.resolve('svelte/transition'),
  '../icons/ClockIcon.svelte': await compileSvelteComponent('src/lib/icons/ClockIcon.svelte'),
  '../icons/PencilIcon.svelte': await compileSvelteComponent('src/lib/icons/PencilIcon.svelte'),
  './confirmationDuration': new URL('../src/lib/components/confirmationDuration.js', import.meta.url).href,
});
const { default: ConfirmationToast } = await import(url) as { default: Component<Props> };
const noop = () => {};
const sent: Notice = {
  title: 'Report sent',
  description: "Kartverket will review it. You'll be notified when it's registered.",
  action: { label: 'View report', onclick: noop },
};

test('the live region is always present, so a notice added later is announced', () => {
  const html = render(ConfirmationToast, { props: { notice: null, onclose: noop } }).body;
  assert.match(html, /<div class="confirmation-toast[^"]*" role="status" aria-live="polite">/);
  assert.doesNotMatch(html, /confirmation-toast-card/);
});

test('a sent report is a card: check circle, title, description, View report below, then Close', () => {
  const html = render(ConfirmationToast, { props: { notice: sent, onclose: noop } }).body;
  assert.match(html, /class="confirmation-toast-icon[^"]*" data-icon="success" aria-hidden="true"/);
  assert.match(html, /confirmation-toast-title[^"]*">Report sent<\/p>[\s\S]*confirmation-toast-description[^"]*">Kartverket will review it\. You'll be notified when it's registered\.<\/p>[\s\S]*>View report<\/button>[\s\S]*aria-label="Close"/);
});

test('without a description or action only the title and Close are shown', () => {
  const html = render(ConfirmationToast, { props: { notice: { title: 'Report sent' }, onclose: noop } }).body;
  assert.doesNotMatch(html, /confirmation-toast-description|confirmation-toast-action/);
});

test('a snippet description renders its markup, e.g. the saved status as a tag', () => {
  const description = createRawSnippet(() => ({ render: () => '<span>Saved as <span class="ds-tag" data-status="ready">Ready to send</span>. You can find it in Reports.</span>' }));
  const html = render(ConfirmationToast, { props: { notice: { title: 'Report saved', description, action: { label: 'View report', onclick: noop } }, onclose: noop } }).body;
  assert.match(html, />Report saved<\/p>/);
  assert.match(html, /confirmation-toast-description[^"]*"><span>Saved as <span class="ds-tag" data-status="ready">Ready to send<\/span>\. You can find it in Reports\.<\/span>(<!---->)?<\/p>/);
  assert.match(html, />View report<\/button>/);
});

test('pending shows a clock, not the sent check; success keeps the check', () => {
  const pending = render(ConfirmationToast, { props: { notice: { title: 'Report saved', icon: 'pending' }, onclose: noop } }).body;
  assert.match(pending, /data-icon="pending"[^>]*>(<!--[^>]*-->)?<svg[^>]*><circle cx="12" cy="12" r="10"/);
  assert.doesNotMatch(pending, /M6\.5 12\.5 10\.5 16\.5 17\.5 8/);
  const sent = render(ConfirmationToast, { props: { notice: { title: 'Report sent' }, onclose: noop } }).body;
  assert.match(sent, /data-icon="success"[^>]*>(<!--[^>]*-->)?<svg[^>]*><path d="M6\.5 12\.5 10\.5 16\.5 17\.5 8"/);
});

test('a saved draft shows a grey pencil, its title and Open draft, never the sent check', () => {
  const html = render(ConfirmationToast, { props: { notice: { title: 'Draft saved', icon: 'draft', description: "Your report is saved as a draft and hasn't been sent.", action: { label: 'Open draft', onclick: noop } }, onclose: noop } }).body;
  assert.match(html, /data-icon="draft"[^>]*>(<!--[^>]*-->)?<svg[^>]*><path d="M4 20h4L19 9l-4-4L4 16v4ZM13\.5 6\.5l4 4"/);
  assert.doesNotMatch(html, /M6\.5 12\.5 10\.5 16\.5 17\.5 8/);
  assert.match(html, />Draft saved<\/p>/);
  assert.match(html, />Open draft<\/button>/);
});
