import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { Component } from 'svelte';
import { render } from 'svelte/server';
import { compileSvelteComponent } from './helpers/svelte-server.js';

interface DropdownProps {
  id: string;
  labelledby: string;
  options: readonly { value: string; label: string }[];
  value: string;
}

const url = await compileSvelteComponent('src/lib/reports/Dropdown.svelte');
const { default: Dropdown } = await import(url) as { default: Component<DropdownProps> };

const options = [
  { value: 'airspan', label: 'Aerial Span' },
  { value: 'bridge', label: 'Bridge' },
  { value: 'other', label: 'Other' },
];

test('dropdown is a native select named by its label', () => {
  const html = render(Dropdown, { props: { id: 'type', labelledby: 'type-label', options, value: 'bridge' } }).body;
  assert.match(html, /<select[^>]*id="type"[^>]*aria-labelledby="type-label"/);
  assert.doesNotMatch(html, /role="combobox"|role="listbox"/);
});

test('every option is listed and only the chosen one is selected', () => {
  const html = render(Dropdown, { props: { id: 'type', labelledby: 'type-label', options, value: 'bridge' } }).body;
  const rendered = [...html.matchAll(/<option([^>]*)>([^<]*)<\/option>/g)];
  assert.deepEqual(rendered.map((match) => match[2]), options.map((option) => option.label));
  assert.deepEqual(rendered.map((match) => /\bselected\b/.test(match[1])), [false, true, false]);
});
