/** Hash route for the report list. Page routes stay capitalised, like #/FAQ and #/Settings. */
export const reportsRoute = '#/Reports';

export function isReportsHash(hash: string): boolean {
  return hash === reportsRoute;
}

/** The edit page for one draft or Ready report: #/reports/{id}/edit. */
export function reportEditRoute(id: string): string {
  return `#/reports/${encodeURIComponent(id)}/edit`;
}

/** The id in an edit route, or null for any other hash. */
export function reportEditIdFromHash(hash: string): string | null {
  const match = /^#\/reports\/([^/]+)\/edit$/.exec(hash);
  if (!match) return null;
  try {
    return decodeURIComponent(match[1]);
  } catch {
    return null;
  }
}
