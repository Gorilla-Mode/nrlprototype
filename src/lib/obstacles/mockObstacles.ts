import type { RegisteredObstacle } from './registeredObstacles.js';

/** Point obstacles around the default map centre (5.3435, 60.4055), roughly 1 km apart. */
export const mockObstacles: readonly RegisteredObstacle[] = [
  { id: 'NRL-10432', type: 'Mast', heightM: 45, lit: true, lat: 60.4090, lng: 5.3330 },
  { id: 'NRL-10518', type: 'Wind turbine', heightM: 120, lit: true, lat: 60.4150, lng: 5.3610 },
  { id: 'NRL-10677', type: 'Crane', heightM: 62, lit: false, lat: 60.3985, lng: 5.3470 },
  { id: 'NRL-10731', type: 'Building', heightM: 38, lit: false, lat: 60.4000, lng: 5.3240 },
  { id: 'NRL-10804', type: 'Tower', heightM: 85, lit: true, lat: 60.4030, lng: 5.3680 },
  { id: 'NRL-10915', type: 'Mast', heightM: 30, lit: false, lat: 60.4170, lng: 5.3420 },
];
