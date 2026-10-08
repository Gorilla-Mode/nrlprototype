export const placementEditingVariants = [
  { id: 'default', label: 'Default — no editing' },
  { id: 'basic', label: '1 — Basic editing' },
  { id: 'persistent-donut', label: '2 — Persistent donut' },
  { id: 'two-finger', label: '3 — Two-finger placement' },
] as const;

export type PlacementEditingVariantId = typeof placementEditingVariants[number]['id'];

export function placementEditingSettings(search: string): PlacementEditingVariantId {
  const query = new URLSearchParams(search);
  return placementEditingVariants.find(({ id }) => query.get('debug') === '1' &&
    id === query.get('placementEditing'))?.id ?? 'default';
}

/** A null URL makes selecting the current value (or an unknown value) a no-op. */
export function placementEditingVariantUrl(href: string, id: string): string | null {
  const url = new URL(href);
  if (url.searchParams.get('debug') !== '1' || !placementEditingVariants.some((entry) => entry.id === id) ||
    placementEditingSettings(url.search) === id) return null;
  url.searchParams.set('placementEditing', id);
  return url.pathname + url.search + url.hash;
}
