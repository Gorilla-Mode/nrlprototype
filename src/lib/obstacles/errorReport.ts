import type { RegisteredObstacle } from './registeredObstacles.js';
import type { GeoPosition } from './position.js';

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
  /** Only when the position is reported wrong and the user placed the correct one. */
  correctedLat?: number;
  correctedLng?: number;
  description: string;
  timestamp: Date;
}

export interface ErrorReportInput {
  errorKinds: readonly ErrorKind[];
  actualHeightM: number | null;
  /** Optional: "Wrong position" may be reported without knowing where the obstacle is. */
  correctedPosition?: GeoPosition | null;
  description: string;
}

/** "Does not exist" excludes every other kind, and any other kind excludes it. */
export function toggleErrorKind(selected: readonly ErrorKind[], kind: ErrorKind): ErrorKind[] {
  if (selected.includes(kind)) return selected.filter((item) => item !== kind);
  if (kind === 'does-not-exist') return [kind];
  return [...selected.filter((item) => item !== 'does-not-exist'), kind];
}

/** How the position map returned: a placed position, unknown, deselect, or no change. */
export type PositionChoice =
  | { kind: 'set'; position: GeoPosition }
  | { kind: 'unknown' }
  | { kind: 'remove' }
  | { kind: 'cancel' };

export function applyPositionChoice(
  errorKinds: readonly ErrorKind[],
  correctedPosition: GeoPosition | null,
  choice: PositionChoice,
): { errorKinds: ErrorKind[]; correctedPosition: GeoPosition | null } {
  const selected = errorKinds.includes('wrong-position');
  const select = () => (selected ? [...errorKinds] : toggleErrorKind(errorKinds, 'wrong-position'));
  switch (choice.kind) {
    case 'set': return { errorKinds: select(), correctedPosition: choice.position };
    case 'unknown': return { errorKinds: select(), correctedPosition: null };
    case 'remove': return { errorKinds: errorKinds.filter((kind) => kind !== 'wrong-position'), correctedPosition: null };
    case 'cancel': return { errorKinds: [...errorKinds], correctedPosition: selected ? correctedPosition : null };
  }
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

/** Why the report cannot be finished yet, in the same order as the validation rules; null when valid. */
export function describeMissingRequirement({ errorKinds, actualHeightM, description }: ErrorReportInput): string | null {
  if (errorKinds.length === 0) return 'Select at least one error to continue';
  if (errorKinds.includes('wrong-height') && !isValidHeight(actualHeightM)) return 'Enter the correct height to continue';
  if (errorKinds.includes('other') && !description.trim()) return 'Describe the error to continue';
  return null;
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
    ...(input.errorKinds.includes('wrong-position') && input.correctedPosition
      ? { correctedLat: input.correctedPosition.lat, correctedLng: input.correctedPosition.lng }
      : {}),
    description: input.description.trim(),
    timestamp,
  };
}

export function formatCoordinates({ lat, lng }: Pick<RegisteredObstacle, 'lat' | 'lng'>): string {
  return `${Math.abs(lat).toFixed(4)}° ${lat >= 0 ? 'N' : 'S'}, ${Math.abs(lng).toFixed(4)}° ${lng >= 0 ? 'E' : 'W'}`;
}
