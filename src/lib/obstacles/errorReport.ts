import type { RegisteredObstacle } from './registeredObstacles.js';
import { describeMove, type GeoPosition } from './position.js';
import type { ObstacleType } from '../reporting/obstacle.js';
import type { Lighting } from '../drafts/types.js';

/** Wrong type is only offered on the error report edit page; the map form offers the other four. */
export type ErrorKind = 'does-not-exist' | 'wrong-position' | 'wrong-height' | 'wrong-lighting' | 'wrong-type';

/** The kinds the map form offers; Wrong type is edit page only. */
export type FormErrorKind = Exclude<ErrorKind, 'wrong-type'>;

export const errorKindChoices: readonly { kind: FormErrorKind; label: string }[] = [
  { kind: 'does-not-exist', label: 'Does not exist' },
  { kind: 'wrong-position', label: 'Wrong position' },
  { kind: 'wrong-height', label: 'Wrong height' },
  { kind: 'wrong-lighting', label: 'Wrong lighting' },
];

export interface ErrorReport {
  obstacleId: string;
  errorKinds: ErrorKind[];
  /** Only when the height is reported wrong. */
  actualHeightM: number | null;
  /** Lighting reported wrong; the reported value is actualLighting, or the opposite of the registered one. */
  lightingWrong: boolean;
  /** Only from the edit page: the reported lighting and type. */
  actualLighting?: Lighting;
  actualType?: ObstacleType;
  /** Only when the position is reported wrong and the user placed the correct one. */
  correctedLat?: number;
  correctedLng?: number;
  description: string;
  timestamp: Date;
}

