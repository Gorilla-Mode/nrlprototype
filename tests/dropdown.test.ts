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

test('dropdown is a closed select-only combobox naming its label and showing the chosen value', () => {
  const html = render(Dropdown, { props: { id: 'type', labelledby: 'type-label', options, value: 'bridge' } }).body;
  assert.match(html, /role="combobox"/);
  assert.match(html, /aria-haspopup="listbox"/);
  assert.match(html, /aria-expanded="false"/);
  assert.match(html, /aria-controls="type-listbox"/);
  assert.match(html, /aria-labelledby="type-label type-trigger"/);
  assert.doesNotMatch(html, /aria-activedescendant/);
  assert.match(html, /class="dropdown-value[^"]*">Bridge</);
  assert.match(html, /<ul[^>]*id="type-listbox"[^>]*role="listbox"[^>]*hidden/);
});

test('every option is listed and only the chosen one is selected and checked', () => {
  const html = render(Dropdown, { props: { id: 'type', labelledby: 'type-label', options, value: 'bridge' } }).body;
  const rendered = [...html.matchAll(/<li id="type-option-(\d)"[^>]*role="option"[^>]*aria-selected="(true|false)"[^>]*>([\s\S]*?)<\/li>/g)];
  assert.deepEqual(rendered.map((match) => match[2]), ['false', 'true', 'false']);
  assert.ok(rendered.every((match, index) => match[3].includes(options[index].label)));
  assert.equal(rendered.filter((match) => match[3].includes('dropdown-check')).length, 1);
  assert.ok(rendered[1][3].includes('dropdown-check'));
});
