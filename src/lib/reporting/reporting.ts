export const detailsRoute = '#/Report/details';
export const additionalInformationRoute = '#/Report/additional-information';
export const summaryRoute = '#/Report/summary';
export const defaultReportingVariantId = 'one-step';
export const minObstacleHeightMeters = 0;
export const maxObstacleHeightMeters = 500;
export const defaultObstacleHeightMeters = 30;

export interface ReportingVariant {
  readonly id: string;
  readonly label: string;
  readonly stepRoutes: readonly [string, ...string[]];
}

export function reportingSettings(search: string, variants: readonly ReportingVariant[]) {
  const query = new URLSearchParams(search);
  const variant = variants.find(({ id }) => id === query.get('reporting'))
    ?? variants.find(({ id }) => id === defaultReportingVariantId);
  if (!variant) throw new Error('The default reporting variant must be registered.');
  return { variant, debug: query.get('debug') === '1' };
}

export function reportingVariantUrl(href: string, variant: ReportingVariant): string {
  const url = new URL(href);
  url.searchParams.set('reporting', variant.id);
  return url.pathname + url.search + url.hash;
}

export type ReportingRoute =
  | { kind: 'details'; step: number; hash: string }
  | { kind: 'summary' }
  | { kind: 'map' };

/** Report routes require their original in-memory draft or result. */
export function resolveReportingRoute(
  hash: string, variant: ReportingVariant | null, hasType: boolean, hasResult: boolean,
): ReportingRoute | null {
  if (!hash.startsWith('#/Report/')) return null;
  if (hash === summaryRoute) return { kind: hasResult ? 'summary' : 'map' };
  if (!variant) return { kind: 'map' };
  const index = variant.stepRoutes.indexOf(hash);
  const step = hasType && index >= 0 ? index + 1 : 1;
  return { kind: 'details', step, hash: variant.stepRoutes[step - 1] };
}
