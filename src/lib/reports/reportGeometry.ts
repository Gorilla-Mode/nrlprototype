import type { LineString, Point, Position } from 'geojson';
import type { GeometryKey } from './filtering.js';

/** Geometry stored on a report or draft, in GeoJSON [lng, lat] order. */
export type ReportGeometry = Point | LineString;

/** [[west, south], [east, north]] */
export type GeometryBounds = [[number, number], [number, number]];

export interface GeometryCameraTarget {
  lng: number;
  lat: number;
  zoom: number;
}

const POINT_ZOOM = 15;
const MIN_ZOOM = 4;
const MAX_ZOOM = 16;

function positions(geometry: ReportGeometry): Position[] {
  return geometry.type === 'Point' ? [geometry.coordinates] : geometry.coordinates;
}

export function geometryKind(geometry: ReportGeometry | null): GeometryKey | null {
  if (!geometry) return null;
  return geometry.type === 'Point' ? 'Point' : 'Line';
}

export function vertexCount(geometry: ReportGeometry | null): number {
  return geometry ? positions(geometry).length : 0;
}

export function geometryBounds(geometry: ReportGeometry): GeometryBounds {
  const all = positions(geometry);
  const lngs = all.map(([lng]) => lng);
  const lats = all.map(([, lat]) => lat);
  return [[Math.min(...lngs), Math.min(...lats)], [Math.max(...lngs), Math.max(...lats)]];
}

/** Camera that shows the whole geometry on the main map: a fixed zoom for points, fitted to the extent for lines. */
export function geometryCameraTarget(geometry: ReportGeometry): GeometryCameraTarget {
  const [[west, south], [east, north]] = geometryBounds(geometry);
  const lng = (west + east) / 2;
  const lat = (south + north) / 2;
  if (geometry.type === 'Point') return { lng, lat, zoom: POINT_ZOOM };
  // Web Mercator: compare the latitude span in longitude-equivalent degrees, then step
  // out one level so the extent fills about half the viewport instead of touching its edges.
  const span = Math.max(east - west, (north - south) / Math.cos((lat * Math.PI) / 180));
  const zoom = span > 0 ? Math.log2(360 / span) - 1 : POINT_ZOOM;
  return { lng, lat, zoom: Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, zoom)) };
}

/** "60.3913° N, 5.3221° E" for the first vertex, or null when no location is set. */
export function coordinateLabel(geometry: ReportGeometry | null): string | null {
  if (!geometry) return null;
  const [lng, lat] = positions(geometry)[0];
  return `${Math.abs(lat).toFixed(4)}° ${lat < 0 ? 'S' : 'N'}, ${Math.abs(lng).toFixed(4)}° ${lng < 0 ? 'W' : 'E'}`;
}

/** "60.3913° N, 5.3221° E · 2 vertices" from the first vertex, or "Location not set". */
export function locationCaption(geometry: ReportGeometry | null): string {
  const coordinates = coordinateLabel(geometry);
  if (!coordinates) return 'Location not set';
  const count = vertexCount(geometry);
  return `${coordinates} · ${count} ${count === 1 ? 'vertex' : 'vertices'}`;
}
