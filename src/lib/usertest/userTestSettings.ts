/** The task guide is available only when both URL flags explicitly opt in. */
export function userTestEnabled(search: string): boolean {
  const query = new URLSearchParams(search);
  return query.get('debug') === '1' && query.get('help') === '1';
}
