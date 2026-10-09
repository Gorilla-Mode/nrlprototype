import { ObstacleType } from '../reporting/obstacle.js';
import type { ReportGeometry } from './reportGeometry.js';
import type { Lighting } from '../drafts/types.js';
import type { ReportPhoto } from './photos.js';

export type ReportStatus = 'ready' | 'pending' | 'approved' | 'declined';

export interface Report {
  readonly id: string;
  name: string;
  obstacleType: ObstacleType;
  heightFeet: number;
  heightMeters: number;
  createdDate: string;
  status: ReportStatus;
  /** Edited date (ready) or sent date (pending); unused for approved/declined. */
  secondaryDate?: string;
  /** Reviewer name shown for approved/declined. */
  reviewer?: string;
  /** Whether the obstacle is lit; null when the pilot did not answer. */
  lighting: Lighting | null;
  pilotReportText: string;
  reportedByName: string;
  reportedByOrg: string;
  /** Drawn obstacle geometry; null until a location is set. */
  geometry: ReportGeometry | null;
  /** Optional photos, downscaled; at most maxPhotos. */
  photos: ReportPhoto[];
}

// Mock data. Each line's first vertex is the originally recorded position; the second
// vertex is illustrative so line reports have a real extent to display.
export const reports: Report[] = [
  { id: 'kraftlinje-sor', name: 'Kraftlinje Sør', obstacleType: ObstacleType.Airspan, heightFeet: 40, heightMeters: 12, createdDate: '12.10.2024', secondaryDate: '14.10.2024', status: 'ready',
    lighting: 'no', pilotReportText: 'Power line crossing the valley between two masts. Cables are unlit and hard to see against the ridge.',
    reportedByName: 'Paul Atreides', reportedByOrg: 'Politihelikoptertjenesten', geometry: { type: 'LineString', coordinates: [[5.3221, 60.3913], [5.3405, 60.3982]] }, photos: [] },
  { id: 'gondolbane-voss', name: 'Gondolbane Voss', obstacleType: ObstacleType.Airspan, heightFeet: 90, heightMeters: 27, createdDate: '11.10.2024', secondaryDate: '11.10.2024', status: 'ready',
    lighting: 'yes', pilotReportText: 'Cable car line crossing the valley, marked with red lights along the span.',
    reportedByName: 'Paul Atreides', reportedByOrg: 'Politihelikoptertjenesten', geometry: { type: 'LineString', coordinates: [[6.4152, 60.6295], [6.4420, 60.6371]] }, photos: [] },
  { id: 'mast-fjellet', name: 'Mast Fjellet', obstacleType: ObstacleType.Pole, heightFeet: 120, heightMeters: 36, createdDate: '09.10.2024', secondaryDate: '10.10.2024', status: 'ready',
    lighting: 'yes', pilotReportText: 'Tall radio mast on the ridge line, lit with steady red lights.',
    reportedByName: 'Paul Atreides', reportedByOrg: 'Politihelikoptertjenesten', geometry: { type: 'Point', coordinates: [8.7850, 61.0450] }, photos: [] },
  { id: 'taubane-lofoten', name: 'Taubane Lofoten', obstacleType: ObstacleType.Airspan, heightFeet: 65, heightMeters: 20, createdDate: '08.10.2024', secondaryDate: '14.10.2024', status: 'ready',
    lighting: 'no', pilotReportText: 'Aerial tramway cable spotted low over the fjord, no lighting visible.',
    reportedByName: 'Paul Atreides', reportedByOrg: 'Politihelikoptertjenesten', geometry: { type: 'LineString', coordinates: [[13.6350, 68.2080], [13.6602, 68.2141]] }, photos: [] },
  { id: 'antenne-tromso', name: 'Antenne Tromsø', obstacleType: ObstacleType.Pole, heightFeet: 150, heightMeters: 45, createdDate: '13.10.2024', secondaryDate: '14.10.2024', status: 'pending',
    lighting: 'yes', pilotReportText: 'Antenna tower near the city center, flashing white light at the top.',
    reportedByName: 'Paul Atreides', reportedByOrg: 'Politihelikoptertjenesten', geometry: { type: 'Point', coordinates: [18.9553, 69.6492] }, photos: [] },
  { id: 'lysmast-gardermoen', name: 'Lysmast Gardermoen', obstacleType: ObstacleType.Building, heightFeet: 80, heightMeters: 24, createdDate: '12.10.2024', secondaryDate: '13.10.2024', status: 'pending',
    lighting: 'yes', pilotReportText: 'Floodlight mast near the airport perimeter, steady red light visible at dusk.',
    reportedByName: 'Paul Atreides', reportedByOrg: 'Politihelikoptertjenesten', geometry: { type: 'Point', coordinates: [11.1004, 60.1939] }, photos: [] },
  { id: 'kabel-hardanger', name: 'Kabel Hardanger', obstacleType: ObstacleType.Airspan, heightFeet: 35, heightMeters: 10, createdDate: '11.10.2024', secondaryDate: '12.10.2024', status: 'pending',
    lighting: 'no', pilotReportText: 'Power line spanning the fjord, unmarked and close to the usual low-altitude route.',
    reportedByName: 'Paul Atreides', reportedByOrg: 'Politihelikoptertjenesten', geometry: { type: 'LineString', coordinates: [[6.7996, 60.4076], [6.8302, 60.4210]] }, photos: [] },
  { id: 'vindturbin-smola', name: 'Vindturbin Smøla', obstacleType: ObstacleType.Construction, heightFeet: 310, heightMeters: 94, createdDate: '02.10.2024', reviewer: 'K. Johansen', status: 'approved',
    lighting: 'yes', pilotReportText: 'Wind turbine under construction, aviation obstruction lighting already installed.',
    reportedByName: 'Paul Atreides', reportedByOrg: 'Politihelikoptertjenesten', geometry: { type: 'Point', coordinates: [8.0290, 63.3860] }, photos: [] },
  { id: 'floibanen-bergen', name: 'Fløibanen Bergen', obstacleType: ObstacleType.Airspan, heightFeet: 75, heightMeters: 23, createdDate: '01.10.2024', reviewer: 'K. Johansen', status: 'approved',
    lighting: 'no', pilotReportText: 'Funicular cable line up the mountainside, no lighting along the span.',
    reportedByName: 'Paul Atreides', reportedByOrg: 'Politihelikoptertjenesten', geometry: { type: 'LineString', coordinates: [[5.3300, 60.3970], [5.3436, 60.3942]] }, photos: [] },
  { id: 'kraftlinje-sogn', name: 'Kraftlinje Sogn', obstacleType: ObstacleType.Airspan, heightFeet: 50, heightMeters: 15, createdDate: '28.09.2024', reviewer: 'M. Nansen', status: 'declined',
    lighting: 'no', pilotReportText: 'Suspected power line, later confirmed to already be on the current charts.',
    reportedByName: 'Paul Atreides', reportedByOrg: 'Politihelikoptertjenesten', geometry: { type: 'LineString', coordinates: [[6.9315, 61.2295], [6.9551, 61.2402]] }, photos: [] },
];

