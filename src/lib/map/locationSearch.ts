export interface LocationSuggestion {
  readonly id: string;
  readonly label: string;
  readonly detail: string;
  readonly lng: number;
  readonly lat: number;
  readonly zoom: number;
}

export type LocationSearch = (query: string, signal: AbortSignal) => Promise<LocationSuggestion[]>;

export const addressZoom = 17;
export const streetZoom = 15;
export const placeZoom = 13;
export const maxSuggestions = 8;
export const placeQuota = 3;

// The place register repeats every street as an "Adressenavn", which the address
// register already covers with a post code and grouped house numbers.
const duplicatedPlaceType = 'Adressenavn';

const addressEndpoint = 'https://ws.geonorge.no/adresser/v1/sok';
const placeEndpoint = 'https://ws.geonorge.no/stedsnavn/v1/navn';
// The register returns a street's house numbers consecutively, so a short page can
// hold a single street. This is the width needed before distinct streets show up.
const addressPageSize = 200;
const placePageSize = 15;
const addressFields = [
  'adresser.adressenavn',
  'adresser.adressetekst',
  'adresser.kommunenavn',
  'adresser.postnummer',
  'adresser.poststed',
  'adresser.representasjonspunkt',
].join(',');

function asRecord(value: unknown): Record<string, unknown> | undefined {
  return typeof value === 'object' && value !== null ? value as Record<string, unknown> : undefined;
}

function asText(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

function asFinite(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

export function buildAddressUrl(query: string, limit = addressPageSize): string {
  const url = new URL(addressEndpoint);
  url.searchParams.set('sok', `${query.trim()}*`);
  url.searchParams.set('treffPerSide', String(limit));
  url.searchParams.set('asciiKompatibel', 'true');
  url.searchParams.set('filtrer', addressFields);
  return url.toString();
}

export function buildPlaceUrl(query: string, limit = placePageSize): string {
  const url = new URL(placeEndpoint);
  url.searchParams.set('sok', `${query.trim()}*`);
  url.searchParams.set('treffPerSide', String(limit));
  // Without this the API answers in UTM metres instead of degrees, with no error.
  url.searchParams.set('utkoordsys', '4258');
  return url.toString();
}

interface StreetGroup {
  key: string;
  street: string;
  text: string;
  detail: string;
  lng: number;
  lat: number;
  count: number;
}

export function parseAddresses(payload: unknown): LocationSuggestion[] {
  const entries = asRecord(payload)?.adresser;
  if (!Array.isArray(entries)) return [];

  const groups = new Map<string, StreetGroup>();
  for (const entry of entries) {
    const record = asRecord(entry);
    if (!record) continue;
    const point = asRecord(record.representasjonspunkt);
    const lat = asFinite(point?.lat);
    const lng = asFinite(point?.lon);
    const street = asText(record.adressenavn);
    if (lat === undefined || lng === undefined || !street) continue;

    const key = `${street}|${asText(record.kommunenavn)}`;
    const group = groups.get(key);
    if (group) {
      group.lat += lat;
      group.lng += lng;
      group.count += 1;
      continue;
    }
    groups.set(key, {
      key,
      street,
      text: asText(record.adressetekst) || street,
      detail: [asText(record.postnummer), asText(record.poststed)].filter(Boolean).join(' '),
      lng,
      lat,
      count: 1,
    });
  }

  return [...groups.values()].map((group) => group.count === 1
    ? {
      id: `address:${group.key}`,
      label: group.text,
      detail: group.detail,
      lng: group.lng,
      lat: group.lat,
      zoom: addressZoom,
    }
    : {
      // Averages only the addresses on this page, so it approximates the street's midpoint.
      id: `street:${group.key}`,
      label: group.street,
      detail: group.detail,
      lng: group.lng / group.count,
      lat: group.lat / group.count,
      zoom: streetZoom,
    });
}

export function parsePlaces(payload: unknown): LocationSuggestion[] {
  const entries = asRecord(payload)?.navn;
  if (!Array.isArray(entries)) return [];

  const suggestions: LocationSuggestion[] = [];
  for (const entry of entries) {
    const record = asRecord(entry);
    if (!record) continue;
    const type = asText(record.navneobjekttype);
    if (type === duplicatedPlaceType) continue;
    if (asText(record.navnestatus) !== 'hovednavn' || asText(record.stedstatus) !== 'aktiv') continue;

    const point = asRecord(record.representasjonspunkt);
    // This API names its axes nord/øst, unlike the address API's lat/lon.
    const lat = asFinite(point?.nord);
    const lng = asFinite(point?.['øst']);
    const label = asText(record['skrivemåte']);
    if (lat === undefined || lng === undefined || !label) continue;

    const municipality = asRecord(Array.isArray(record.kommuner) ? record.kommuner[0] : undefined);
    suggestions.push({
      id: `place:${asFinite(record.stedsnummer) ?? label}`,
      label,
      detail: [type, asText(municipality?.kommunenavn)].filter(Boolean).join(' · '),
      lng,
      lat,
      zoom: placeZoom,
    });
  }
  return suggestions;
}

export function mergeSuggestions(
  places: readonly LocationSuggestion[],
  addresses: readonly LocationSuggestion[],
  query: string,
  max = maxSuggestions,
): LocationSuggestion[] {
  const needle = query.trim().toLowerCase();
  const rank = ({ label }: LocationSuggestion) => {
    const name = label.toLowerCase();
    if (name === needle) return 0;
    return name.startsWith(needle) ? 1 : 2;
  };
  const byRank = (a: LocationSuggestion, b: LocationSuggestion) => rank(a) - rank(b);
  // Capping the places keeps a register with thousands of loose matches from
  // crowding addresses out of the list, but lets it fill the gap when they are few.
  const roomForPlaces = Math.min(places.length, Math.max(placeQuota, max - addresses.length));
  // Sorting is stable, so places stay ahead of addresses of equal rank.
  return [...[...places].sort(byRank).slice(0, roomForPlaces), ...addresses]
    .sort(byRank)
    .slice(0, max);
}

async function requestJson(url: string, signal: AbortSignal): Promise<unknown> {
  const response = await fetch(url, { signal, headers: { accept: 'application/json' } });
  if (!response.ok) throw new Error(`Geonorge responded ${response.status}`);
  return response.json();
}

export const searchLocations: LocationSearch = async (query, signal) => {
  const [places, addresses] = await Promise.allSettled([
    requestJson(buildPlaceUrl(query), signal),
    requestJson(buildAddressUrl(query), signal),
  ]);
  // One endpoint failing still leaves the other's results worth showing.
  if (places.status === 'rejected' && addresses.status === 'rejected') throw places.reason;
  return mergeSuggestions(
    places.status === 'fulfilled' ? parsePlaces(places.value) : [],
    addresses.status === 'fulfilled' ? parseAddresses(addresses.value) : [],
    query,
  );
};
