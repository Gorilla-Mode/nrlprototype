import type { ObstacleType } from '../reporting/obstacle.js';
import type { ReportGeometry } from '../reports/reportGeometry.js';
import type { ReportPhoto } from '../reports/photos.js';

export type Draft = {
  id: string;
  title: string;
  category: ObstacleType;
  value: string;
  currentStep: number;
  totalSteps: number;
  stepLabel: string;
  editedDate: string;

  // detail-page fields
  createdDate: string;
  heightAboveGround: string;
  /** Pilot's answer; optional, so null means not answered. */
  lighting: Lighting | null;
  pilotReportText: string;
  reportedByName: string;
  reportedByOrg: string;
  /** Drawn obstacle geometry; null until a location is set. */
  geometry: ReportGeometry | null;
  /** Optional photos, downscaled; at most maxPhotos. */
  photos: ReportPhoto[];
};

/** Whether the obstacle is lit. Optional: pilots cannot always tell. */
export type Lighting = 'yes' | 'no' | 'unknown';

export const lightingOptions: readonly { value: Lighting; label: string }[] = [
  { value: 'yes', label: 'Yes' },
  { value: 'no', label: 'No' },
  { value: 'unknown', label: 'Unknown' },
];

/** Field value shown outside edit mode. */
export function lightingValueLabel(lighting: Lighting | null): string {
  if (lighting === 'yes') return 'Lit';
  if (lighting === 'no') return 'Not lit';
  if (lighting === 'unknown') return 'Unknown';
  return 'Not set';
}

export function lightingSummary(lighting: Lighting | null): string {
  if (lighting === 'yes') return 'Lit — reported by pilot';
  if (lighting === 'no') return 'Not lit — reported by pilot';
  if (lighting === 'unknown') return 'Unknown';
  return 'Not set';
}

/** Fields that block sending a draft for review. Lighting is optional and never listed. */
export function missingDraftFields(draft: Draft): string[] {
  return draft.heightAboveGround === 'Not set' ? ['height above ground'] : [];
}

export function heightInMeters(value: string): number | null {
  const match = value.match(/\(([\d.]+)\s*m\)/);
  return match ? parseFloat(match[1]) : null;
}

export function formatHeightFromMeters(meters: number | null): string {
  if (meters === null || Number.isNaN(meters)) return 'Not set';
  const feet = Math.round(meters * 3.28084);
  return `${feet} ft (${meters} m)`;
}

export function formatToday(): string {
  const now = new Date();
  const day = String(now.getDate()).padStart(2, '0');
  const month = String(now.getMonth() + 1).padStart(2, '0');
  return `${day}.${month}.${now.getFullYear()}`;
}
