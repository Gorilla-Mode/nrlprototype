import type { ObstacleType } from '../reporting/obstacle.js';
import type { ReportGeometry } from '../reports/reportGeometry.js';
import type { ReportPhoto } from '../reports/photos.js';
import type { ErrorReportRecord } from '../obstacles/errorReport.js';
import type { StoredPlace } from '../reports/placeName.js';

export type Draft = {
  id: string;
  /** Optional obstacle name; empty when none was given. */
  title: string;
  /** Null until the pilot chooses a type; never defaulted to Other. */
  category: ObstacleType | null;
  value: string;
  currentStep: number;
  totalSteps: number;
  stepLabel: string;
  /** ISO 8601 timestamps. */
  createdAt: string;
  updatedAt: string;

  // detail-page fields
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
  /** Set for an error report on a registered obstacle; absent for a new obstacle. */
  errorReport?: ErrorReportRecord;
  /** Older drafts only: true when no type was chosen and `category` holds Other as a placeholder. */
  typeMissing?: boolean;
  /** Place name looked up for the location; absent until looked up. */
  place?: StoredPlace;
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

/** The chosen obstacle type, or null when none was chosen (including older placeholder drafts). */
export function draftType(draft: Pick<Draft, 'category' | 'typeMissing'>): ObstacleType | null {
  return draft.typeMissing ? null : draft.category;
}

/**
 * Fields that block sending a draft for review, in form order; this decides Draft or Ready to
 * send on save. An error report is about a registered obstacle and has no type of its own.
 * Lighting is optional and never listed.
 */
export function missingDraftFields(draft: Draft): string[] {
  return [
    ...(!draft.errorReport && draftType(draft) === null ? ['obstacle type'] : []),
    ...(draft.heightAboveGround === 'Not set' ? ['height above ground'] : []),
  ];
}

/** Metres from "30 m (98 ft)", or from the earlier stored "98 ft (30 m)"; null when not set. */
export function heightInMeters(value: string): number | null {
  const match = value.match(/^([\d.]+)\s*m\b/) ?? value.match(/\(([\d.]+)\s*m\)/);
  return match ? parseFloat(match[1]) : null;
}

/** "30 m (98 ft)", or "Not set". */
export function formatHeightFromMeters(meters: number | null): string {
  if (meters === null || Number.isNaN(meters)) return 'Not set';
  const feet = Math.round(meters * 3.28084);
  return `${meters} m (${feet} ft)`;
}
