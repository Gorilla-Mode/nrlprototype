import assert from 'node:assert/strict';
import { test, type TestContext } from 'node:test';
import { createReportController } from '../src/lib/reporting/createReportController.js';
import { ObstacleType, type Obstacle, type ObstacleGeometry } from '../src/lib/reporting/obstacle.js';
import { position } from './helpers/geolocation.js';

function setup() {
  const registered: Obstacle[] = [];
  const requests: {
    success: (position: GeolocationPosition) => void;
    error: () => void;
  }[] = [];
  const startedAt = new Date('2026-09-11T08:15:00.000Z');
  let ids = 0;
  const reporting = createReportController({
    onRegister: (obstacle) => registered.push(obstacle),
    requestPosition: (success, error) => requests.push({ success, error }),
    createId: () => `00000000-0000-4000-8000-${String(++ids).padStart(12, '0')}`,
    now: () => startedAt,
  });
  return { reporting, registered, requests, startedAt };
}

const geometries = [
  { type: 'Point', coordinates: [5.34, 60.4] },
  { type: 'LineString', coordinates: [[5.34, 60.4], [5.35, 60.41]] },
  { type: 'Polygon', coordinates: [[[5.34, 60.4], [5.35, 60.4], [5.35, 60.41], [5.34, 60.4]]] },
] satisfies ObstacleGeometry[];

for (const geometry of geometries) {
  test(`registers ${geometry.type} as GeoJSON with generated report data`, () => {
    const h = setup();
    h.reporting.start();
    h.requests[0].success(position(5.31, 60.39));
    h.reporting.complete(geometry);
    assert.deepEqual(h.registered, [{
      id: '00000000-0000-4000-8000-000000000001',
      type: ObstacleType.Other,
      description: '',
      height: 0,
      gps_position: { lat: 60.39, lng: 5.31 },
      timestamp: h.startedAt,
      obstacle_position: geometry,
    }]);
  });
}

test('waits for reporter GPS when drawing completes first and registers exactly once', () => {
  const h = setup();
  h.reporting.start();
  h.reporting.complete(geometries[0]);
  h.reporting.complete(geometries[1]);
  assert.equal(h.registered.length, 0);
  h.requests[0].success(position());
  h.requests[0].success(position(6, 61));
  h.requests[0].error();
  assert.equal(h.registered.length, 1);
  assert.equal(h.registered[0].obstacle_position, geometries[0]);
});

for (const failure of ['callback', 'exception'] as const) {
  test(`registers with null reporter GPS after a location ${failure}`, () => {
    const registered: Obstacle[] = [];
    const reporting = createReportController({
      onRegister: (obstacle) => registered.push(obstacle),
      requestPosition: failure === 'callback'
        ? (_success, error) => error()
        : () => { throw new Error('Location unavailable'); },
      createId: () => '00000000-0000-4000-8000-000000000001',
      now: () => new Date('2026-09-11T08:15:00.000Z'),
    });
    reporting.start();
    reporting.complete(geometries[0]);
    assert.equal(registered.length, 1);
    assert.equal(registered[0].gps_position, null);
  });
}

test('cancel and destroy invalidate pending reports and their late GPS callbacks', () => {
  const h = setup();
  h.reporting.start();
  h.reporting.complete(geometries[0]);
  h.reporting.cancel();
  h.requests[0].success(position());
  assert.equal(h.registered.length, 0);

  h.reporting.start();
  h.reporting.complete(geometries[1]);
  h.reporting.destroy();
  h.reporting.destroy();
  h.requests[1].error();
  h.reporting.start();
  h.reporting.complete(geometries[2]);
  assert.equal(h.registered.length, 0);
  assert.equal(h.requests.length, 2);
});

test('default locator requests one high-accuracy position without map tracking', (t: TestContext) => {
  let request: {
    success: PositionCallback;
    error: PositionErrorCallback | null | undefined;
    options: PositionOptions | undefined;
  } | undefined;
  const geolocation: Pick<Geolocation, 'getCurrentPosition'> = {
    getCurrentPosition(success, error, options) { request = { success, error, options }; },
  };
  for (const [key, value] of Object.entries({
    window: { isSecureContext: true },
    navigator: { geolocation },
  })) {
    const descriptor = Object.getOwnPropertyDescriptor(globalThis, key);
    Object.defineProperty(globalThis, key, { value, configurable: true });
    t.after(() => {
      if (descriptor) Object.defineProperty(globalThis, key, descriptor);
      else Reflect.deleteProperty(globalThis, key);
    });
  }

  const registered: Obstacle[] = [];
  const reporting = createReportController({
    onRegister: (obstacle) => registered.push(obstacle),
    createId: () => '00000000-0000-4000-8000-000000000001',
  });
  reporting.start();
  assert.deepEqual(request?.options, { enableHighAccuracy: true, timeout: 10000 });
  reporting.complete(geometries[0]);
  request?.success(position());
  assert.equal(registered.length, 1);
});
