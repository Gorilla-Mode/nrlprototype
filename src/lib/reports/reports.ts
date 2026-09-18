/** Hash route for the report list. Page routes stay capitalised, like #/FAQ and #/Settings. */
export const reportsRoute = '#/Reports';

export function isReportsHash(hash: string): boolean {
  return hash === reportsRoute;
}
