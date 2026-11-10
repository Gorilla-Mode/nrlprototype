import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { Component } from 'svelte';
import { render } from 'svelte/server';
import type { GeometryKey, HeightFilterKey } from '../src/lib/reports/filtering.js';
import { compileSvelteComponent } from './helpers/svelte-server.js';

const url = await compileSvelteComponent('src/lib/reports/ReportFilters.svelte');
const { default: ReportFilters } = await import(url) as { default: Component<{ geometries: Set<GeometryKey>; heightFilter: HeightFilterKey }> };
const chips = (geometries: GeometryKey[], heightFilter: HeightFilterKey) =>
  render(ReportFilters, { props: { geometries: new Set(geometries), heightFilter } }).body;
const chipText = (html: string) => [...html.matchAll(/<button[^>]*reports-filter-chip[^>]*>\s*([^<]+?)\s*<svg/g)].map((match) => match[1]);

test('chips are popup buttons that start closed', () => {
  const html = chips([], 'any');
  assert.deepEqual(chipText(html), ['Geometry', 'Height']);
  assert.equal([...html.matchAll(/aria-haspopup="dialog" aria-expanded="false"/g)].length, 2);
  assert.doesNotMatch(html, /reports-filter-menu|class="[^"]*active/);
  // Select-style buttons, not round chips.
  assert.equal([...html.matchAll(/class="ds-button reports-tool-button reports-filter-chip/g)].length, 2);
  assert.doesNotMatch(html, /ds-chip/);
});

test('an active filter names its choice and is marked', () => {
  const one = chips(['Polygon'], 'over60');
  assert.deepEqual(chipText(one), ['Geometry: Polygon', 'Height: Over 60 m']);
  assert.equal([...one.matchAll(/reports-filter-chip[^"]*active/g)].length, 2);
  assert.deepEqual(chipText(chips(['Point', 'Line'], 'any')), ['Geometry: 2', 'Height']);
  assert.deepEqual(chipText(chips([], '30to60')), ['Geometry', 'Height: 30–60 m']);
});

const tabsUrl = await compileSvelteComponent('src/lib/reports/StatusTabs.svelte', {
  './reportsData': new URL('../src/lib/reports/reportsData.js', import.meta.url).href,
});
const { default: StatusTabs } = await import(tabsUrl) as { default: Component<{ reports: readonly never[]; draftsCount: number; active: 'all' | 'draft' | 'ready' | 'sent'; onselect: () => void }> };

test('status tabs are toggle buttons; only the chosen one is pressed, each with its count', () => {
  const html = render(StatusTabs, { props: { reports: [], draftsCount: 2, active: 'draft', onselect: () => {} } }).body;
  assert.match(html, /role="group" aria-label="Show reports"/);
  const tabs = [...html.matchAll(/<button type="button" class="reports-status-tab[^"]*" aria-pressed="(true|false)">\s*([^<]+?)\s*<span class="reports-status-tab-count[^"]*">(\d+)<\/span>/g)];
  assert.deepEqual(tabs.map((match) => [match[2], match[1], match[3]]), [['All', 'false', '2'], ['Drafts', 'true', '2'], ['Ready to send', 'false', '0'], ['Sent', 'false', '0']]);
  assert.doesNotMatch(html, /ds-chip|type="radio"|reports-chip-divider/);
});
