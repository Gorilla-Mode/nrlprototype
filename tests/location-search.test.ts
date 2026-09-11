import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  addressZoom,
  buildAddressUrl,
  buildPlaceUrl,
  mergeSuggestions,
  parseAddresses,
  parsePlaces,
  placeQuota,
  placeZoom,
  streetZoom,
  type LocationSuggestion,
} from '../src/lib/map/locationSearch.js';

const address = (
  adressenavn: string,
  adressetekst: string,
  lat: number,
  lon: number,
  kommunenavn = 'BERGEN',
) => ({
  adressenavn,
  adressetekst,
  kommunenavn,
  postnummer: '5003',
  poststed: 'BERGEN',
  representasjonspunkt: { epsg: 'EPSG:4258', lat, lon },
});

const place = (overrides: Record<string, unknown> = {}) => ({
  'skrivemåte': 'Ulriken',
  navnestatus: 'hovednavn',
  stedstatus: 'aktiv',
  navneobjekttype: 'Fjell',
  stedsnummer: 855750,
  kommuner: [{ kommunenavn: 'Bergen', kommunenummer: '4601' }],
  representasjonspunkt: { nord: 60.37747, 'øst': 5.38713 },
  ...overrides,
});

const named = (label: string): LocationSuggestion =>
  ({ id: label, label, detail: '', lng: 0, lat: 0, zoom: placeZoom });

test('the address URL trims the query into a wildcard prefix match', () => {
  const url = new URL(buildAddressUrl('  Storgata 8 ', 20));
  assert.equal(`${url.origin}${url.pathname}`, 'https://ws.geonorge.no/adresser/v1/sok');
  assert.equal(url.searchParams.get('sok'), 'Storgata 8*');
  assert.equal(url.searchParams.get('treffPerSide'), '20');
  assert.equal(url.searchParams.get('asciiKompatibel'), 'true');
});

test('the place URL asks for degrees, because the API otherwise answers in UTM metres', () => {
  const url = new URL(buildPlaceUrl('Ulriken'));
  assert.equal(`${url.origin}${url.pathname}`, 'https://ws.geonorge.no/stedsnavn/v1/navn');
  assert.equal(url.searchParams.get('sok'), 'Ulriken*');
  assert.equal(url.searchParams.get('utkoordsys'), '4258');
});

test('houses on one street collapse into a single suggestion at their mean point', () => {
  const suggestions = parseAddresses({
    adresser: [
      address('Storgata', 'Storgata 1', 60, 5),
      address('Storgata', 'Storgata 3', 60.2, 5.4),
      address('Storgata', 'Storgata 5', 60.4, 5.2),
    ],
  });
  assert.equal(suggestions.length, 1, 'one street yields one row');
  const [suggestion] = suggestions;
  assert.equal(suggestion.label, 'Storgata');
  assert.equal(suggestion.detail, '5003 BERGEN');
  assert.equal(suggestion.zoom, streetZoom);
  assert.equal(Number(suggestion.lat.toFixed(6)), 60.2);
  assert.equal(Number(suggestion.lng.toFixed(6)), 5.2);
});

test('one street name in two municipalities stays two suggestions', () => {
  const suggestions = parseAddresses({
    adresser: [
      address('Storgata', 'Storgata 1', 60, 5, 'BERGEN'),
      address('Storgata', 'Storgata 3', 60.1, 5.1, 'BERGEN'),
      address('Storgata', 'Storgata 1', 63, 10, 'TRONDHEIM'),
    ],
  });
  assert.deepEqual(suggestions.map((suggestion) => suggestion.zoom), [streetZoom, addressZoom]);
});

test('a lone address keeps its own point and the closer zoom', () => {
  const [suggestion] = parseAddresses({
    adresser: [address('Storgata', 'Storgata 8A', 60.39, 5.32)],
  });
  assert.equal(suggestion.label, 'Storgata 8A');
  assert.equal(suggestion.zoom, addressZoom);
  assert.deepEqual([suggestion.lng, suggestion.lat], [5.32, 60.39]);
});

test('place names read the nord and øst axes rather than lat and lon', () => {
  assert.deepEqual(parsePlaces({ navn: [place()] }), [{
    id: 'place:855750',
    label: 'Ulriken',
    detail: 'Fjell · Bergen',
    lng: 5.38713,
    lat: 60.37747,
    zoom: placeZoom,
  }]);
});

test('secondary spellings and retired places are dropped', () => {
  const suggestions = parsePlaces({
    navn: [place({ navnestatus: 'sidenavn' }), place({ stedstatus: 'relikt' }), place()],
  });
  assert.equal(suggestions.length, 1);
});

test('street names repeated by the place register are left to the address register', () => {
  const suggestions = parsePlaces({
    navn: [place({ navneobjekttype: 'Adressenavn', 'skrivemåte': 'Storgata' }), place()],
  });
  assert.deepEqual(suggestions.map((suggestion) => suggestion.label), ['Ulriken']);
});

for (const [name, payload] of [
  ['null', null],
  ['a bare string', 'nope'],
  ['no result array', {}],
  ['a result array of the wrong type', { adresser: 'nope', navn: 'nope' }],
  ['entries missing coordinates', { adresser: [{ adressenavn: 'Storgata' }], navn: [place({ representasjonspunkt: undefined })] }],
  ['entries with unusable coordinates', {
    adresser: [address('Storgata', 'Storgata 1', Number.NaN, 5)],
    navn: [place({ representasjonspunkt: { nord: '60', 'øst': '5' } })],
  }],
] as const) {
  test(`a payload of ${name} yields no suggestions instead of throwing`, () => {
    assert.deepEqual(parseAddresses(payload), []);
    assert.deepEqual(parsePlaces(payload), []);
  });
}

test('exact matches outrank prefixes, which outrank everything else', () => {
  const merged = mergeSuggestions(
    [named('Storgaten'), named('Storgata')],
    [named('Storgata 1'), named('Lille Storgata')],
    'storgata',
  );
  assert.deepEqual(
    merged.map((suggestion) => suggestion.label),
    ['Storgata', 'Storgata 1', 'Storgaten', 'Lille Storgata'],
  );
});

test('a crowded place register cannot squeeze addresses off the list', () => {
  const places = Array.from({ length: 30 }, (_, index) => named(`Place ${index}`));
  const addresses = Array.from({ length: 6 }, (_, index) => named(`Address ${index}`));
  const merged = mergeSuggestions(places, addresses, 'zzz', 8);
  assert.equal(merged.length, 8);
  assert.equal(
    merged.filter((suggestion) => suggestion.label.startsWith('Place')).length,
    placeQuota,
    'places are held to their quota while addresses are waiting',
  );
});

test('places still fill the list when few addresses match', () => {
  const places = Array.from({ length: 10 }, (_, index) => named(`Place ${index}`));
  const merged = mergeSuggestions(places, [named('Address 0')], 'zzz', 8);
  assert.equal(merged.length, 8, 'the quota does not apply when there is nothing to protect');
});
