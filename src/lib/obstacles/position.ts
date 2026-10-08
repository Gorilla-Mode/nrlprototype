export interface GeoPosition {
  lat: number;
  lng: number;
}

const earthRadiusM = 6_371_008.8;
const compassPoints = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'] as const;
export type CompassPoint = (typeof compassPoints)[number];

const radians = (degrees: number) => degrees * Math.PI / 180;

/** Great-circle distance in metres. */
export function distanceM(from: GeoPosition, to: GeoPosition): number {
  const dLat = radians(to.lat - from.lat);
  const dLng = radians(to.lng - from.lng);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(radians(from.lat)) * Math.cos(radians(to.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * earthRadiusM * Math.asin(Math.min(1, Math.sqrt(a)));
}

/** Initial bearing in degrees clockwise from north, 0–360. */
export function bearingDeg(from: GeoPosition, to: GeoPosition): number {
  const y = Math.sin(radians(to.lng - from.lng)) * Math.cos(radians(to.lat));
  const x = Math.cos(radians(from.lat)) * Math.sin(radians(to.lat)) -
    Math.sin(radians(from.lat)) * Math.cos(radians(to.lat)) * Math.cos(radians(to.lng - from.lng));
  return (Math.atan2(y, x) * 180 / Math.PI + 360) % 360;
}

export function compassPoint(bearing: number): CompassPoint {
  return compassPoints[Math.round(bearing / 45) % 8];
}

/** Below this the circle is treated as not moved. */
export const minimumMoveM = 1;

export function formatDistance(meters: number): string {
  return meters < 1000 ? `${Math.round(meters)} m` : `${(meters / 1000).toFixed(1)} km`;
}

/** Distance and direction for display, or null when the position has not moved. */
export function moveParts(from: GeoPosition, to: GeoPosition): { distance: string; direction: CompassPoint } | null {
  const meters = distanceM(from, to);
  if (meters < minimumMoveM) return null;
  return { distance: formatDistance(meters), direction: compassPoint(bearingDeg(from, to)) };
}

export function describeMove(from: GeoPosition, to: GeoPosition): string {
  const parts = moveParts(from, to);
  return parts ? `Moved ${parts.distance} ${parts.direction}` : 'Not moved';
}
