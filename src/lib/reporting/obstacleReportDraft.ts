/** One-step presentation helpers. Canonical metadata lives in createDetailsController. */
export type HeightUnit = 'm' | 'ft';

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
