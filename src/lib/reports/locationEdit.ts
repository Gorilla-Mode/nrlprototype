import { positions, type ReportGeometry } from './reportGeometry.js';

/** [lng, lat], as in GeoJSON. */
export type Vertex = [number, number];
export type LocationType = ReportGeometry['type'];

export const locationTypes: readonly { type: LocationType; label: string }[] = [
  { type: 'Point', label: 'Point' },
  { type: 'LineString', label: 'Line' },
  { type: 'Polygon', label: 'Polygon' },
];

const minimumVertices: Record<LocationType, number> = { Point: 1, LineString: 2, Polygon: 3 };

export function locationVertices(geometry: ReportGeometry): Vertex[] {
  return positions(geometry).map(([lng, lat]) => [lng, lat]);
}

/** The saved geometry for these vertices, or null until there are enough of them. */
export function locationGeometry(type: LocationType, vertices: readonly Vertex[]): ReportGeometry | null {
  if (vertices.length < minimumVertices[type]) return null;
  const copy = vertices.map(([lng, lat]): Vertex => [lng, lat]);
  if (type === 'Point') return { type: 'Point', coordinates: copy[0] };
  if (type === 'LineString') return { type: 'LineString', coordinates: copy };
  return { type: 'Polygon', coordinates: [[...copy, copy[0]]] };
}

/** What the map shows while editing: an unfinished polygon is drawn as its line so far. */
export function locationPreview(type: LocationType, vertices: readonly Vertex[]): ReportGeometry | null {
  if (type === 'Polygon' && vertices.length === 2) return locationGeometry('LineString', vertices);
  return type === 'Point' ? null : locationGeometry(type, vertices);
}

/** Helper text while the location cannot be used yet; null when it can. */
export function missingVerticesMessage(type: LocationType, count: number): string | null {
  const missing = minimumVertices[type] - count;
  if (missing <= 0) return null;
  if (type === 'Point') return 'Move the map to place the point.';
  const points = `${missing} more ${missing === 1 ? 'point' : 'points'}`;
  return type === 'LineString'
    ? `Add ${points} by clicking the map. A line needs at least 2 points.`
    : `Add ${points} by clicking the map. A polygon needs at least 3 points.`;
}

/** A point keeps only the first vertex; lines and polygons keep every vertex. */
export function convertVertices(vertices: readonly Vertex[], to: LocationType): Vertex[] {
  return to === 'Point' ? vertices.slice(0, 1) : [...vertices];
}

/** Changing to a point drops vertices, so the user confirms first. */
export function needsPointConfirmation(to: LocationType, count: number): boolean {
  return to === 'Point' && count > 1;
}

/** "60,4022" or "60.4022" as a number; null for anything else. */
export function parseCoordinate(text: string): number | null {
  const trimmed = text.trim();
  if (!/^[-+]?\d+(?:[.,]\d+)?$/.test(trimmed)) return null;
  return Number(trimmed.replace(',', '.'));
}

// Mainland Norway, Svalbard and Jan Mayen as [west, south, east, north] boxes. Boxes are an
// approximation: they also cover sea and some land just across the borders.
const norwayBoxes: readonly [number, number, number, number][] = [
  [4.0, 57.8, 31.3, 71.3],
  [10.0, 74.0, 34.0, 81.0],
  [-9.2, 70.8, -7.8, 71.2],
];

export function isInNorway([lng, lat]: Vertex): boolean {
  return norwayBoxes.some(([west, south, east, north]) => lng >= west && lng <= east && lat >= south && lat <= north);
}

export type CoordinateAxis = 'lat' | 'lng';

/**
 * The vertex with one coordinate typed in, or the reason it cannot be used. The other
 * coordinate keeps its current value.
 */
export function applyCoordinate(vertex: Vertex, axis: CoordinateAxis, text: string): { vertex: Vertex } | { error: string } {
  const value = parseCoordinate(text);
  if (value === null) return { error: axis === 'lat' ? 'Enter a latitude, e.g. 60.4022.' : 'Enter a longitude, e.g. 5.3446.' };
  const next: Vertex = axis === 'lat' ? [vertex[0], value] : [value, vertex[1]];
  if (!isInNorway(next)) return { error: 'This position is outside Norway.' };
  return { vertex: next };
}

/** Five decimals, about a metre: what the coordinate fields show. */
export function formatCoordinate(value: number): string {
  return value.toFixed(5);
}
