import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  buildMunicipalityUrl, buildPlaceUrl, combinePlace, lookupPlaceName, municipalityName, parseMunicipality, parseNearestPlaceName,
  placeIsCurrent, placeLabel, placePoint, type PlaceFetch,
} from '../src/lib/reports/placeName.js';
import { startPlaceNames } from '../src/lib/reports/placeNames.js';
import { createReportStore, type ReportState } from '../src/lib/reports/reportStore.js';
import { reports } from './helpers/reportFixtures.js';

const point = { type: 'Point' as const, coordinates: [5.3427, 60.3946] };

test('point search URLs use the documented parameters', () => {
  const place = new URL(buildPlaceUrl([5.3427, 60.3946]));
  assert.equal(place.origin + place.pathname, 'https://ws.geonorge.no/stedsnavn/v1/punkt');
  assert.deepEqual(['nord', 'ost', 'koordsys', 'radius', 'utkoordsys'].map((key) => place.searchParams.get(key)), ['60.3946', '5.3427', '4258', '1000', '4258']);
  const address = new URL(buildMunicipalityUrl([5.3427, 60.3946]));
  assert.equal(address.origin + address.pathname, 'https://ws.geonorge.no/adresser/v1/punktsok');
  assert.deepEqual(['lat', 'lon'].map((key) => address.searchParams.get(key)), ['60.3946', '5.3427']);
});

test('the nearest name that is not a street wins, whatever order the API gives', () => {
  const payload = { navn: [
    { meterFraPunkt: 11, navneobjekttype: 'Adressenavn', stedsnavn: [{ 'skrivemåte': 'Åsaneveien' }] },
    { meterFraPunkt: 334, navneobjekttype: 'Bruk', stedsnavn: [{ 'skrivemåte': 'Martensgården' }] },
    { meterFraPunkt: 32, navneobjekttype: 'Utsiktspunkt', stedsnavn: [{ 'skrivemåte': 'Fløyen' }] },
  ] };
  assert.equal(parseNearestPlaceName(payload), 'Fløyen');
  assert.equal(parseNearestPlaceName({ navn: [] }), null);
  assert.equal(parseNearestPlaceName('nonsense'), null);
});

test('municipalities read in title case and join the place name', () => {
  assert.equal(municipalityName('BERGEN'), 'Bergen');
  assert.equal(municipalityName('NORDRE LAND'), 'Nordre Land');
  assert.equal(municipalityName('AURSKOG-HØLAND'), 'Aurskog-Høland');
  assert.equal(parseMunicipality({ adresser: [{ kommunenavn: 'BERGEN' }] }), 'Bergen');
  assert.equal(parseMunicipality({ adresser: [] }), null);
  assert.equal(combinePlace('Fløyen', 'Bergen'), 'Fløyen, Bergen');
  assert.equal(combinePlace('Bergen', 'Bergen'), 'Bergen');
  assert.equal(combinePlace(null, 'Bergen'), null);
});

test('a lookup combines both answers; a failed place search rejects instead of finding nothing', async () => {
  const respond = (body: unknown, ok = true) => Promise.resolve({ ok, json: () => Promise.resolve(body) });
  const fetchPlace: PlaceFetch = (url) => url.includes('stedsnavn')
    ? respond({ navn: [{ meterFraPunkt: 32, navneobjekttype: 'Utsiktspunkt', stedsnavn: [{ 'skrivemåte': 'Fløyen' }] }] })
    : respond({ adresser: [{ kommunenavn: 'BERGEN' }] });
  assert.equal(await lookupPlaceName([5.3427, 60.3946], fetchPlace), 'Fløyen, Bergen');
  await assert.rejects(lookupPlaceName([5.3427, 60.3946], (url) => (url.includes('stedsnavn') ? respond({}, false) : respond({}))));
});

test('cards show the stored name for this location, otherwise coordinates', () => {
  const at = placePoint(point)!;
  assert.equal(placeLabel({ name: 'Fløyen, Bergen', at }, point), 'Fløyen, Bergen');
  assert.equal(placeLabel(undefined, point), '60.3946° N, 5.3427° E');
  assert.equal(placeLabel({ name: null, at }, point), '60.3946° N, 5.3427° E');
  // Moved since the lookup: the old name no longer describes it.
  assert.equal(placeIsCurrent({ name: 'Fløyen, Bergen', at: [5, 60] }, point), false);
  assert.equal(placeLabel({ name: 'Fløyen, Bergen', at: [5, 60] }, point), '60.3946° N, 5.3427° E');
  assert.equal(placeLabel(undefined, null), null);
});

test('places are looked up once per location, stored without touching the edit time, and failures are not stored', async () => {
  let saved: ReportState | null = { drafts: [], reports: [
    { ...reports[0], id: 'a', geometry: point, updatedAt: '2026-11-01T10:00:00.000Z' },
    { ...reports[0], id: 'b', geometry: { type: 'Point', coordinates: [10, 59] }, updatedAt: '2026-11-01T10:00:00.000Z' },
  ] };
  const store = createReportStore({ load: () => saved, save: (state) => { saved = state; } });
  const calls: string[] = [];
  const stop = startPlaceNames(store, async ([lng]) => {
    calls.push(String(lng));
    if (lng === 10) throw new Error('offline');
    return 'Fløyen, Bergen';
  });
  for (let i = 0; i < 5; i++) await Promise.resolve();
  await new Promise((resolve) => setTimeout(resolve, 0));
  stop();
  const [a, b] = store.getReports();
  assert.deepEqual(a.place, { name: 'Fløyen, Bergen', at: [5.3427, 60.3946] });
  assert.equal(a.updatedAt, '2026-11-01T10:00:00.000Z');
  assert.equal(b.place, undefined);
  assert.deepEqual(calls.sort(), ['10', '5.3427']);
});
