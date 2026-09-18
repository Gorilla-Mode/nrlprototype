import type { Draft } from './types';

// Module-scoped so the same objects persist across DraftsPage mounts/unmounts
// (e.g. navigating into a draft/report and back), letting in-place edits like
// "Save draft" survive the round trip in this backend-less prototype.
export const drafts: Draft[] = [
  {
    id: '1', title: 'Bru Sandnessjøen', category: 'Bridge', value: 'Not set',
    currentStep: 2, totalSteps: 2, stepLabel: 'Additional information',
    editedDate: '14.10.2024', createdDate: '14.10.2024',
    heightAboveGround: 'Not set', lighting: 'Not set',
    pilotReportText: 'Observed a new suspension bridge under construction crossing the fjord, unmarked and not on current charts.',
    reportedByName: 'Paul Atreides', reportedByOrg: 'Politihelikoptertjenesten',
    coordinates: { lat: 66.0210, lng: 12.6300 }, vertexCount: 2
  },
  {
    id: '2', title: 'Ny mast Dovre', category: 'Pole / tower', value: '95 ft (29 m)',
    currentStep: 1, totalSteps: 2, stepLabel: 'Obstacle details',
    editedDate: '13.10.2024', createdDate: '13.10.2024',
    heightAboveGround: '95 ft (29 m)', lighting: 'Not set',
    pilotReportText: 'New radio mast near Dovre, taller than surrounding terrain, no lighting visible at dusk.',
    reportedByName: 'Paul Atreides', reportedByOrg: 'Politihelikoptertjenesten',
    coordinates: { lat: 62.0730, lng: 9.2570 }, vertexCount: 1
  },
  {
    id: '3', title: 'Uten navn', category: 'Other', value: 'Not set',
    currentStep: 1, totalSteps: 2, stepLabel: 'Obstacle details',
    editedDate: '12.10.2024', createdDate: '12.10.2024',
    heightAboveGround: 'Not set', lighting: 'Not set',
    pilotReportText: 'Unidentified obstacle spotted during low-altitude flight, needs follow-up before details can be confirmed.',
    reportedByName: 'Paul Atreides', reportedByOrg: 'Politihelikoptertjenesten',
    coordinates: null, vertexCount: 0
  }
];
