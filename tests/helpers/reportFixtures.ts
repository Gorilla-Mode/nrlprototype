import { ObstacleType } from '../../src/lib/reporting/obstacle.js';
import type { Draft } from '../../src/lib/drafts/types.js';
import type { Report } from '../../src/lib/reports/reportsData.js';

// Example reports and drafts for tests; the app itself starts empty.
// Each line's first vertex is the originally recorded position; the second
// vertex is illustrative so line reports have a real extent to display.
export const reports: Report[] = [
  { id: 'kraftlinje-sor', name: 'Kraftlinje Sør', obstacleType: ObstacleType.Airspan, heightFeet: 40, heightMeters: 12, createdAt: '2024-10-12T12:00:00', updatedAt: '2024-10-14T12:00:00', status: 'ready',
    lighting: 'no', pilotReportText: 'Power line crossing the valley between two masts. Cables are unlit and hard to see against the ridge.',
    reportedByName: 'Paul Atreides', reportedByOrg: 'Politihelikoptertjenesten', geometry: { type: 'LineString', coordinates: [[5.3221, 60.3913], [5.3405, 60.3982]] }, photos: [] },
  { id: 'gondolbane-voss', name: 'Gondolbane Voss', obstacleType: ObstacleType.Airspan, heightFeet: 90, heightMeters: 27, createdAt: '2024-10-11T12:00:00', updatedAt: '2024-10-11T12:00:00', status: 'ready',
    lighting: 'yes', pilotReportText: 'Cable car line crossing the valley, marked with red lights along the span.',
    reportedByName: 'Paul Atreides', reportedByOrg: 'Politihelikoptertjenesten', geometry: { type: 'LineString', coordinates: [[6.4152, 60.6295], [6.4420, 60.6371]] }, photos: [] },
  { id: 'mast-fjellet', name: 'Mast Fjellet', obstacleType: ObstacleType.Pole, heightFeet: 120, heightMeters: 36, createdAt: '2024-10-09T12:00:00', updatedAt: '2024-10-10T12:00:00', status: 'ready',
    lighting: 'yes', pilotReportText: 'Tall radio mast on the ridge line, lit with steady red lights.',
    reportedByName: 'Paul Atreides', reportedByOrg: 'Politihelikoptertjenesten', geometry: { type: 'Point', coordinates: [8.7850, 61.0450] }, photos: [] },
  { id: 'taubane-lofoten', name: 'Taubane Lofoten', obstacleType: ObstacleType.Airspan, heightFeet: 65, heightMeters: 20, createdAt: '2024-10-08T12:00:00', updatedAt: '2024-10-14T12:00:00', status: 'ready',
    lighting: 'no', pilotReportText: 'Aerial tramway cable spotted low over the fjord, no lighting visible.',
    reportedByName: 'Paul Atreides', reportedByOrg: 'Politihelikoptertjenesten', geometry: { type: 'LineString', coordinates: [[13.6350, 68.2080], [13.6602, 68.2141]] }, photos: [] },
  { id: 'antenne-tromso', name: 'Antenne Tromsø', obstacleType: ObstacleType.Pole, heightFeet: 150, heightMeters: 45, createdAt: '2024-10-13T12:00:00', updatedAt: '2024-10-14T12:00:00', sentAt: '2024-10-14T12:00:00', status: 'pending',
    lighting: 'yes', pilotReportText: 'Antenna tower near the city center, flashing white light at the top.',
    reportedByName: 'Paul Atreides', reportedByOrg: 'Politihelikoptertjenesten', geometry: { type: 'Point', coordinates: [18.9553, 69.6492] }, photos: [] },
  { id: 'lysmast-gardermoen', name: 'Lysmast Gardermoen', obstacleType: ObstacleType.Building, heightFeet: 80, heightMeters: 24, createdAt: '2024-10-12T12:00:00', updatedAt: '2024-10-13T12:00:00', sentAt: '2024-10-13T12:00:00', status: 'pending',
    lighting: 'yes', pilotReportText: 'Floodlight mast near the airport perimeter, steady red light visible at dusk.',
    reportedByName: 'Paul Atreides', reportedByOrg: 'Politihelikoptertjenesten', geometry: { type: 'Point', coordinates: [11.1004, 60.1939] }, photos: [] },
  { id: 'kabel-hardanger', name: 'Kabel Hardanger', obstacleType: ObstacleType.Airspan, heightFeet: 35, heightMeters: 10, createdAt: '2024-10-11T12:00:00', updatedAt: '2024-10-12T12:00:00', sentAt: '2024-10-12T12:00:00', status: 'pending',
    lighting: 'no', pilotReportText: 'Power line spanning the fjord, unmarked and close to the usual low-altitude route.',
    reportedByName: 'Paul Atreides', reportedByOrg: 'Politihelikoptertjenesten', geometry: { type: 'LineString', coordinates: [[6.7996, 60.4076], [6.8302, 60.4210]] }, photos: [] },
  { id: 'vindturbin-smola', name: 'Vindturbin Smøla', obstacleType: ObstacleType.Construction, heightFeet: 310, heightMeters: 94, createdAt: '2024-10-02T12:00:00', updatedAt: '2024-10-02T12:00:00', reviewer: 'K. Johansen', status: 'approved',
    lighting: 'yes', pilotReportText: 'Wind turbine under construction, aviation obstruction lighting already installed.',
    reportedByName: 'Paul Atreides', reportedByOrg: 'Politihelikoptertjenesten', geometry: { type: 'Point', coordinates: [8.0290, 63.3860] }, photos: [] },
  { id: 'floibanen-bergen', name: 'Fløibanen Bergen', obstacleType: ObstacleType.Airspan, heightFeet: 75, heightMeters: 23, createdAt: '2024-10-01T12:00:00', updatedAt: '2024-10-01T12:00:00', reviewer: 'K. Johansen', status: 'approved',
    lighting: 'no', pilotReportText: 'Funicular cable line up the mountainside, no lighting along the span.',
    reportedByName: 'Paul Atreides', reportedByOrg: 'Politihelikoptertjenesten', geometry: { type: 'LineString', coordinates: [[5.3300, 60.3970], [5.3436, 60.3942]] }, photos: [] },
  { id: 'kraftlinje-sogn', name: 'Kraftlinje Sogn', obstacleType: ObstacleType.Airspan, heightFeet: 50, heightMeters: 15, createdAt: '2024-09-28T12:00:00', updatedAt: '2024-09-28T12:00:00', reviewer: 'M. Nansen', status: 'declined',
    lighting: 'no', pilotReportText: 'Suspected power line, later confirmed to already be on the current charts.',
    reportedByName: 'Paul Atreides', reportedByOrg: 'Politihelikoptertjenesten', geometry: { type: 'LineString', coordinates: [[6.9315, 61.2295], [6.9551, 61.2402]] }, photos: [] },
];

