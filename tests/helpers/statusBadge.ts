import { compileSvelteComponent } from './svelte-server.js';

/** StatusBadge with its icons, compiled for server rendering in tests. */
export async function compileStatusBadge(): Promise<string> {
  return compileSvelteComponent('src/lib/reports/StatusBadge.svelte', {
    '../icons/PencilIcon.svelte': await compileSvelteComponent('src/lib/icons/PencilIcon.svelte'),
    '../icons/ClockIcon.svelte': await compileSvelteComponent('src/lib/icons/ClockIcon.svelte'),
    '../icons/CheckIcon.svelte': await compileSvelteComponent('src/lib/icons/CheckIcon.svelte'),
  });
}
