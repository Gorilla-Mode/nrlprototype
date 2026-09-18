import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { compile } from 'svelte/compiler';

const svelteInternalSpecifiers = ['svelte', 'svelte/internal/server', 'svelte/internal/flags/legacy'];

/**
 * Compiles a .svelte file to a server-rendering module and returns it as a data: URL so it
 * can be `import()`-ed standalone in a test (tsc does not compile .svelte files, so this runs
 * the same svelte/compiler step at test time, mirroring tests/drawing-toolbar.test.ts).
 * `specifierReplacements` keys must match the import text exactly as written in the component's
 * <script>, e.g. `'./obstacle'`; values are the absolute targets to substitute in its place.
 */
export async function compileSvelteComponent(
  svelteFilePath: string,
  specifierReplacements: Record<string, string> = {},
): Promise<string> {
  const filename = pathToFileURL(resolve(svelteFilePath));
  const source = await readFile(filename, 'utf8');
  let { js: { code } } = compile(source, { filename: filename.pathname, generate: 'server' });
  for (const specifier of svelteInternalSpecifiers) {
    code = code.replaceAll(`'${specifier}'`, JSON.stringify(import.meta.resolve(specifier)));
  }
  for (const [specifier, target] of Object.entries(specifierReplacements)) {
    code = code.replaceAll(`'${specifier}'`, JSON.stringify(target));
  }
  return `data:text/javascript;base64,${Buffer.from(code).toString('base64')}`;
}