export const drafts: Draft[] = [
  {
    id: '1', title: 'Bru Sandnessjøen', category: ObstacleType.Bridge, value: 'Not set',
    currentStep: 2, totalSteps: 2, stepLabel: 'Additional information',
    createdAt: '2024-10-14T12:00:00', updatedAt: '2024-10-14T12:00:00',
    heightAboveGround: 'Not set', lighting: null,
    pilotReportText: 'Observed a new suspension bridge under construction crossing the fjord, unmarked and not on current charts.',
    reportedByName: 'Paul Atreides', reportedByOrg: 'Politihelikoptertjenesten',
    geometry: { type: 'LineString', coordinates: [[12.6300, 66.0210], [12.6487, 66.0262]] },
    photos: []
  },
  {
    id: '2', title: 'Ny mast Dovre', category: ObstacleType.Pole, value: '29 m (95 ft)',
    currentStep: 1, totalSteps: 2, stepLabel: 'Obstacle details',
    createdAt: '2024-10-13T12:00:00', updatedAt: '2024-10-13T12:00:00',
    heightAboveGround: '29 m (95 ft)', lighting: null,
    pilotReportText: 'New radio mast near Dovre, taller than surrounding terrain, no lighting visible at dusk.',
    reportedByName: 'Paul Atreides', reportedByOrg: 'Politihelikoptertjenesten',
    geometry: { type: 'Point', coordinates: [9.2570, 62.0730] },
    photos: []
  },
  {
    id: '3', title: 'Uten navn', category: ObstacleType.Other, value: 'Not set',
    currentStep: 1, totalSteps: 2, stepLabel: 'Obstacle details',
    createdAt: '2024-10-12T12:00:00', updatedAt: '2024-10-12T12:00:00',
    heightAboveGround: 'Not set', lighting: null,
    pilotReportText: 'Unidentified obstacle spotted during low-altitude flight, needs follow-up before details can be confirmed.',
    reportedByName: 'Paul Atreides', reportedByOrg: 'Politihelikoptertjenesten',
    geometry: null,
    photos: []
  }
];
