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
  const edit = editRouteMatch(hash);
  const view = viewRouteMatch(hash);
  const canonical = isReportsHash(hash) ? reportsRoute
    : edit ? `#/reports/${edit[1]}/edit`
    : view ? `#/reports/${view[1]}` : null;
  return canonical && canonical !== hash ? canonical : null;
}

function editRouteMatch(hash: string): RegExpExecArray | null {
  return /^#\/reports\/([^/]+)\/edit$/i.exec(hash);
}

function viewRouteMatch(hash: string): RegExpExecArray | null {
  return /^#\/reports\/([^/]+)$/i.exec(hash);
}

function decodeId(raw: string): string | null {
  try {
    return decodeURIComponent(raw);
  } catch {
    return null;
  }
}

/** The read-only page for one Ready to send report: #/reports/{id}. */
export function reportViewRoute(id: string): string {
  return `#/reports/${encodeURIComponent(id)}`;
}

/** The id in a view route, or null for any other hash (the list and edit routes included). */
export function reportViewIdFromHash(hash: string): string | null {
  const match = viewRouteMatch(hash);
  return match ? decodeId(match[1]) : null;
}

/** The edit page for one draft or Ready report: #/reports/{id}/edit. */
export function reportEditRoute(id: string): string {
  return `#/reports/${encodeURIComponent(id)}/edit`;
}

/** The id in an edit route, or null for any other hash. */
export function reportEditIdFromHash(hash: string): string | null {
  const match = editRouteMatch(hash);
  return match ? decodeId(match[1]) : null;
}
