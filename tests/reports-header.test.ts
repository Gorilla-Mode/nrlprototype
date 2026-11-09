import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createRawSnippet, type Component, type Snippet } from 'svelte';
import { render } from 'svelte/server';
import { compileSvelteComponent } from './helpers/svelte-server.js';

const url = await compileSvelteComponent('src/lib/reports/ReportsHeader.svelte', {
  '../components/LargeTitleHeader.svelte': await compileSvelteComponent('src/lib/components/LargeTitleHeader.svelte'),
});
const { default: ReportsHeader } = await import(url) as { default: Component<{ onback: () => void; subtitle: string; children: Snippet }> };
const children = createRawSnippet(() => ({ render: () => '<div class="tools">Search</div>' }));
const html = render(ReportsHeader, { props: { onback: () => {}, subtitle: 'Sorted by last edited', children } }).body.replace(/<!--[^>]*-->/g, '');

test('the bar holds only a back button that says where it goes: ‹ Map, named Back to map', () => {
  const bar = /<header class="large-title-bar[^"]*">([\s\S]*?)<\/header>/.exec(html)?.[1] ?? '';
  assert.match(bar, /^\s*<button type="button" class="large-title-back[^"]*" aria-label="Back to map"><svg[^>]*aria-hidden="true"[\s\S]*?<\/svg>\s*Map<\/button>\s*$/);
  assert.doesNotMatch(bar, /<h1|Reports/);
});

test('the large title opens the header area, above the sort line and the tools, in the content column', () => {
  assert.match(html, /<\/header>\s*<section class="large-title-area[^"]*" aria-label="Find reports"><div class="large-title-row[^"]*"><h1 class="large-title[^"]*\blist\b[^"]*" tabindex="-1">Reports<\/h1>\s*<p class="reports-subtitle[^"]*">Sorted by last edited<\/p>[\s\S]*<div class="tools">Search<\/div>/);
  assert.equal([...html.matchAll(/<h1/g)].length, 1);
});
