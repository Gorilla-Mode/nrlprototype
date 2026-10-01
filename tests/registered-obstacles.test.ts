import assert from 'node:assert/strict';
import { test } from 'node:test';
import { findObstacleInCircle, loadRegisteredObstacles, type RegisteredObstacle } from '../src/lib/obstacles/registeredObstacles.js';

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
  const first = await loadRegisteredObstacles();
  assert.ok(first.length >= 5 && first.length <= 6);
  assert.equal(new Set(first.map(({ id }) => id)).size, first.length);
  first[0].heightM = -1;
  assert.notEqual((await loadRegisteredObstacles())[0].heightM, -1);
});
