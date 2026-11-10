import { formatCoordinates, isValidHeight, lightingWord, reportedLighting, type ErrorReportRecord } from '../obstacles/errorReport.js';
import { describeOffsetFromRegistered } from '../obstacles/position.js';
import { formatHeightFromMeters, lightingValueLabel } from '../drafts/types.js';
import { obstacleTypeLabel } from '../reporting/obstacle.js';
import { formatLongDate, formatShortDate, type Report } from './reportsData.js';
import { coordinateLabel } from './reportGeometry.js';

/** The sent page's four states: the stored statuses as the pilot reads them. */
export type SentStatusKey = 'under_review' | 'approved' | 'rejected' | 'withdrawn';
/** Status colour role: blue, green, orange, grey. Under review is never green. */
export type SentStatusTone = 'info' | 'success' | 'warning' | 'neutral';
export type TimelineStepState = 'done' | 'current' | 'upcoming';

export interface TimelineStep {
  label: string;
  /** dd.mm.yyyy, "Waiting for reviewer" or "—". */
  detail: string;
  state: TimelineStepState;
}

export interface SentStatusView {
  key: SentStatusKey;
  tone: SentStatusTone;
  /** The header chip's wording, the same as the status block. */
  chipLabel: string;
  title: string;
  text: string;
  /** Only under review: the report can still be withdrawn. */
  canWithdraw: boolean;
  /** Only rejected, when the reviewer left one. */
  comment: string | null;
  steps: TimelineStep[];
}

export function sentStatusKey(report: Report): SentStatusKey | null {
  switch (report.status) {
    case 'pending': return 'under_review';
    case 'approved': return 'approved';
    case 'declined': return 'rejected';
    case 'withdrawn': return 'withdrawn';
    case 'ready': return null;
  }
}

const done = (label: string, timestamp: string | undefined): TimelineStep => ({ label, detail: timestamp ? formatShortDate(timestamp) : '—', state: 'done' });

/** The status block for a sent report; null for a Ready report, which has its own page. */
export function sentStatusView(report: Report): SentStatusView | null {
  const key = sentStatusKey(report);
  if (!key) return null;
  // Reports reviewed before review dates were stored fall back to their last change.
  const reviewedAt = report.reviewedAt ?? report.updatedAt;
  const created = done('Created', report.createdAt);
  const sent = done('Sent', report.sentAt);
  switch (key) {
    case 'under_review': return {
      key, tone: 'info', chipLabel: 'Under review', title: 'Under review at NRL',
      text: `Sent ${formatLongDate(report.sentAt)}. You'll be notified when the reviewer has made a decision.`,
      canWithdraw: true, comment: null,
      steps: [created, sent, { label: 'Under review', detail: 'Waiting for reviewer', state: 'current' }, { label: 'Decision', detail: '—', state: 'upcoming' }],
    };
    case 'approved': return {
      key, tone: 'success', chipLabel: 'Approved', title: 'Approved and registered',
      text: `Approved ${formatLongDate(reviewedAt)}. ${report.errorReport ? 'The change is now in NRL.' : 'The obstacle is now registered in NRL.'}`,
      canWithdraw: false, comment: null,
      steps: [created, sent, done('Reviewed', reviewedAt), done('Approved', reviewedAt)],
    };
    case 'rejected': return {
      key, tone: 'warning', chipLabel: 'Not approved', title: 'Not approved',
      text: `Reviewed ${formatLongDate(reviewedAt)}. The obstacle stays as registered in NRL.`,
      canWithdraw: false, comment: report.reviewerComment?.trim() || null,
      steps: [created, sent, done('Reviewed', reviewedAt), done('Not approved', reviewedAt)],
    };
    case 'withdrawn': return {
      key, tone: 'neutral', chipLabel: 'Withdrawn', title: 'Withdrawn',
      text: `You withdrew this report ${formatLongDate(report.withdrawnAt ?? report.updatedAt)}. It will not be reviewed.`,
      canWithdraw: false, comment: null,
      steps: [created, sent, done('Withdrawn', report.withdrawnAt ?? report.updatedAt)],
    };
  }
}

/** A row of the reported table: what the pilot reported for one field. */
export interface ReportedField {
  field: string;
  reported: string;
  /** Small grey text under the reported value, e.g. how far a position moved. */
  note?: string;
}

/** An error report's row: the reported value beside the one in NRL today. */
export interface ReportedChange extends ReportedField {
  current: string;
  /** The registered value no longer holds: struck through. */
  struck?: boolean;
}

/**
 * A new obstacle's rows, for the same table without "In NRL today": Type, Height, Lighting and
 * Position, only those the pilot filled in. Unknown lighting is an answer, so it is shown.
 */
export function reportedObstacleRows(report: Report, placeName: string | null = null): ReportedField[] {
  const rows: ReportedField[] = [{ field: 'Type', reported: obstacleTypeLabel(report.obstacleType) }];
  if (report.heightMeters > 0) rows.push({ field: 'Height', reported: formatHeightFromMeters(report.heightMeters), note: 'Above ground, at the highest point' });
  if (report.lighting) rows.push({ field: 'Lighting', reported: lightingValueLabel(report.lighting) });
  const coordinates = coordinateLabel(report.geometry);
  if (coordinates) rows.push({ field: 'Position', reported: coordinates, ...(placeName ? { note: `Near ${placeName}` } : {}) });
  return rows;
}

/**
 * One row per field the pilot marked as wrong, in the edit page's order: Type, Height, Lighting, Position. "Does not exist" is
 * the only row when reported. Fields that were not reported get no row.
 */
export function reportedChanges({ obstacle, answers }: ErrorReportRecord): ReportedChange[] {
  const kinds = answers.errorKinds;
  if (kinds.includes('does-not-exist')) {
    return [{ field: 'Obstacle', current: `${obstacle.type} · ${obstacle.heightM} m · ID ${obstacle.id}`, reported: 'Does not exist', struck: true }];
  }
  const rows: ReportedChange[] = [];
  if (kinds.includes('wrong-type') && answers.actualType) {
    rows.push({ field: 'Type', current: obstacle.type, reported: obstacleTypeLabel(answers.actualType) });
  }
  if (kinds.includes('wrong-height') && isValidHeight(answers.actualHeightM)) {
    rows.push({ field: 'Height', current: `${obstacle.heightM} m`, reported: `${answers.actualHeightM} m` });
  }
  if (kinds.includes('wrong-lighting')) {
    rows.push({ field: 'Lighting', current: obstacle.lit ? 'Lit' : 'Not lit', reported: lightingWord(reportedLighting(obstacle, answers)) });
  }
  if (kinds.includes('wrong-position')) {
    const moved = answers.correctedPosition;
    rows.push(moved
      ? { field: 'Position', current: formatCoordinates(obstacle), reported: formatCoordinates(moved), note: describeOffsetFromRegistered(obstacle, moved) }
      : { field: 'Position', current: formatCoordinates(obstacle), reported: 'Position not specified' });
  }
  return rows;
}

/** "Reported change", or "Reported changes · 3". */
export function reportedChangesHeading(count: number): string {
  return count === 1 ? 'Reported change' : `Reported changes · ${count}`;
}
