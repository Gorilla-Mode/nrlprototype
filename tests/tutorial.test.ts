import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { test } from 'node:test';
import type { Component } from 'svelte';
import { compile } from 'svelte/compiler';
import { render } from 'svelte/server';
import { tutorialBlocks, type TutorialEntry } from '../src/lib/map/tutorial.js';

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
const dialogUrl = await compileComponent('TutorialDialog', {
  './TutorialBlock.svelte': blockUrl,
  './tutorial': new URL('../src/lib/map/tutorial.js', import.meta.url).href,
});
const { default: TutorialDialog } = await import(dialogUrl) as {
  default: Component<{ blocks?: readonly TutorialEntry[]; ondismiss: () => void }>;
};
const body = (blocks?: readonly TutorialEntry[]) => render(TutorialDialog, { props: { blocks, ondismiss() {} } }).body;

test('an empty tutorial retains its title, close control and keyboard scroll region', () => {
  const html = body([]);
  assert.match(html, /<h2[^>]*>Tutorial<\/h2>/);
  assert.match(html, /aria-label="Close tutorial"/);
  assert.match(html, /tabindex="0" role="region" aria-label="Tutorial content"/);
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
  assert.doesNotMatch(html, /<details|hidden|aria-expanded/);
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

test('the default tutorial provides two clearly labeled placeholders with unique IDs', () => {
  assert.equal(tutorialBlocks.length, 2);
  assert.equal(new Set(tutorialBlocks.map(({ id }) => id)).size, 2);
  for (const block of tutorialBlocks) assert.match(block.header, /Placeholder/);
  assert.equal((body().match(/<section/g) ?? []).length, 2);
});
