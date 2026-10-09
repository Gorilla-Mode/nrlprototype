import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { test } from 'node:test';
import { pathToFileURL } from 'node:url';
import { createRawSnippet, type Component } from 'svelte';
import { compile } from 'svelte/compiler';
import { render } from 'svelte/server';
import { compileSvelteComponent } from './helpers/svelte-server.js';
import { createRadialSegments, defaultRadialMenuRadii, getHoveredRadialSegment, type RadialMenuProps } from '../src/lib/radial-menu/radialMenu.js';

const filename = pathToFileURL(resolve('src/lib/radial-menu/RadialMenu.svelte'));
const source = await readFile(filename, 'utf8');
let { js: { code } } = compile(source, { filename: filename.pathname, generate: 'server' });
for (const specifier of ['svelte/internal/server', 'svelte/internal/flags/legacy']) {
  code = code.replaceAll(`'${specifier}'`, JSON.stringify(import.meta.resolve(specifier)));
}
code = code.replaceAll("'./radialMenu'", JSON.stringify(new URL('../src/lib/radial-menu/radialMenu.js', import.meta.url).href));
const radialMenuModule = `data:text/javascript;base64,${Buffer.from(code).toString('base64')}`;
const { default: RadialMenu } = await import(radialMenuModule) as {
  default: Component<RadialMenuProps>;
};

const circleModule = await compileSvelteComponent('src/lib/map/ErrorReportCircle.svelte', {
  '../radial-menu/RadialMenu.svelte': radialMenuModule,
  '../radial-menu/radialMenu': new URL('../src/lib/radial-menu/radialMenu.js', import.meta.url).href,
  '../icons/MoveIcon.svelte': await compileSvelteComponent('src/lib/icons/MoveIcon.svelte'),
});
const { default: ErrorReportCircle } = await import(circleModule) as {
  default: Component<{
    center: { x: number; y: number };
    icon: RadialMenuProps['items'][number]['icon'];
    onmove: (x: number, y: number) => void;
    innerRadius?: number;
    outerRadius?: number;
    handle?: { dragging: boolean };
  }>;
};

test('placed error and position circles share menu defaults and retain explicit radius overrides', () => {
  for (const handle of [undefined, { dragging: false }, { dragging: true }]) {
    for (const radii of [{}, { innerRadius: 60, outerRadius: 140 }]) {
      const { body } = render(ErrorReportCircle, { props: {
        center: { x: 200, y: 300 },
        icon: createRawSnippet(() => ({ render: () => '<path d="M0 0L24 24" />' })),
        onmove: () => {}, handle, ...radii,
      } });
      const inner = radii.innerRadius ?? 96;
      const outer = (radii.outerRadius ?? 154) + (handle?.dragging ? 12 : 0);
      assert.ok(body.includes(`A ${inner} ${inner}`));
      assert.ok(body.includes(`A ${outer} ${outer}`));
      if (handle) assert.ok(body.includes(`calc(50% - ${(inner + (radii.outerRadius ?? 154)) / 2}px)`));
    }
  }
});

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
    assert.match(body, /width="334" height="334"/);
    assert.match(body, /A 96 96/);
    assert.match(body, /A 154 154/);
    assert.match(body, /role="img" aria-label="Radial menu preview:/);
    assert.doesNotMatch(body, /<button|tabindex|role="menuitem"/);
    assert.doesNotMatch(body, /NaN|Infinity/);
  });
}

test('empty items render nothing and radii are configurable', () => {
  assert.doesNotMatch(render(RadialMenu, { props: { items: [] } }).body, /<svg/);
  const item = { id: 'one', label: 'One', color: 'var(--color-radial-polygon)', icon: createRawSnippet(() => ({ render: () => '<path d="M0 0L24 24" />' })) };
  const { body } = render(RadialMenu, { props: { items: [item], innerRadius: 60, outerRadius: 140 } });
  assert.match(body, /width="306" height="306"/);
  assert.match(body, /viewBox="-153 -153 306 306"/);
  assert.match(body, /A 60 60/);
  assert.match(body, /A 140 140/);
});

