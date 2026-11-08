import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { Component } from 'svelte';
import { render } from 'svelte/server';
import { compileSvelteComponent } from './helpers/svelte-server.js';
import { compileStatusBadge } from './helpers/statusBadge.js';
import { statusTabs } from '../src/lib/reports/reportsData.js';

const url = await compileStatusBadge();
const { default: StatusBadge } = await import(url) as { default: Component<{ status: 'draft' | 'ready' | 'pending' | 'approved' | 'declined' }> };
const badge = (status: 'draft' | 'ready' | 'pending' | 'approved' | 'declined') => render(StatusBadge, { props: { status } }).body;

test('a ready report is called Ready to send on cards, as in the Reports filter', () => {
  const filterLabel = statusTabs.find((tab) => tab.key === 'ready')?.label;
  assert.equal(filterLabel, 'Ready to send');
  assert.match(badge('ready'), new RegExp(`>${filterLabel}</span>`));
  assert.doesNotMatch(badge('ready'), /Not sent/);
});

test('status colours come from the status tokens per data-status, not a Designsystemet colour', () => {
  for (const status of ['draft', 'ready', 'pending', 'approved', 'declined'] as const) {
    const html = badge(status);
    assert.match(html, new RegExp(`data-status="${status}"`));
    assert.doesNotMatch(html, /data-color=/);
  }
});

test('draft, ready and sent tags carry a decorative pencil, clock and check before the label', () => {
  for (const [status, mark] of [['draft', 'M4 20h4L19 9'], ['ready', 'r="10"'], ['pending', 'M6.5 12.5 10.5 16.5 17.5 8']] as const) {
    const html = badge(status);
    assert.match(html, /<svg[^>]*aria-hidden="true"/);
    assert.ok(html.includes(mark), `${status} icon`);
  }
  assert.doesNotMatch(badge('approved'), /<svg/);
});
