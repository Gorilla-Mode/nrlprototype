import assert from 'node:assert/strict';
import { readdir, readFile } from 'node:fs/promises';
import { extname, join, relative } from 'node:path';
import { test } from 'node:test';
import { obstacleGeometryChoices } from '../src/lib/reporting/obstacle.js';

const sourceRoot = 'src';
const stylesheetPath = 'src/styles/stylesheet.css';
const inspectedExtensions = new Set(['.css', '.js', '.svelte', '.ts']);

test('every referenced visual token exists, including geometry metadata', async () => {
  const files = await sourceFiles(sourceRoot);
  const sources = await Promise.all(files.map(async (file) => [file, await readFile(file, 'utf8')] as const));
  const definitions = new Set(sources.flatMap(([, source]) =>
    [...source.matchAll(/(--[\w-]+)\s*:/g)].map((match) => match[1])));
  // State-derived aliases: selected geometry, pointer position and slider progress.
  const dynamic = new Set(['--geometry-color', '--radial-color', '--hold-x', '--hold-y', '--radial-item-x', '--radial-item-y', '--map-slider-position', '--map-scale-width']);
  const missing: string[] = [];
  for (const [file, source] of sources) {
    for (const match of source.matchAll(/(?:var\(|['"])(--[\w-]+)/g)) {
      if (!definitions.has(match[1]) && !dynamic.has(match[1])) missing.push(`${file}: ${match[1]}`);
    }
  }
  for (const choice of obstacleGeometryChoices) {
    if (!definitions.has(choice.colorToken)) missing.push(choice.colorToken);
  }
  assert.deepEqual([...new Set(missing)], []);
});

async function sourceFiles(directory: string): Promise<string[]> {
  const entries = await readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(entries.map((entry) => {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) return sourceFiles(path);
    return inspectedExtensions.has(extname(entry.name)) ? [path] : [];
  }));
  return nested.flat();
}

test('the visual system is imported once from the application entry point', async () => {
  const files = await sourceFiles(sourceRoot);
  const imports: string[] = [];
  for (const file of files) {
    const source = await readFile(file, 'utf8');
    if (source.includes('styles/stylesheet.css')) {
      imports.push(relative('.', file).replaceAll('\\', '/'));
    }
  }
  assert.deepEqual(imports, ['src/main.ts']);
});

test('literal CSS colours stay in the central visual system', async () => {
  const files = (await sourceFiles(sourceRoot)).filter((file) =>
    relative('.', file).replaceAll('\\', '/') !== stylesheetPath
  );
  const violations: string[] = [];
  const literalColour = /#[\da-f]{3,8}\b|\b(?:rgb|rgba|hsl|hsla)\s*\(/gi;

  for (const file of files) {
    const source = await readFile(file, 'utf8');
    for (const match of source.matchAll(literalColour)) {
      const line = source.slice(0, match.index).split(/\r?\n/).length;
      violations.push(`${relative('.', file)}:${line} ${match[0]}`);
    }
  }

  assert.deepEqual(violations, []);
});