test('code luma variable darkens the item color with the configured 40% black mix', () => {
  const item = {
    id: 'one', label: 'One', color: 'var(--color-radial-polygon)',
    icon: createRawSnippet(() => ({ render: () => '<path d="M0 0L24 24" />' })),
  };
  const { body } = render(RadialMenu, { props: { items: [item] } });
  assert.match(body, /--radial-luma-mix:\s*40%/);
  assert.match(body, /--radial-luma-target:\s*var\(--palette-black\)/);
  assert.match(body, /fill="var\(--color-radial-polygon\)"/);
  assert.match(source, /const RADIAL_LUMA = 0\.3/);
  assert.match(source, /Math\.abs\(boundedLuma - 0\.5\) \* 200/);
  assert.match(source, /boundedLuma < 0\.5 \? 'var\(--palette-black\)'/);
  assert.match(source, /fill: color-mix\(in srgb, var\(--radial-color\)/);
  assert.match(source, /var\(--radial-luma-target\) var\(--radial-luma-mix\)/);
  assert.doesNotMatch(source, /<input[\s\S]*type="range"/);
});

const radiusCases: Array<Pick<RadialMenuProps, 'outerRadius' | 'hoverExpansion'>> = [{}, { outerRadius: 140, hoverExpansion: 20 }, { hoverExpansion: 0 }];
for (const radii of radiusCases) {
  test(`viewport contains every hovered sector without resizing or scaling: ${JSON.stringify(radii)}`, () => {
    const items = Array.from({ length: 3 }, (_, index) => ({
      id: `item-${index}`, label: `Choice ${index}`, color: 'var(--color-radial-point)',
      icon: createRawSnippet(() => ({ render: () => '<circle r="8" />' })),
    }));
    const pointers = [null, { x: 0, y: -125 }, { x: 108, y: 63 }, { x: -108, y: 63 }];
    let initialViewport: string | undefined;
    for (const pointer of pointers) {
      const { body } = render(RadialMenu, { props: { items, ...radii, pointer } });
      const viewport = body.match(/width="([\d.]+)" height="([\d.]+)" viewBox="(-[\d.]+) (-[\d.]+) ([\d.]+) ([\d.]+)"/);
      assert.ok(viewport);
      initialViewport ??= viewport[0];
      assert.equal(viewport[0], initialViewport, 'hover must not move or resize the menu');
      const [width, height, x, y, boxWidth, boxHeight] = viewport.slice(1).map(Number);
      assert.equal(width, boxWidth, 'SVG units retain their pixel size');
      assert.equal(height, boxHeight);
      assert.equal(x, -width / 2, 'viewport remains centered on the press');
      assert.equal(y, -height / 2);
      for (const arc of body.matchAll(/A ([\d.]+) ([\d.]+)/g)) {
        assert.ok(Number(arc[1]) + 0.4 < width / 2, 'arc and half its stroke fit horizontally');
        assert.ok(Number(arc[2]) + 0.4 < height / 2, 'arc and half its stroke fit vertically');
      }
      if (pointer) {
        const expandedRadius = (radii.outerRadius ?? defaultRadialMenuRadii.outerRadius) + (radii.hoverExpansion ?? 12);
        assert.ok(body.includes(`A ${expandedRadius} ${expandedRadius}`));
        assert.equal((body.match(/is-hovered/g) ?? []).length, 1);
      }
    }
  });
}

test('three item centers are evenly spaced with point above, line right, and polygon left', () => {
  const segments = createRadialSegments(3, defaultRadialMenuRadii.innerRadius, defaultRadialMenuRadii.outerRadius);
  assert.ok(Math.abs(segments[0].x) < 1e-10);
  assert.equal(segments[0].y, -125);
  assert.ok(segments[1].x > 0 && segments[1].y > 0);
  assert.ok(segments[2].x < 0 && segments[2].y > 0);
  for (const segment of segments) {
    assert.ok(Math.abs(Math.hypot(segment.x, segment.y) - 125) < 1e-10);
    assert.match(segment.path, /A 96 96/);
    assert.match(segment.path, /A 154 154/);
  }
});

test('one item uses full circles around the safe zone; invalid radii fail clearly', () => {
  const [segment] = createRadialSegments(1, defaultRadialMenuRadii.innerRadius, defaultRadialMenuRadii.outerRadius);
  assert.equal((segment.path.match(/A 154 154/g) ?? []).length, 2);
  assert.equal((segment.path.match(/A 96 96/g) ?? []).length, 2);
  for (const [inner, outer] of [[0, 112], [112, 46], [46, NaN]]) {
    assert.throws(() => createRadialSegments(3, inner, outer), RangeError);
  }
});

test('hover follows the displayed sectors for one, three, and six items', () => {
  const hover = (x: number, y: number, count: number) => getHoveredRadialSegment({ x, y }, count, defaultRadialMenuRadii.innerRadius);
  assert.equal(hover(125, 0, 1), 0);
  assert.equal(hover(-125, 0, 1), 0);
  for (const [index, [x, y]] of [[0, -125], [108, 63], [-108, 63]].entries()) {
    assert.equal(hover(x, y, 3), index);
  }
  for (const [index, [x, y]] of [[0, -125], [108, -63], [108, 63], [0, 125], [-108, 63], [-108, -63]].entries()) {
    assert.equal(hover(x, y, 6), index);
  }
  assert.equal(hover(1, 125, 3), 1);
  assert.equal(hover(-1, 125, 3), 2);
});

test('overshooting keeps targeting by angle, including direct jumps and switching beyond the visible ring', () => {
  const hover = (x: number, y: number) => getHoveredRadialSegment({ x, y }, 3, defaultRadialMenuRadii.innerRadius);
  assert.equal(hover(0, 0), null);
  assert.equal(hover(0, -96), null);
  assert.equal(hover(0, -97), 0);
  assert.equal(hover(0, -154), 0);
  assert.equal(hover(0, -167), 0);
  assert.equal(hover(0, -10000), 0, 'overshooting works without first passing through the visible segment');
  assert.equal(hover(10000, 6000), 1, 'a distant neighboring sector can be hovered immediately');
  assert.equal(hover(-10000, 6000), 2);
  assert.equal(hover(0, 0), null, 'returning to the safe zone still clears hover');
  assert.equal(getHoveredRadialSegment({ x: 10000, y: 0 }, 1, defaultRadialMenuRadii.innerRadius), 0);
  assert.equal(getHoveredRadialSegment({ x: -6800, y: -3900 }, 6, defaultRadialMenuRadii.innerRadius), 5);
  assert.equal(getHoveredRadialSegment(null, 3, defaultRadialMenuRadii.innerRadius), null);
  assert.equal(getHoveredRadialSegment({ x: 0, y: -125 }, 0, defaultRadialMenuRadii.innerRadius), null);
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