export interface ErrorReportInput {
  errorKinds: readonly ErrorKind[];
  actualHeightM: number | null;
  /** Edit page only; absent from the map form and from reports stored before it. */
  actualType?: ObstacleType | null;
  actualLighting?: Lighting | null;
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

/** A description can stand in for the choices when none of them fits. */
function hasErrorOrDescription({ errorKinds, description }: ErrorReportInput): boolean {
  return errorKinds.length > 0 || description.trim() !== '';
}

export function isErrorReportValid(input: ErrorReportInput): boolean {
  const { errorKinds, actualHeightM } = input;
  if (!hasErrorOrDescription(input)) return false;
  if (errorKinds.includes('wrong-height') && !isValidHeight(actualHeightM)) return false;
  if (errorKinds.includes('wrong-type') && !input.actualType) return false;
  return true;
}

/**
 * The edit page's rule, stricter than the map form's: "Information is wrong" needs at least one
 * checked field, and a checked height or type needs its value. Null when it can be sent.
 */
export function describeEditRequirement(input: ErrorReportInput): string | null {
  const { errorKinds } = input;
  if (errorKinds.includes('does-not-exist')) return null;
  if (!errorKinds.length) return 'Select at least one field that is wrong';
  if (errorKinds.includes('wrong-type') && !input.actualType) return 'Choose the reported type';
  if (errorKinds.includes('wrong-height') && !isValidHeight(input.actualHeightM)) return 'Enter the reported height';
  return null;
}

/** Why the report cannot be finished yet, in the same order as the validation rules; null when valid. */
export function describeMissingRequirement(input: ErrorReportInput): string | null {
  const { errorKinds, actualHeightM } = input;
  if (!hasErrorOrDescription(input)) return 'Select an error or describe it to continue';
  if (errorKinds.includes('wrong-height') && !isValidHeight(actualHeightM)) return 'Enter the correct height to continue';
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

const lightingWords: Record<Lighting, string> = { yes: 'Lit', no: 'Not lit', unknown: 'Unknown' };

/** The lighting reported for a wrong-lighting answer: the chosen value, or the opposite of the registered one. */
export function reportedLighting(obstacle: Pick<RegisteredObstacle, 'lit'>, answers: Pick<ErrorReportAnswers, 'actualLighting'>): Lighting {
  return answers.actualLighting ?? (obstacle.lit ? 'no' : 'yes');
}

/** "Lit → Unknown": the registered lighting and the reported one. */
export function describeReportedLighting(obstacle: Pick<RegisteredObstacle, 'lit'>, answers: Pick<ErrorReportAnswers, 'actualLighting'>): string {
  return `${obstacle.lit ? 'Lit' : 'Not lit'} → ${lightingWords[reportedLighting(obstacle, answers)]}`;
}

export function lightingWord(lighting: Lighting): string {
  return lightingWords[lighting];
}

export function buildErrorReport(obstacle: RegisteredObstacle, input: ErrorReportInput, timestamp = new Date()): ErrorReport {
  return {
    obstacleId: obstacle.id,
    errorKinds: [...input.errorKinds],
    actualHeightM: input.errorKinds.includes('wrong-height') && isValidHeight(input.actualHeightM) ? input.actualHeightM : null,
    lightingWrong: input.errorKinds.includes('wrong-lighting'),
    ...(input.errorKinds.includes('wrong-lighting') && input.actualLighting ? { actualLighting: input.actualLighting } : {}),
    ...(input.errorKinds.includes('wrong-type') && input.actualType ? { actualType: input.actualType } : {}),
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

/** The answers as stored: plain data, so a draft or Ready report can be reopened in the form. */
export interface ErrorReportAnswers {
  errorKinds: ErrorKind[];
  actualHeightM: number | null;
  /** Edit page only: the reported type and lighting. Without actualLighting, wrong lighting means the opposite. */
  actualType?: ObstacleType | null;
  actualLighting?: Lighting | null;
  correctedPosition: GeoPosition | null;
  description: string;
}

/**
 * An error report as Reports stores it: the registered obstacle as it was when reported, and
 * the answers. What is sent is still buildErrorReport(obstacle, answers).
 */
export interface ErrorReportRecord {
  obstacle: RegisteredObstacle;
  answers: ErrorReportAnswers;
}

export const emptyErrorReportAnswers: ErrorReportAnswers = { errorKinds: [], actualHeightM: null, correctedPosition: null, description: '' };

/** The obstacle's name, or its type when it has none. */
export function registeredObstacleLabel(obstacle: RegisteredObstacle): string {
  return obstacle.name ?? obstacle.type;
}

/** Card and page heading; says it is an error report, not a new obstacle. */
export function errorReportHeading({ obstacle }: ErrorReportRecord): string {
  return `Error report · ${registeredObstacleLabel(obstacle)}`;
}

/** "Wrong type, Wrong height", in choice order; "Described below" when only a description says it. */
export function errorKindsLabel(kinds: readonly ErrorKind[]): string {
  const labels = [{ kind: 'wrong-type' as const, label: 'Wrong type' }, ...errorKindChoices]
    .filter(({ kind }) => kinds.includes(kind)).map(({ label }) => label);
  return labels.length ? labels.join(', ') : 'Described below';
}

/** One row per answer, in the order the form asks; shared by the summary and the detail page. */
export function errorReportRows({ obstacle, answers }: ErrorReportRecord): { key: 'obstacle' | 'kinds' | 'height' | 'lighting' | 'position' | 'description'; label: string; value: string }[] {
  const kinds = answers.errorKinds;
  const height = kinds.includes('wrong-height') && isValidHeight(answers.actualHeightM)
    ? `${answers.actualHeightM} m (registered ${obstacle.heightM} m)` : 'Not reported';
  const position = !kinds.includes('wrong-position') ? 'Not reported'
    : answers.correctedPosition ? `${describeMove(obstacle, answers.correctedPosition)} · ${formatCoordinates(answers.correctedPosition)}` : 'Position not specified';
  return [
    { key: 'obstacle', label: 'Obstacle', value: `${registeredObstacleLabel(obstacle)} · ID ${obstacle.id}` },
    { key: 'kinds', label: 'What is wrong', value: errorKindsLabel(kinds) },
    { key: 'height', label: 'Actual height', value: height },
    { key: 'lighting', label: 'Lighting', value: kinds.includes('wrong-lighting') ? describeReportedLighting(obstacle, answers) : 'Not reported' },
    { key: 'position', label: 'Position', value: position },
    { key: 'description', label: 'Description', value: answers.description.trim() || 'Not added' },
  ];
}
