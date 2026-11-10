import assert from 'node:assert/strict';
import { test } from 'node:test';
import { bearingDeg, compassPoint, describeMove, distanceM, formatDistance } from '../src/lib/obstacles/position.js';

const origin = { lat: 60.4090, lng: 5.3330 };

test('haversine distance matches known spans', () => {
  // One degree of latitude is about 111.2 km everywhere.
  assert.ok(Math.abs(distanceM({ lat: 60, lng: 5 }, { lat: 61, lng: 5 }) - 111_195) < 5);
  assert.equal(distanceM(origin, origin), 0);
});

test('bearings map onto eight compass points', () => {
  assert.equal(compassPoint(bearingDeg(origin, { lat: 60.42, lng: 5.333 })), 'N');
  assert.equal(compassPoint(bearingDeg(origin, { lat: 60.40, lng: 5.333 })), 'S');
  assert.equal(compassPoint(bearingDeg(origin, { lat: 60.409, lng: 5.35 })), 'E');
  assert.equal(compassPoint(bearingDeg(origin, { lat: 60.409, lng: 5.31 })), 'W');
  assert.deepEqual([0, 22, 23, 90, 157, 202, 247, 292, 337, 359].map(compassPoint),
    ['N', 'N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW', 'N']);
});

test('moves are described with distance and direction', () => {
  // ~0.001° latitude ≈ 111 m north; equal metric offsets north and east give NE.
  assert.equal(describeMove(origin, { lat: 60.410, lng: 5.3330 }), 'Moved 111 m N');
  const east = 0.001 / Math.cos(origin.lat * Math.PI / 180);
  assert.match(describeMove(origin, { lat: 60.410, lng: 5.3330 + east }), /^Moved 157 m NE$/);
  assert.equal(describeMove(origin, origin), 'Not moved');
  assert.equal(formatDistance(1234), '1.2 km');
});
