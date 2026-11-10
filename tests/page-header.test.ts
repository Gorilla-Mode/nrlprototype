import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { Component } from 'svelte';
import { render } from 'svelte/server';
import { compileSvelteComponent } from './helpers/svelte-server.js';

const url = await compileSvelteComponent('src/lib/components/PageHeader.svelte');
const { default: PageHeader } = await import(url) as {
  default: Component<{ title: string; backLabel: string; onback: () => void }>;
};
const html = render(PageHeader, { props: { title: 'Reports', backLabel: 'Back to map', onback() {} } }).body;

test('the back button is named by its back label, never the page title', () => {
  const button = html.match(/<button[^>]*>[^]*?<\/button>/)?.[0] ?? '';
  assert.match(button, /aria-label="Back to map"/);
  assert.doesNotMatch(button, /Reports/);
});

test('the title stays the page heading beside the button, not inside it, so it can take focus', () => {
  assert.match(html, /<\/button> <h1[^>]*tabindex="-1"[^>]*>Reports<\/h1>/);
  assert.equal((html.match(/<h1/g) ?? []).length, 1);
  // Arrow and title share one wrapper, which the button's hit area covers.
  assert.match(html, /class="page-header-nav[^"]*"><button[^]*<h1[^]*<\/h1><\/div>/);
});
