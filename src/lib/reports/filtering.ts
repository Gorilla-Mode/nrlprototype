export type GeometryKey = 'Point' | 'Line';
export type HeightFilterKey = 'any' | 'under30' | '30to60' | 'over60';

/** Items without geometry yet only show when no geometry filter is applied. */
export function matchesGeometryFilter(geometry: GeometryKey | null, selected: Set<GeometryKey>): boolean {
  if (selected.size === 0) return true;
  return geometry !== null && selected.has(geometry);
}

export function matchesHeightFilter(meters: number | null, filter: HeightFilterKey): boolean {
  if (filter === 'any') return true;
  if (meters === null) return false;
  if (filter === 'under30') return meters < 30;
  if (filter === '30to60') return meters >= 30 && meters <= 60;
  return meters > 60;
}
