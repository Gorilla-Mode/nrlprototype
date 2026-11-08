import { coordinateLabel, type ReportGeometry } from './reportGeometry.js';

/**
 * Reverse lookup of a report's place, from Kartverket's Geonorge APIs (the same service
 * family as the map's "Search place or address"):
 * - stedsnavn /punkt: names near a point. It does not return the municipality.
 * - adresser /punktsok: the nearest address, for its municipality.
 * Both are documented in their openapi.json and answer CORS requests from any origin.
 */
const placeEndpoint = 'https://ws.geonorge.no/stedsnavn/v1/punkt';
const addressEndpoint = 'https://ws.geonorge.no/adresser/v1/punktsok';
/** Metres; the stedsnavn API allows up to 5000. */
export const placeRadiusM = 1000;
export const municipalityRadiusM = 2000;
// Streets come first in the register; the map search leaves them out for the same reason.
const streetNameType = 'Adressenavn';

/** The stored lookup: the name (null when none was found) and the [lng, lat] it was found for. */
export interface StoredPlace {
  name: string | null;
  at: [number, number];
}

function asRecord(value: unknown): Record<string, unknown> | undefined {
  return typeof value === 'object' && value !== null ? value as Record<string, unknown> : undefined;
}

/** The point a report's place describes: its first vertex, as in its coordinate label. */
export function placePoint(geometry: ReportGeometry | null): [number, number] | null {
  if (!geometry) return null;
  const first = geometry.type === 'Point' ? geometry.coordinates
    : geometry.type === 'LineString' ? geometry.coordinates[0] : geometry.coordinates[0]?.[0];
  return first ? [first[0], first[1]] : null;
}

/** True when the stored place was looked up for this geometry's point. */
export function placeIsCurrent(place: StoredPlace | undefined, geometry: ReportGeometry | null): boolean {
  const point = placePoint(geometry);
  return !!place && !!point && place.at[0] === point[0] && place.at[1] === point[1];
}

export function buildPlaceUrl([lng, lat]: [number, number]): string {
  const url = new URL(placeEndpoint);
  url.searchParams.set('nord', String(lat));
  url.searchParams.set('ost', String(lng));
  url.searchParams.set('koordsys', '4258');
  url.searchParams.set('radius', String(placeRadiusM));
  url.searchParams.set('treffPerSide', '50');
  url.searchParams.set('utkoordsys', '4258');
  return url.toString();
}

export function buildMunicipalityUrl([lng, lat]: [number, number]): string {
  const url = new URL(addressEndpoint);
  url.searchParams.set('lat', String(lat));
  url.searchParams.set('lon', String(lng));
  url.searchParams.set('radius', String(municipalityRadiusM));
  url.searchParams.set('treffPerSide', '1');
  url.searchParams.set('filtrer', 'adresser.kommunenavn,adresser.meterDistanseTilPunkt');
  return url.toString();
}

/** The nearest name that is not a street. The API sorts by category first, so sort by distance here. */
export function parseNearestPlaceName(payload: unknown): string | null {
  const hits = asRecord(payload)?.navn;
  if (!Array.isArray(hits)) return null;
  let best: { name: string; distance: number } | null = null;
  for (const hit of hits) {
    const record = asRecord(hit);
    if (!record || record.navneobjekttype === streetNameType) continue;
    const distance = typeof record.meterFraPunkt === 'number' ? record.meterFraPunkt : Number.POSITIVE_INFINITY;
    const names = Array.isArray(record.stedsnavn) ? record.stedsnavn : [];
    const name = names.map((entry) => asRecord(entry)?.['skrivemåte']).find((text): text is string => typeof text === 'string' && text.trim() !== '');
    if (name && (!best || distance < best.distance)) best = { name: name.trim(), distance };
  }
  return best?.name ?? null;
}

/** "BERGEN" → "Bergen", "NORDRE LAND" → "Nordre Land", "AURSKOG-HØLAND" → "Aurskog-Høland". */
export function municipalityName(raw: string): string {
  return raw.toLocaleLowerCase('nb').replace(/(^|[\s-])(\p{L})/gu, (_, before: string, letter: string) => before + letter.toLocaleUpperCase('nb'));
}

export function parseMunicipality(payload: unknown): string | null {
  const first = asRecord(payload)?.adresser;
  const name = Array.isArray(first) ? asRecord(first[0])?.kommunenavn : undefined;
  return typeof name === 'string' && name.trim() ? municipalityName(name.trim()) : null;
}

/** "Fløyen, Bergen", or just the name when no municipality is found nearby. Null when no name is found. */
export function combinePlace(name: string | null, municipality: string | null): string | null {
  if (!name) return null;
  return municipality && municipality !== name ? `${name}, ${municipality}` : name;
}

export type PlaceFetch = (url: string, init: { signal?: AbortSignal }) => Promise<{ ok: boolean; json: () => Promise<unknown> }>;

/**
 * Looks the place up. Resolves to the name, or null when nothing is near; rejects when the
 * service fails, so the caller can retry later instead of storing "no name".
 */
export async function lookupPlaceName(point: [number, number], fetchPlace: PlaceFetch = (url, init) => fetch(url, init), signal?: AbortSignal): Promise<string | null> {
  const [placeResponse, addressResponse] = await Promise.all([
    fetchPlace(buildPlaceUrl(point), { signal }),
    fetchPlace(buildMunicipalityUrl(point), { signal }),
  ]);
  if (!placeResponse.ok) throw new Error('Place name lookup failed');
  const name = parseNearestPlaceName(await placeResponse.json());
  const municipality = addressResponse.ok ? parseMunicipality(await addressResponse.json()) : null;
  return combinePlace(name, municipality);
}

/** What a card shows: the stored name for this location, otherwise the coordinates. */
export function placeLabel(place: StoredPlace | undefined, geometry: ReportGeometry | null): string | null {
  if (place?.name && placeIsCurrent(place, geometry)) return place.name;
  return coordinateLabel(geometry);
}
