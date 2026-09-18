export type GeometryKey = 'Point' | 'Line';
export type HeightFilterKey = 'any' | 'under30' | '30to60' | 'over60';

export function matchesGeometryFilter(geometry: GeometryKey, selected: Set<GeometryKey>): boolean {
  if (selected.size === 0) return true;
  return selected.has(geometry);
}

export function matchesHeightFilter(meters: number | null, filter: HeightFilterKey): boolean {
  if (filter === 'any') return true;
  if (meters === null) return false;
  if (filter === 'under30') return meters < 30;
  if (filter === '30to60') return meters >= 30 && meters <= 60;
  return meters > 60;
}
