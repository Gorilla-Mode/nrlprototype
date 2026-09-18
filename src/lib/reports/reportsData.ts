export type ReportStatus = 'ready' | 'pending' | 'approved' | 'declined';

export interface Report {
  readonly id: string;
  readonly name: string;
  readonly obstacleType: string;
  readonly heightFeet: number;
  readonly heightMeters: number;
  readonly createdDate: string;
  readonly status: ReportStatus;
  /** Edited date (ready) or sent date (pending); unused for approved/declined. */
  readonly secondaryDate?: string;
  /** Reviewer name shown for approved/declined. */
  readonly reviewer?: string;
}

export const reports: readonly Report[] = [
  { id: 'kraftlinje-sor', name: 'Kraftlinje Sør', obstacleType: 'Aerial span', heightFeet: 40, heightMeters: 12, createdDate: '12.10.2024', secondaryDate: '14.10.2024', status: 'ready' },
  { id: 'gondolbane-voss', name: 'Gondolbane Voss', obstacleType: 'Cable', heightFeet: 90, heightMeters: 27, createdDate: '11.10.2024', secondaryDate: '11.10.2024', status: 'ready' },
  { id: 'mast-fjellet', name: 'Mast Fjellet', obstacleType: 'Pole / tower', heightFeet: 120, heightMeters: 36, createdDate: '09.10.2024', secondaryDate: '10.10.2024', status: 'ready' },
  { id: 'taubane-lofoten', name: 'Taubane Lofoten', obstacleType: 'Cable', heightFeet: 65, heightMeters: 20, createdDate: '08.10.2024', secondaryDate: '14.10.2024', status: 'ready' },
  { id: 'antenne-tromso', name: 'Antenne Tromsø', obstacleType: 'Pole / tower', heightFeet: 150, heightMeters: 45, createdDate: '13.10.2024', secondaryDate: '14.10.2024', status: 'pending' },
  { id: 'lysmast-gardermoen', name: 'Lysmast Gardermoen', obstacleType: 'Building', heightFeet: 80, heightMeters: 24, createdDate: '12.10.2024', secondaryDate: '13.10.2024', status: 'pending' },
  { id: 'kabel-hardanger', name: 'Kabel Hardanger', obstacleType: 'Aerial span', heightFeet: 35, heightMeters: 10, createdDate: '11.10.2024', secondaryDate: '12.10.2024', status: 'pending' },
  { id: 'vindturbin-smola', name: 'Vindturbin Smøla', obstacleType: 'Construction', heightFeet: 310, heightMeters: 94, createdDate: '02.10.2024', reviewer: 'K. Johansen', status: 'approved' },
  { id: 'floibanen-bergen', name: 'Fløibanen Bergen', obstacleType: 'Cable', heightFeet: 75, heightMeters: 23, createdDate: '01.10.2024', reviewer: 'K. Johansen', status: 'approved' },
  { id: 'kraftlinje-sogn', name: 'Kraftlinje Sogn', obstacleType: 'Aerial span', heightFeet: 50, heightMeters: 15, createdDate: '28.09.2024', reviewer: 'M. Nansen', status: 'declined' },
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
