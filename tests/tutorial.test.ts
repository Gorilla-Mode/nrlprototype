import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { Component } from 'svelte';
import { render } from 'svelte/server';
import { guideProgressStep, reportingGuideRoute } from '../src/lib/map/tutorial.js';
import { compileSvelteComponent } from './helpers/svelte-server.js';

test('the reporting guide keeps its public hash route', () => {
  assert.equal(reportingGuideRoute, '#/Help/ReportObstacle');
});

test('reading progress follows the last section scrolled under the threshold and completes at the end', () => {
  assert.equal(guideProgressStep([], 100, false), 0);
  assert.equal(guideProgressStep([150, 900, 1600], 100, false), 0);
  assert.equal(guideProgressStep([-400, 80, 700], 100, false), 1);
  assert.equal(guideProgressStep([-400, 100, 700], 100, false), 1);
  assert.equal(guideProgressStep([-900, -300, 40], 100, false), 2);
  assert.equal(guideProgressStep([-900, -300, 400], 100, true), 2);
});

// The example map needs WebGL, so a server render substitutes an empty stand-in.
const mapStub = `data:text/javascript;base64,${Buffer.from(
  `export default function GuideExampleMap($$renderer, $$props) { $$renderer.push('<div data-example-map="' + $$props.label + '"></div>'); }`,
).toString('base64')}`;
const guideUrl = await compileSvelteComponent('src/lib/map/ReportObstacleGuide.svelte', {
  '../guide/StepSection.svelte': await compileSvelteComponent('src/lib/guide/StepSection.svelte'),
  '../guide/ToolOptionCard.svelte': await compileSvelteComponent('src/lib/guide/ToolOptionCard.svelte'),
  '../guide/GuideExample.svelte': await compileSvelteComponent('src/lib/guide/GuideExample.svelte'),
  './GuideExampleMap.svelte': mapStub,
  './tutorial': new URL('../src/lib/map/tutorial.js', import.meta.url).href,
});
const { default: ReportObstacleGuide } = await import(guideUrl) as {
  default: Component<{ onback: () => void; onclose: () => void }>;
};
const html = render(ReportObstacleGuide, { props: { onback() {}, onclose() {} } }).body;
const text = html.replace(/<!--[^]*?-->/g, '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');

test('the guide has one focusable page title, labelled back and close controls and step progress', () => {
  assert.match(html, /<main[^>]*aria-label="How to report an obstacle"/);
  assert.equal((html.match(/<h1/g) ?? []).length, 1);
  assert.match(html, /<h1[^>]*tabindex="-1"[^>]*>How to report an obstacle<\/h1>/);
  assert.match(html, /<button[^>]*aria-label="Back"/);
  assert.match(html, /<button[^>]*aria-label="Close guide"/);
  assert.match(html, /role="progressbar"[^>]*aria-valuemin="1"[^>]*aria-valuemax="5"[^>]*aria-valuenow="1"[^>]*aria-valuetext="Step 1 of 5"/);
  assert.doesNotMatch(html, /<dialog/);
});

test('five numbered steps render as h2 headings in Figma order, with h3 drawing tools under step 01', () => {
  const headings = [...html.matchAll(/<h2[^>]*>([^]*?)<\/h2>/g)].map(([, inner]) => inner.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim());
  assert.deepEqual(headings, [
    'STEP 01 Place the obstacle on the map',
    'STEP 02 Obstacle details',
    'STEP 03 Height',
    'STEP 04 Illuminated',
    'STEP 05 Add description / Additional info',
  ]);
  assert.equal((html.match(/data-guide-step/g) ?? []).length, 5);
  const tools = [...html.matchAll(/<h3[^>]*>([^<]*)<\/h3>/g)].map(([, inner]) => inner);
  assert.deepEqual(tools, ['Point', 'Line', 'Area']);
  assert.ok(html.indexOf('>Area</h3>') < html.indexOf('STEP 02'));
});

test('the guide uses the Figma copy', () => {
  for (const copy of [
    'Follow these steps to report an obstacle accurately.',
    'Everything is saved as you go.',
    'Each step is added to the same obstacle report draft automatically — you never need to save between steps.',
    'The map opens at your current location and uses it as the starting point for the report.',
    'Tap the map where you want to place the obstacle. The drawing tools open around that spot — choose Point, Line or Area.',
    'For obstacles represented by a single location. Tap once on the map to drop a marker at the obstacle’s exact location.',
    'For obstacles that extend along a route or have a linear shape, such as a power line. Tap to add each vertex, then tap Finish line when done.',
    'For obstacles that cover a larger surface. Tap to add the polygon’s corners, then tap Close area to complete the shape.',
    'You can cancel at any time during drawing and start over.',
    'Tap Complete selection and the obstacle report opens with the shape already attached.',
    'Check that the obstacle is positioned correctly on the map.',
    'Tip: Select Other when none of the available categories accurately describe the obstacle.',
    'Height — the height of the obstacle above ground level, in metres (m). Scroll to the value that matches the obstacle.',
    'Illuminated — whether the obstacle is lit. Select Unknown if you are not sure.',
    'Important information about the surrounding area.',
    'Review the information and finish the report when everything is correct.',
    'Drawing guide Point, Line and Area in detail',
  ]) assert.ok(text.includes(copy), copy);
});

test('step 01 shows the example map; form examples are pictures without controls', () => {
  assert.match(html, /data-example-map="Example map: a Point obstacle placed beside a road"/);
  const examples = [...html.matchAll(/<div[^>]*class="guide-example[^"]*"[^>]*role="img"[^>]*aria-label="([^"]+)"[^>]*>([^]*?)<\/div><!---->/g)];
  assert.equal(examples.length, 5);
  for (const [, label, inner] of examples) {
    assert.ok(label.startsWith('Example of'));
    assert.doesNotMatch(inner, /<(?:button|input|select|textarea|a)\b|tabindex/);
  }
  assert.doesNotMatch(html, /<(?:input|select|textarea|form)\b/);
  // Only the app bar and the related Drawing guide link are actions.
  assert.equal((html.match(/<button/g) ?? []).length, 3);
});
