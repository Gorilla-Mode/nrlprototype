import { ObstacleType } from './obstacle.js';

/** Report metadata collected in the step-1 overlay, after geometry registration. */
export type LightingStatus = 'unknown' | 'lit' | 'none';
export type HeightUnit = 'm' | 'ft';

export interface ObstacleReportDraft {
  readonly obstacleType: ObstacleType | null;
  readonly otherTypeLabel: string;
  readonly height: number | null;
  readonly heightUnit: HeightUnit;
  readonly lighting: LightingStatus;
  readonly descriptionEnabled: boolean;
  readonly description: string;
  readonly notPresent: boolean;
}

export const minObstacleHeightMeters = 5;
export const maxObstacleHeightMeters = 300;
export const defaultObstacleHeightMeters = 10;

export const emptyObstacleReportDraft: ObstacleReportDraft = {
  obstacleType: null,
  otherTypeLabel: '',
  height: defaultObstacleHeightMeters,
  heightUnit: 'm',
  lighting: 'unknown',
  descriptionEnabled: false,
  description: '',
  notPresent: false,
};

const lightingCycle: readonly LightingStatus[] = ['unknown', 'lit', 'none'];

export function cycleLighting(draft: ObstacleReportDraft): ObstacleReportDraft {
  const next = lightingCycle[(lightingCycle.indexOf(draft.lighting) + 1) % lightingCycle.length];
  return { ...draft, lighting: next };
}

export function toggleDescription(draft: ObstacleReportDraft): ObstacleReportDraft {
  const descriptionEnabled = !draft.descriptionEnabled;
  return { ...draft, descriptionEnabled, description: descriptionEnabled ? draft.description : '' };
}

export function toggleNotPresent(draft: ObstacleReportDraft): ObstacleReportDraft {
  return { ...draft, notPresent: !draft.notPresent };
}

export function setObstacleType(draft: ObstacleReportDraft, obstacleType: ObstacleType): ObstacleReportDraft {
  return { ...draft, obstacleType, otherTypeLabel: obstacleType === ObstacleType.Other ? draft.otherTypeLabel : '' };
}

export function setOtherTypeLabel(draft: ObstacleReportDraft, otherTypeLabel: string): ObstacleReportDraft {
  return { ...draft, otherTypeLabel };
}

export function setHeight(draft: ObstacleReportDraft, heightMeters: number): ObstacleReportDraft {
  const clamped = Math.min(maxObstacleHeightMeters, Math.max(minObstacleHeightMeters, Math.round(heightMeters)));
  return { ...draft, height: clamped };
}

export function toggleHeightUnit(draft: ObstacleReportDraft): ObstacleReportDraft {
  return { ...draft, heightUnit: draft.heightUnit === 'm' ? 'ft' : 'm' };
}

export function setDescription(draft: ObstacleReportDraft, description: string): ObstacleReportDraft {
  return { ...draft, description };
}

/** Height is only required unless the obstacle is reported as no longer present. */
export function canFinishReport(draft: ObstacleReportDraft): boolean {
  if (!draft.obstacleType) return false;
  return draft.notPresent || draft.height !== null;
}

const metersToFeetFactor = 3.28084;

/** Canonical height stays in metres; feet is a display-only conversion. */
export function metersToDisplayUnit(meters: number, unit: HeightUnit): number {
  return unit === 'ft' ? Math.round(meters * metersToFeetFactor) : meters;
}

/** Inverse of metersToDisplayUnit: interpret a value typed in the active display unit as metres. */
export function displayUnitToMeters(value: number, unit: HeightUnit): number {
  return unit === 'ft' ? value / metersToFeetFactor : value;
}

export function formatHeightLabel(meters: number, unit: HeightUnit): string {
  return `${metersToDisplayUnit(meters, unit)} ${unit}`;
}
