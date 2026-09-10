import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { test } from 'node:test';
import { pathToFileURL } from 'node:url';
import { createRawSnippet, type Component } from 'svelte';
import { compile } from 'svelte/compiler';
import { render } from 'svelte/server';
import { createRadialSegments, getHoveredRadialSegment, type RadialMenuProps } from '../src/lib/radial-menu/radialMenu.js';

const filename = pathToFileURL(resolve('src/lib/radial-menu/RadialMenu.svelte'));
const source = await readFile(filename, 'utf8');
let { js: { code } } = compile(source, { filename: filename.pathname, generate: 'server' });
for (const specifier of ['svelte/internal/server', 'svelte/internal/flags/legacy']) {
  code = code.replaceAll(`'${specifier}'`, JSON.stringify(import.meta.resolve(specifier)));
}
code = code.replaceAll("'./radialMenu'", JSON.stringify(new URL('../src/lib/radial-menu/radialMenu.js', import.meta.url).href));
const { default: RadialMenu } = await import(`data:text/javascript;base64,${Buffer.from(code).toString('base64')}`) as {
  default: Component<RadialMenuProps>;
};

for (const count of [1, 3, 6]) {
  test(`renders ${count} independently supplied items, including icons and labels`, () => {
    const items = Array.from({ length: count }, (_, index) => ({
      id: `item-${index}`,
      label: `Choice ${index}`,
      color: `var(--color-radial-${['point', 'line', 'polygon'][index % 3]})`,
      icon: createRawSnippet(() => ({ render: () => `<circle data-icon="${index}" cx="12" cy="12" r="8" />` })),
    }));
    const { body } = render(RadialMenu, { props: { items } });
    assert.equal((body.match(/<path /g) ?? []).length, count);
    for (const [index, item] of items.entries()) {
      assert.ok(body.includes(`>${item.label}</text>`));
      assert.ok(body.includes(`fill="${item.color}"`));
      assert.ok(body.includes(`data-icon="${index}"`));
    }
    assert.match(body, /width="224" height="224"/);
    assert.match(body, /role="img" aria-label="Radial menu preview:/);
    assert.doesNotMatch(body, /<button|tabindex|role="menuitem"/);
    assert.doesNotMatch(body, /NaN|Infinity/);
  });
}

test('empty items render nothing and radii are configurable', () => {
  assert.doesNotMatch(render(RadialMenu, { props: { items: [] } }).body, /<svg/);
  const item = { id: 'one', label: 'One', color: 'var(--color-radial-polygon)', icon: createRawSnippet(() => ({ render: () => '<path d="M0 0L24 24" />' })) };
  const { body } = render(RadialMenu, { props: { items: [item], innerRadius: 60, outerRadius: 140 } });
  assert.match(body, /width="280" height="280"/);
  assert.match(body, /viewBox="-140 -140 280 280"/);
  assert.match(body, /A 60 60/);
});

test('three item centers are evenly spaced with point above, line right, and polygon left', () => {
  const segments = createRadialSegments(3, 46, 112);
  assert.ok(Math.abs(segments[0].x) < 1e-10);
  assert.equal(segments[0].y, -79);
  assert.ok(segments[1].x > 0 && segments[1].y > 0);
  assert.ok(segments[2].x < 0 && segments[2].y > 0);
  for (const segment of segments) {
    assert.ok(Math.abs(Math.hypot(segment.x, segment.y) - 79) < 1e-10);
    assert.match(segment.path, /A 46 46/);
    assert.match(segment.path, /A 112 112/);
  }
});

test('one item uses full circles around the safe zone; invalid radii fail clearly', () => {
  const [segment] = createRadialSegments(1, 46, 112);
  assert.equal((segment.path.match(/A 112 112/g) ?? []).length, 2);
  assert.equal((segment.path.match(/A 46 46/g) ?? []).length, 2);
  for (const [inner, outer] of [[0, 112], [112, 46], [46, NaN]]) {
    assert.throws(() => createRadialSegments(3, inner, outer), RangeError);
  }
});

test('hover follows the displayed sectors for one, three, and six items', () => {
  const hover = (x: number, y: number, count: number) => getHoveredRadialSegment({ x, y }, count, 46);
  assert.equal(hover(79, 0, 1), 0);
  assert.equal(hover(-79, 0, 1), 0);
  for (const [index, [x, y]] of [[0, -79], [68, 39], [-68, 39]].entries()) {
    assert.equal(hover(x, y, 3), index);
  }
  for (const [index, [x, y]] of [[0, -79], [68, -39], [68, 39], [0, 79], [-68, 39], [-68, -39]].entries()) {
    assert.equal(hover(x, y, 6), index);
  }
  assert.equal(hover(1, 79, 3), 1);
  assert.equal(hover(-1, 79, 3), 2);
});

test('overshooting keeps targeting by angle, including direct jumps and switching beyond the visible ring', () => {
  const hover = (x: number, y: number) => getHoveredRadialSegment({ x, y }, 3, 46);
  assert.equal(hover(0, 0), null);
  assert.equal(hover(0, -46), null);
  assert.equal(hover(0, -47), 0);
  assert.equal(hover(0, -112), 0);
  assert.equal(hover(0, -125), 0);
  assert.equal(hover(0, -10000), 0, 'overshooting works without first passing through the visible segment');
  assert.equal(hover(10000, 6000), 1, 'a distant neighboring sector can be hovered immediately');
  assert.equal(hover(-10000, 6000), 2);
  assert.equal(hover(0, 0), null, 'returning to the safe zone still clears hover');
  assert.equal(getHoveredRadialSegment({ x: 10000, y: 0 }, 1, 46), 0);
  assert.equal(getHoveredRadialSegment({ x: -6800, y: -3900 }, 6, 46), 5);
  assert.equal(getHoveredRadialSegment(null, 3, 46), null);
  assert.equal(getHoveredRadialSegment({ x: 0, y: -79 }, 0, 46), null);
});

test('hover uses custom radii and expansion while keeping the original safe zone', () => {
  assert.equal(getHoveredRadialSegment({ x: 0, y: -55 }, 3, 60), null);
  assert.equal(getHoveredRadialSegment({ x: 0, y: -150 }, 3, 60), 0);
  const [normal] = createRadialSegments(3, 60, 140);
  const [expanded] = createRadialSegments(3, 60, 160);
  assert.match(normal.path, /A 60 60/);
  assert.match(expanded.path, /A 60 60/);
  assert.match(expanded.path, /A 160 160/);
});
