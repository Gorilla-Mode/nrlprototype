import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { test } from 'node:test';
import type { Component } from 'svelte';
import { compile } from 'svelte/compiler';
import { render } from 'svelte/server';
import { reportingGuideRoute, reportingGuideBlocks, tutorialBlocks, type TutorialEntry } from '../src/lib/map/tutorial.js';

test('reporting guide has a public hash route and describes the active placement variant', () => {
  assert.equal(reportingGuideRoute, '#/Help/ReportObstacle');
  const answers = (variant: Parameters<typeof reportingGuideBlocks>[0]) => reportingGuideBlocks(variant).map(b => b.answer).join(' ');
  assert.match(answers('persistent-donut'), /release to choose it, or release in the center to keep it open/);
  assert.match(answers('persistent-donut'), /pan the map beneath the fixed donut/);
  assert.match(answers('persistent-donut'), /Later center taps cancel/);
  assert.match(answers('persistent-donut'), /16 px, or 64 px with Shift/);
  assert.match(answers('persistent-donut'), /1\/2\/3/);
  assert.match(answers('basic'), /100 ms with touch, or 200 ms with a mouse or pen/);
  assert.match(answers('basic'), /72 px across/);
  assert.match(answers('basic'), /Basic keeps Point editable/);
  assert.match(answers('two-finger'), /edit it immediately/);
  assert.match(answers('two-finger'), /second finger/);
  assert.match(answers('default'), /Point opens the report form immediately/);
  for (const variant of ['default', 'basic', 'persistent-donut', 'two-finger'] as const) {
    assert.match(answers(variant), /reloading loses the draft and result/);
    assert.match(answers(variant), /do not update the sample Reports or Draft lists/);
    assert.match(answers(variant), /Add point/);
    assert.doesNotMatch(answers(variant), /reports I have submitted|stored locally/);
  }
});

async function compileComponent(name: string, imports: Record<string, string> = {}) {
  const filename = resolve(`src/lib/map/${name}.svelte`);
  const source = await readFile(filename, 'utf8');
  let { js: { code } } = compile(source, { filename, generate: 'server' });
  for (const specifier of ['svelte', 'svelte/internal/server', 'svelte/internal/flags/legacy']) {
    code = code.replaceAll(`'${specifier}'`, JSON.stringify(import.meta.resolve(specifier)));
  }
  for (const [specifier, url] of Object.entries(imports)) {
    code = code.replaceAll(`'${specifier}'`, JSON.stringify(url));
  }
  return `data:text/javascript;base64,${Buffer.from(code).toString('base64')}`;
}

const blockUrl = await compileComponent('TutorialBlock');
const guideUrl = await compileComponent('ReportObstacleGuide', {
  './TutorialBlock.svelte': blockUrl,
  './tutorial': new URL('../src/lib/map/tutorial.js', import.meta.url).href,
});
const { default: ReportObstacleGuide } = await import(guideUrl) as {
  default: Component<{ blocks?: readonly TutorialEntry[]; onback: () => void }>;
};
const body = (blocks?: readonly TutorialEntry[]) => render(ReportObstacleGuide, { props: { blocks, onback() {} } }).body;

test('an empty guide retains the page heading and back control', () => {
  const html = body([]);
  assert.match(html, /<h1[^>]*tabindex="-1"[^>]*>How to Report an Obstacle<\/h1>/);
  assert.match(html, /aria-label="Back"/);
  assert.match(html, /<main[^>]*aria-label="How to Report an Obstacle"/);
  assert.doesNotMatch(html, /<dialog|Close tutorial/);
  assert.doesNotMatch(html, /<section/);
});

test('one block renders its header and always-visible question and answer as escaped text', () => {
  const html = body([{ id: 'single', header: 'A header', question: 'A <question>?', answer: 'First line\nSecond <line>' }]);
  assert.equal((html.match(/<section/g) ?? []).length, 1);
  assert.match(html, /<h3[^>]*>A header<\/h3>/);
  assert.match(html, /<strong[^>]*>Question<\/strong>/);
  assert.match(html, /A &lt;question>\?/);
  assert.match(html, /<strong[^>]*>Answer<\/strong>/);
  assert.match(html, /First line\nSecond &lt;line>/);
  assert.doesNotMatch(html, /<details|(?<!aria-)hidden=|aria-expanded/);
});

test('many long blocks render in list order without truncation or a count limit', () => {
  const blocks = Array.from({ length: 40 }, (_, index) => ({
    id: `entry-${index}`, header: `Header ${index}`, question: `Question ${index}?`,
    answer: `Answer ${index}: ${'Long tutorial text. '.repeat(100)}\nLast line ${index}.`,
  }));
  const html = body(blocks);
  assert.equal((html.match(/<section/g) ?? []).length, blocks.length);
  let previous = -1;
  for (const block of blocks) {
    const position = html.indexOf(`id="tutorial-${block.id}"`);
    assert.ok(position > previous);
    assert.ok(html.includes(block.answer));
    previous = position;
  }
});

test('the default tutorial provides real guidance blocks with unique IDs and no placeholder text', () => {
  assert.ok(tutorialBlocks.length > 0);
  assert.equal(new Set(tutorialBlocks.map(({ id }) => id)).size, tutorialBlocks.length);
  for (const block of tutorialBlocks) {
    assert.doesNotMatch(block.header, /Placeholder/i);
    assert.doesNotMatch(block.answer, /Placeholder/i);
  }
  assert.equal((body().match(/<section/g) ?? []).length, tutorialBlocks.length);
});
