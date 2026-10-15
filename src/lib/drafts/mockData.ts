import { ObstacleType } from '../reporting/obstacle.js';
import type { Draft } from './types.js';

// Module-scoped so the same objects persist across DraftsPage mounts/unmounts
// (e.g. navigating into a draft/report and back), letting in-place edits like
// "Save draft" survive the round trip in this backend-less prototype.
// Line geometry: the first vertex is the recorded position, the second is illustrative.
export const drafts: Draft[] = [
  {
    id: '1', title: 'Bru Sandnessjøen', category: ObstacleType.Bridge, value: 'Not set',
    currentStep: 2, totalSteps: 2, stepLabel: 'Additional information',
    editedDate: '14.10.2024', createdDate: '14.10.2024',
    heightAboveGround: 'Not set', lighting: null,
    pilotReportText: 'Observed a new suspension bridge under construction crossing the fjord, unmarked and not on current charts.',
    reportedByName: 'Paul Atreides', reportedByOrg: 'Politihelikoptertjenesten',
    geometry: { type: 'LineString', coordinates: [[12.6300, 66.0210], [12.6487, 66.0262]] },
    photos: []
  },
  {
    id: '2', title: 'Ny mast Dovre', category: ObstacleType.Pole, value: '95 ft (29 m)',
    currentStep: 1, totalSteps: 2, stepLabel: 'Obstacle details',
    editedDate: '13.10.2024', createdDate: '13.10.2024',
    heightAboveGround: '95 ft (29 m)', lighting: null,
    pilotReportText: 'New radio mast near Dovre, taller than surrounding terrain, no lighting visible at dusk.',
    reportedByName: 'Paul Atreides', reportedByOrg: 'Politihelikoptertjenesten',
    geometry: { type: 'Point', coordinates: [9.2570, 62.0730] },
    photos: []
  },
  {
    id: '3', title: 'Uten navn', category: ObstacleType.Other, value: 'Not set',
    currentStep: 1, totalSteps: 2, stepLabel: 'Obstacle details',
    editedDate: '12.10.2024', createdDate: '12.10.2024',
    heightAboveGround: 'Not set', lighting: null,
    pilotReportText: 'Unidentified obstacle spotted during low-altitude flight, needs follow-up before details can be confirmed.',
    reportedByName: 'Paul Atreides', reportedByOrg: 'Politihelikoptertjenesten',
    geometry: null,
    photos: []
  }
];