/** Second line of a report card, per status: edited/sent date, or the reviewer name. */
export function reportSecondaryLine(report: Report): string {
  switch (report.status) {
    case 'ready': return `Edited ${report.secondaryDate}`;
    case 'pending': return `Sent ${report.secondaryDate}`;
    case 'approved':
    case 'declined': return `Reviewer ${report.reviewer}`;
  }
}

/** Card call-to-action label: ready reports still need review, everything else just opens. */
export function reportActionLabel(report: Report): string {
  return report.status === 'ready' ? 'Review and send' : 'Open';
}

export const statusTabs = [
  { key: 'all', label: 'All' },
  { key: 'draft', label: 'Draft' },
  { key: 'ready', label: 'Ready to send' },
  { key: 'pending', label: 'Awaiting review' },
  { key: 'reviewed', label: 'Reviewed' },
] as const;

export type StatusTabKey = typeof statusTabs[number]['key'];

/** Counts a status tab from the data; "Reviewed" combines approved and declined. */
export function countForStatusTab(reports: readonly Report[], key: StatusTabKey): number {
  if (key === 'all') return reports.length;
  if (key === 'reviewed') return reports.filter((report) => report.status === 'approved' || report.status === 'declined').length;
  return reports.filter((report) => report.status === key).length;
}
