import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { test } from 'node:test';
import { pathToFileURL } from 'node:url';
import type { Component } from 'svelte';
import { compile } from 'svelte/compiler';
import { render } from 'svelte/server';
import type { LocationSuggestion } from '../src/lib/map/locationSearch.js';

const filename = pathToFileURL(resolve('src/lib/map/SearchBar.svelte'));
const source = await readFile(filename, 'utf8');
let { js: { code } } = compile(source, { filename: filename.pathname, generate: 'server' });
for (const specifier of ['svelte/internal/server', 'svelte/internal/flags/legacy', 'svelte']) {
  code = code.replaceAll(`'${specifier}'`, JSON.stringify(import.meta.resolve(specifier)));
}
for (const file of ['createLocationSearchController', 'locationSearch']) {
  code = code.replaceAll(`'./${file}.js'`, JSON.stringify(new URL(`../src/lib/map/${file}.js`, import.meta.url).href));
}
const { default: SearchBar } = await import(`data:text/javascript;base64,${Buffer.from(code).toString('base64')}`) as {
  default: Component<{ onselect: (suggestion: LocationSuggestion) => void }>;
};
const body = () => render(SearchBar, { props: { onselect: () => {} } }).body;

test('the field is enabled and wired as an ARIA combobox over the suggestion listbox', () => {
  const html = body();
  assert.doesNotMatch(html, /<input[^>]*\sdisabled/, 'the placeholder disabled attribute is gone');
  assert.match(html, /role="combobox"/);
  assert.match(html, /aria-autocomplete="list"/);
  assert.match(html, /aria-controls="location-suggestions"/);
  assert.match(html, /id="location-suggestions"/);
  assert.match(html, /role="listbox"/);
  assert.match(html, /placeholder="Search place or address"/);
});

test('an untouched field offers no options and claims no active descendant', () => {
  const html = body();
  assert.match(html, /aria-expanded="false"/);
  assert.doesNotMatch(html, /role="option"/);
  assert.doesNotMatch(html, /aria-activedescendant/);
  assert.match(html, /role="status"/, 'result counts have somewhere to be announced');
});
