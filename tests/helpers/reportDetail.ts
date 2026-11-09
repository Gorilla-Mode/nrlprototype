import { compileSvelteComponent } from './svelte-server.js';
import { compileStatusBadge } from './statusBadge.js';

const stub = (name: string) => `data:text/javascript,export default function ${name}() {}`;
const lib = (path: string) => new URL(`../../src/lib/${path}`, import.meta.url).href;

/**
 * The report detail page's shared parts and modules, compiled for server rendering. MiniMap,
 * PhotoField and Dialog are stubbed (no DOM or WebGL on the server); the location card's text is
 * tested through reportDetail.ts.
 */
export async function reportDetailSpecifiers(): Promise<Record<string, string>> {
  const modules = {
    './reportsData': lib('reports/reportsData.js'),
    './reportStore': lib('reports/reportStore.js'),
    './sentReport': lib('reports/sentReport.js'),
    './reportDetail': lib('reports/reportDetail.js'),
    './errorReportRecords': lib('reports/errorReportRecords.js'),
    './photos': lib('reports/photos.js'),
  };
  return {
    ...modules,
    '../components/PageHeader.svelte': await compileSvelteComponent('src/lib/components/PageHeader.svelte'),
    '../components/Dialog.svelte': stub('Dialog'),
    './StatusBadge.svelte': await compileStatusBadge(),
    './PhotoField.svelte': stub('PhotoField'),
    './ReportedTable.svelte': await compileSvelteComponent('src/lib/reports/ReportedTable.svelte'),
    './ReportLocationCard.svelte': await compileSvelteComponent('src/lib/reports/ReportLocationCard.svelte', {
      '../map/MiniMap.svelte': stub('MiniMap'), './reportDetail': modules['./reportDetail'],
    }),
  };
}
