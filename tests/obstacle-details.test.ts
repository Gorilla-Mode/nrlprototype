import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { Component } from 'svelte';
import { render } from 'svelte/server';
import { compileSvelteComponent } from './helpers/svelte-server.js';
import { draft, viewProps } from './helpers/reporting.js';
import { ObstacleType, obstacleTypeChoices } from '../src/lib/reporting/obstacle.js';
import type { ReportingVariantProps } from '../src/lib/reporting/reportingVariantProps.js';

const obstacleUrl = new URL('../src/lib/reporting/obstacle.js', import.meta.url).href;
const reportingUrl = new URL('../src/lib/reporting/reporting.js', import.meta.url).href;
const icon = await compileSvelteComponent('src/lib/reporting/ObstacleTypeIcon.svelte', { './obstacle': obstacleUrl });
const wheel = await compileSvelteComponent('src/lib/reporting/HeightWheel.svelte', { './reporting': reportingUrl });
const keypad = await compileSvelteComponent('src/lib/reporting/HeightKeypad.svelte');
const url = await compileSvelteComponent('src/lib/reporting/ObstacleDetails.svelte', {
  './reporting': reportingUrl,
  './obstacle': obstacleUrl,
  './HeightKeypad.svelte': keypad,
  './createDetailsController': new URL('../src/lib/reporting/createDetailsController.js', import.meta.url).href,
  './HeightWheel.svelte': wheel,
  './ObstacleTypeIcon.svelte': icon,
});
const { default: Details } = await import(url) as { default: Component<ReportingVariantProps> };

test('two-step first view exposes the same six types and shared height range, with Continue', () => {
  const html = render(Details, { props: viewProps(draft(), { totalSteps: 2 }) }).body;
  for (const choice of obstacleTypeChoices) assert.ok(html.includes(choice.label));
  assert.ok(html.includes('aria-valuemin="0" aria-valuemax="500"'));
  assert.ok(html.includes('aria-valuenow="30"'));
  assert.match(html, /disabled[^>]*>Continue/);
  assert.doesNotMatch(html, /Finish Report/);
});

test('two-step final view exposes custom type, description, photos, and Finish without a back button', () => {
  const html = render(Details, { props: viewProps(draft({ type: ObstacleType.Other, photos: [new File([], 'photo.jpg')] }), { step: 2, totalSteps: 2 }) }).body;
  assert.ok(html.includes('Custom obstacle type'));
  assert.ok(html.includes('Remove photo 1: photo.jpg'));
  assert.ok(html.includes('accept="image/*" multiple'));
  assert.ok(html.includes('capture="environment"'));
  assert.doesNotMatch(html, /Back to step 1/);
  assert.ok(html.includes('Close obstacle details'));
  assert.match(html, />Finish Report/);
});

test('two-step busy state disables final actions and announces errors', () => {
  const html = render(Details, { props: viewProps(draft({ type: ObstacleType.Pole }), { step: 2, totalSteps: 2, busy: true, error: 'Please retry.' }) }).body;
  assert.match(html, /disabled[^>]*>Finish Report/);
  assert.match(html, /disabled[^>]*>Save Draft/);
  assert.match(html, /role="alert"[^>]*>Please retry/);
});

const wrapper = await compileSvelteComponent('src/lib/reporting/ObstacleDetailsKeypad.svelte', { './ObstacleDetails.svelte': url });
const { default: KeypadDetails } = await import(wrapper) as { default: Component<ReportingVariantProps> };

test('keypad variant shows draft metres on step 1 instead of the wheel and retains step 2', () => {
  for (const height of [0, 30, 123, 500]) {
    const html = render(KeypadDetails, { props: viewProps(draft({ height }), { totalSteps: 2 }) }).body;
    assert.match(html, new RegExp(`>${height} m</button>`));
    assert.match(html, /aria-haspopup="dialog"/);
    assert.doesNotMatch(html, /role="spinbutton"|class="height-keypad/);
  }
  const html = render(KeypadDetails, { props: viewProps(draft(), { step: 2, totalSteps: 2 }) }).body;
  assert.match(html, /Additional Information/);
  assert.match(html, /Finish Report/);
  assert.doesNotMatch(html, /height-button/);
});

test('keypad height trigger is disabled while busy or Not present', () => {
  for (const [busy, notPresent] of [[true, false], [false, true]]) {
    const html = render(KeypadDetails, { props: viewProps(draft({ notPresent }), { totalSteps: 2, busy }) }).body;
    assert.match(html, /aria-haspopup="dialog" disabled[^>]*>30 m/);
  }
});
