import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { Component } from 'svelte';
import { render } from 'svelte/server';
import type { Draft } from '../src/lib/drafts/types.js';
import { ObstacleType } from '../src/lib/reporting/obstacle.js';
import { drafts } from './helpers/reportFixtures.js';
import { compileSvelteComponent } from './helpers/svelte-server.js';
import { compileStatusBadge } from './helpers/statusBadge.js';

const url = await compileSvelteComponent('src/lib/drafts/DraftCard.svelte', {
  '../reports/StatusBadge.svelte': await compileStatusBadge(),
  './types': new URL('../src/lib/drafts/types.js', import.meta.url).href,
  '../reports/reportsData': new URL('../src/lib/reports/reportsData.js', import.meta.url).href,
  '../obstacles/errorReport': new URL('../src/lib/obstacles/errorReport.js', import.meta.url).href,
  '../reports/reportGeometry': new URL('../src/lib/reports/reportGeometry.js', import.meta.url).href,
  '../reports/placeName': new URL('../src/lib/reports/placeName.js', import.meta.url).href,
  '../icons/PinIcon.svelte': await compileSvelteComponent('src/lib/icons/PinIcon.svelte'),
});
const { default: DraftCard } = await import(url) as { default: Component<{ draft: Draft; justSaved?: boolean }> };
const base: Draft = { ...drafts[0], category: ObstacleType.Other, heightAboveGround: '30 m (98 ft)' };
const card = (draft: Draft, justSaved = false) => render(DraftCard, { props: { draft, justSaved } }).body;

test('a draft without a type is an untitled obstacle in muted text, never Other', () => {
  const html = card({ ...base, typeMissing: true });
  assert.match(html, /<span class="reports-card-untitled">Untitled obstacle<\/span>/);
  assert.match(html, /30&nbsp;m|30 m/);
  assert.doesNotMatch(html, />Other/);
});

test('Other shows only when the pilot chose it', () => {
  assert.match(card(base), /class="reports-card-name">Other · 30 m</);
});

test('only the just-saved draft card is marked', () => {
  assert.match(card(base, true), /class="ds-card reports-card[^"]*reports-card-just-saved/);
  assert.doesNotMatch(card(base, false), /reports-card-just-saved/);
});

test('a draft saved with no type (null) is also an untitled obstacle and lists the type as missing', () => {
  const html = card({ ...base, category: null });
  assert.match(html, /<span class="reports-card-untitled">Untitled obstacle<\/span>/);
  assert.match(html, /Missing: obstacle type/);
  assert.doesNotMatch(html, />Other/);
});
