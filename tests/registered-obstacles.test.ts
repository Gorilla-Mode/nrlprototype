import assert from 'node:assert/strict';
import { test } from 'node:test';
import { findObstacleInCircle, loadRegisteredObstacles, type RegisteredObstacle } from '../src/lib/obstacles/registeredObstacles.js';
import { fireStationToObstacle, fireStationsToObstacles } from '../src/lib/obstacles/fireStations.js';

const obstacle = (id: string, x: number, y: number): RegisteredObstacle =>
  ({ id, type: 'Mast', heightM: 45, lit: true, lng: x, lat: y });
// Identity projection: lng/lat are screen pixels in these tests.
const project = (item: RegisteredObstacle) => ({ x: item.lng, y: item.lat });

test('the obstacle nearest the centre wins among those inside the radius', () => {
  const obstacles = [obstacle('far', 90, 0), obstacle('near', 0, -30), obstacle('outside', 200, 0)];
  assert.equal(findObstacleInCircle({ x: 0, y: 0 }, obstacles, project, 112)?.id, 'near');
});

test('the radius edge is inclusive; anything beyond it is no match', () => {
  assert.equal(findObstacleInCircle({ x: 0, y: 0 }, [obstacle('edge', 112, 0)], project, 112)?.id, 'edge');
  assert.equal(findObstacleInCircle({ x: 0, y: 0 }, [obstacle('beyond', 112.5, 0)], project, 112), null);
  assert.equal(findObstacleInCircle({ x: 0, y: 0 }, [], project, 112), null);
});

test('mock obstacles load with unique ids and copies callers cannot mutate into the source', async () => {
  const first = await loadRegisteredObstacles(false);
  assert.ok(first.length >= 5 && first.length <= 6);
  assert.equal(new Set(first.map(({ id }) => id)).size, first.length);
  first[0].heightM = -1;
  assert.notEqual((await loadRegisteredObstacles(false))[0].heightM, -1);
});

test('fire stations become reportable stand-in obstacles named after the station', () => {
  const properties = {
    id: 'brannstasjon.12', brannstasjon: 'Sandviken', brannvesen: 'Bergen brannvesen',
    stasjonstype: 'H', kasernert: 'DN', opphav: 'DSB', informasjon: '',
  };
  assert.deepEqual(fireStationToObstacle(properties, [5.32, 60.41]),
    { id: 'DSB-12', name: 'Sandviken', type: 'Building', heightM: 10, lit: false, lat: 60.41, lng: 5.32 });
  const collection = {
    type: 'FeatureCollection' as const,
    features: [
      { type: 'Feature' as const, properties, geometry: { type: 'Point' as const, coordinates: [5.32, 60.41] } },
      { type: 'Feature' as const, properties: { ...properties, id: 'brannstasjon.13' }, geometry: null },
    ],
  };
  assert.deepEqual(fireStationsToObstacles(collection).map(({ id }) => id), ['DSB-12'], 'features without a point are skipped');
});

test('the fetched data file holds real stations as [longitude, latitude] in Norway', async () => {
  const { readFile } = await import('node:fs/promises');
  const data = JSON.parse(await readFile('public/data/brannstasjoner.geojson', 'utf8'));
  const obstacles = fireStationsToObstacles(data);
  assert.ok(obstacles.length > 100);
  for (const { lat, lng } of obstacles) assert.ok(lat > 57 && lat < 82 && lng > -10 && lng < 35, `${lng}, ${lat}`);
});
