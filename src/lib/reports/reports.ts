/** Hash route for the report list; lower case, like the edit route #/reports/{id}/edit. */
export const reportsRoute = '#/reports';

/** Matches #/reports in any case, so older links and bookmarks to #/Reports still open the list. */
export function isReportsHash(hash: string): boolean {
  return hash.toLowerCase() === reportsRoute;
}

/**
 * The canonical spelling of a report route typed in another case (#/Reports → #/reports,
 * #/REPORTS/id/edit → #/reports/id/edit); null when the hash is no report route or already canonical.
 */
export function canonicalReportsHash(hash: string): string | null {
  const canonical = isReportsHash(hash) ? reportsRoute : editRouteMatch(hash) ? `#/reports/${editRouteMatch(hash)![1]}/edit` : null;
  return canonical && canonical !== hash ? canonical : null;
}

function editRouteMatch(hash: string): RegExpExecArray | null {
  return /^#\/reports\/([^/]+)\/edit$/i.exec(hash);
}

/** The edit page for one draft or Ready report: #/reports/{id}/edit. */
export function reportEditRoute(id: string): string {
  return `#/reports/${encodeURIComponent(id)}/edit`;
}

/** The id in an edit route, or null for any other hash. */
export function reportEditIdFromHash(hash: string): string | null {
  const match = editRouteMatch(hash);
  if (!match) return null;
  try {
    return decodeURIComponent(match[1]);
  } catch {
    return null;
  }
}
