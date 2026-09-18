export type ReportStatus = 'ready' | 'pending' | 'approved' | 'declined';

export interface Report {
  readonly id: string;
  name: string;
  obstacleType: string;
  heightFeet: number;
  heightMeters: number;
  createdDate: string;
  status: ReportStatus;
  /** Edited date (ready) or sent date (pending); unused for approved/declined. */
  secondaryDate?: string;
  /** Reviewer name shown for approved/declined. */
  reviewer?: string;
  /** Whether the obstacle is lit: 'Yes', 'No', or 'Not set'. */
  lighting: string;
  pilotReportText: string;
  reportedByName: string;
  reportedByOrg: string;
  coordinates: { lat: number; lng: number } | null;
  vertexCount: number;
}

export const reports: Report[] = [
  { id: 'kraftlinje-sor', name: 'Kraftlinje Sør', obstacleType: 'Aerial span', heightFeet: 40, heightMeters: 12, createdDate: '12.10.2024', secondaryDate: '14.10.2024', status: 'ready',
    lighting: 'No', pilotReportText: 'Power line crossing the valley between two masts. Cables are unlit and hard to see against the ridge.',
    reportedByName: 'Paul Atreides', reportedByOrg: 'Politihelikoptertjenesten', coordinates: { lat: 60.3913, lng: 5.3221 }, vertexCount: 2 },
  { id: 'gondolbane-voss', name: 'Gondolbane Voss', obstacleType: 'Cable', heightFeet: 90, heightMeters: 27, createdDate: '11.10.2024', secondaryDate: '11.10.2024', status: 'ready',
    lighting: 'Yes', pilotReportText: 'Cable car line crossing the valley, marked with red lights along the span.',
    reportedByName: 'Paul Atreides', reportedByOrg: 'Politihelikoptertjenesten', coordinates: { lat: 60.6295, lng: 6.4152 }, vertexCount: 2 },
  { id: 'mast-fjellet', name: 'Mast Fjellet', obstacleType: 'Pole / tower', heightFeet: 120, heightMeters: 36, createdDate: '09.10.2024', secondaryDate: '10.10.2024', status: 'ready',
    lighting: 'Yes', pilotReportText: 'Tall radio mast on the ridge line, lit with steady red lights.',
    reportedByName: 'Paul Atreides', reportedByOrg: 'Politihelikoptertjenesten', coordinates: { lat: 61.0450, lng: 8.7850 }, vertexCount: 1 },
  { id: 'taubane-lofoten', name: 'Taubane Lofoten', obstacleType: 'Cable', heightFeet: 65, heightMeters: 20, createdDate: '08.10.2024', secondaryDate: '14.10.2024', status: 'ready',
    lighting: 'No', pilotReportText: 'Aerial tramway cable spotted low over the fjord, no lighting visible.',
    reportedByName: 'Paul Atreides', reportedByOrg: 'Politihelikoptertjenesten', coordinates: { lat: 68.2080, lng: 13.6350 }, vertexCount: 2 },
  { id: 'antenne-tromso', name: 'Antenne Tromsø', obstacleType: 'Pole / tower', heightFeet: 150, heightMeters: 45, createdDate: '13.10.2024', secondaryDate: '14.10.2024', status: 'pending',
    lighting: 'Yes', pilotReportText: 'Antenna tower near the city center, flashing white light at the top.',
    reportedByName: 'Paul Atreides', reportedByOrg: 'Politihelikoptertjenesten', coordinates: { lat: 69.6492, lng: 18.9553 }, vertexCount: 1 },
  { id: 'lysmast-gardermoen', name: 'Lysmast Gardermoen', obstacleType: 'Building', heightFeet: 80, heightMeters: 24, createdDate: '12.10.2024', secondaryDate: '13.10.2024', status: 'pending',
    lighting: 'Yes', pilotReportText: 'Floodlight mast near the airport perimeter, steady red light visible at dusk.',
    reportedByName: 'Paul Atreides', reportedByOrg: 'Politihelikoptertjenesten', coordinates: { lat: 60.1939, lng: 11.1004 }, vertexCount: 1 },
  { id: 'kabel-hardanger', name: 'Kabel Hardanger', obstacleType: 'Aerial span', heightFeet: 35, heightMeters: 10, createdDate: '11.10.2024', secondaryDate: '12.10.2024', status: 'pending',
    lighting: 'No', pilotReportText: 'Power line spanning the fjord, unmarked and close to the usual low-altitude route.',
    reportedByName: 'Paul Atreides', reportedByOrg: 'Politihelikoptertjenesten', coordinates: { lat: 60.4076, lng: 6.7996 }, vertexCount: 2 },
  { id: 'vindturbin-smola', name: 'Vindturbin Smøla', obstacleType: 'Construction', heightFeet: 310, heightMeters: 94, createdDate: '02.10.2024', reviewer: 'K. Johansen', status: 'approved',
    lighting: 'Yes', pilotReportText: 'Wind turbine under construction, aviation obstruction lighting already installed.',
    reportedByName: 'Paul Atreides', reportedByOrg: 'Politihelikoptertjenesten', coordinates: { lat: 63.3860, lng: 8.0290 }, vertexCount: 1 },
  { id: 'floibanen-bergen', name: 'Fløibanen Bergen', obstacleType: 'Cable', heightFeet: 75, heightMeters: 23, createdDate: '01.10.2024', reviewer: 'K. Johansen', status: 'approved',
    lighting: 'No', pilotReportText: 'Funicular cable line up the mountainside, no lighting along the span.',
    reportedByName: 'Paul Atreides', reportedByOrg: 'Politihelikoptertjenesten', coordinates: { lat: 60.3970, lng: 5.3300 }, vertexCount: 2 },
  { id: 'kraftlinje-sogn', name: 'Kraftlinje Sogn', obstacleType: 'Aerial span', heightFeet: 50, heightMeters: 15, createdDate: '28.09.2024', reviewer: 'M. Nansen', status: 'declined',
    lighting: 'No', pilotReportText: 'Suspected power line, later confirmed to already be on the current charts.',
    reportedByName: 'Paul Atreides', reportedByOrg: 'Politihelikoptertjenesten', coordinates: { lat: 61.2295, lng: 6.9315 }, vertexCount: 2 },
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
