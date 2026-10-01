import type { RegisteredObstacle } from './registeredObstacles.js';

export type ErrorKind = 'does-not-exist' | 'wrong-position' | 'wrong-height' | 'wrong-lighting' | 'other';

export const errorKindChoices: readonly { kind: ErrorKind; label: string }[] = [
  { kind: 'does-not-exist', label: 'Does not exist' },
  { kind: 'wrong-position', label: 'Wrong position' },
  { kind: 'wrong-height', label: 'Wrong height' },
  { kind: 'wrong-lighting', label: 'Wrong lighting' },
  { kind: 'other', label: 'Other' },
];

export interface ErrorReport {
  obstacleId: string;
  errorKinds: ErrorKind[];
  /** Only when the height is reported wrong. */
  actualHeightM: number | null;
  /** The corrected value is the opposite of the registered one, so only the flag is kept. */
  lightingWrong: boolean;
  description: string;
  timestamp: Date;
}

export interface ErrorReportInput {
  errorKinds: readonly ErrorKind[];
  actualHeightM: number | null;
  description: string;
}

/** "Does not exist" excludes every other kind, and any other kind excludes it. */
export function toggleErrorKind(selected: readonly ErrorKind[], kind: ErrorKind): ErrorKind[] {
  if (selected.includes(kind)) return selected.filter((item) => item !== kind);
  if (kind === 'does-not-exist') return [kind];
  return [...selected.filter((item) => item !== 'does-not-exist'), kind];
}

export function isValidHeight(height: number | null): height is number {
  return height !== null && Number.isFinite(height) && height > 0;
}

export function isErrorReportValid({ errorKinds, actualHeightM, description }: ErrorReportInput): boolean {
  if (errorKinds.length === 0) return false;
  if (errorKinds.includes('wrong-height') && !isValidHeight(actualHeightM)) return false;
  if (errorKinds.includes('other') && !description.trim()) return false;
  return true;
}

export function describeHeightDifference(actualHeightM: number, registeredHeightM: number): string {
  const difference = Math.round((actualHeightM - registeredHeightM) * 10) / 10;
  if (difference > 0) return `+${difference} m higher than registered`;
  if (difference < 0) return `${difference} m lower than registered`;
  return 'Same as registered';
}

export function describeLightingCorrection(registeredLit: boolean): string {
  return registeredLit ? 'Lit → Not lit' : 'Not lit → Lit';
}

export function buildErrorReport(obstacle: RegisteredObstacle, input: ErrorReportInput, timestamp = new Date()): ErrorReport {
  return {
    obstacleId: obstacle.id,
    errorKinds: [...input.errorKinds],
    actualHeightM: input.errorKinds.includes('wrong-height') && isValidHeight(input.actualHeightM) ? input.actualHeightM : null,
    lightingWrong: input.errorKinds.includes('wrong-lighting'),
    description: input.description.trim(),
    timestamp,
  };
}

export function formatCoordinates({ lat, lng }: Pick<RegisteredObstacle, 'lat' | 'lng'>): string {
  return `${Math.abs(lat).toFixed(4)}° ${lat >= 0 ? 'N' : 'S'}, ${Math.abs(lng).toFixed(4)}° ${lng >= 0 ? 'E' : 'W'}`;
}
