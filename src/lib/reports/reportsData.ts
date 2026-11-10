import { obstacleTypeLabel, type ObstacleType } from '../reporting/obstacle.js';
import type { ReportGeometry } from './reportGeometry.js';
import type { Lighting } from '../drafts/types.js';
import type { ReportPhoto } from './photos.js';
import { errorReportHeading, type ErrorReportRecord } from '../obstacles/errorReport.js';
import type { StoredPlace } from './placeName.js';

export type ReportStatus = 'ready' | 'pending' | 'approved' | 'declined' | 'withdrawn';

export interface Report {
  readonly id: string;
  /** Optional obstacle name; empty when none was given. */
  name: string;
  obstacleType: ObstacleType;
  heightFeet: number;
  heightMeters: number;
  status: ReportStatus;
  /** ISO 8601 timestamps. sentAt is set once the report leaves Ready. */
  createdAt: string;
  updatedAt: string;
  sentAt?: string;
  /** Reviewer name shown for approved/declined. */
  reviewer?: string;
  /** When the reviewer approved or declined it; ISO 8601. */
  reviewedAt?: string;
  /** The reviewer's optional comment on a declined report. */
  reviewerComment?: string;
  /** When the pilot withdrew it while under review; ISO 8601. */
  withdrawnAt?: string;
  /** Whether the obstacle is lit; null when the pilot did not answer. */
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
  /** Place name looked up for the location; absent until looked up. */
  place?: StoredPlace;
}

/** Card heading, as the name is optional: "Aerial Span · 30 m", or just the type when no height is set. */
export function obstacleHeading(type: ObstacleType, meters: number | null): string {
  const label = obstacleTypeLabel(type);
  // A no-break space keeps the number and unit together when the heading wraps.
  return meters === null || meters <= 0 ? label : `${label} · ${meters}\u00a0m`;
}

export function reportHeading(report: Report): string {
  if (report.errorReport) return errorReportHeading(report.errorReport);
  return obstacleHeading(report.obstacleType, report.heightMeters);
}

/** Detail page title for a new obstacle: "New obstacle · Bridge · 7 m", beside "Error report · …". */
export function newObstacleTitle(type: ObstacleType, meters: number | null): string {
  return `New obstacle · ${obstacleHeading(type, meters)}`;
}

/** Detail page title; the list and its cards keep reportHeading. */
export function reportPageTitle(report: Report): string {
  if (report.errorReport) return errorReportHeading(report.errorReport);
  return newObstacleTitle(report.obstacleType, report.heightMeters);
}

/** Second line of a report card, per status: edited/sent date, or the reviewer name. */
export function reportSecondaryLine(report: Report): string {
  switch (report.status) {
    case 'ready': return `Edited ${formatShortDate(report.updatedAt)}`;
    case 'pending': return `Sent ${formatShortDate(report.sentAt)}`;
    case 'approved':
    case 'declined': return `Reviewer ${report.reviewer}`;
    case 'withdrawn': return `Withdrawn ${formatShortDate(report.withdrawnAt)}`;
  }
}

function parseTimestamp(timestamp: string | undefined): Date | undefined {
  if (!timestamp) return undefined;
  const date = new Date(timestamp);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

/** dd.mm.yyyy in local time for an ISO timestamp; the value itself if unreadable. */
export function formatShortDate(timestamp: string | undefined): string {
  const date = parseTimestamp(timestamp);
  if (!date) return timestamp ?? '';
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  return `${day}.${month}.${date.getFullYear()}`;
}

const relativeTime = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });

/** "today", "yesterday", "3 days ago", "2 months ago" or "2 years ago" for an ISO timestamp, by calendar day; the value itself if unreadable. */
export function relativeDate(timestamp: string, now: Date = new Date()): string {
  const date = parseTimestamp(timestamp);
  if (!date) return timestamp;
  const days = Math.round((Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()) - Date.UTC(date.getFullYear(), date.getMonth(), date.getDate())) / 86_400_000);
  if (days < 0) return formatShortDate(timestamp);
  if (days < 7) return relativeTime.format(-days, 'day');
  if (days < 30) return relativeTime.format(-Math.round(days / 7), 'week');
  if (days < 365) return relativeTime.format(-Math.round(days / 30), 'month');
  return relativeTime.format(-Math.round(days / 365), 'year');
}

const timeFormat = new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit' });

/** "today 18:10" when edited today, otherwise "07.11.2026": the report pages' "Last edited". */
export function lastEditedLabel(timestamp: string, now: Date = new Date()): string {
  const date = parseTimestamp(timestamp);
  if (!date) return timestamp;
  const today = date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth() && date.getDate() === now.getDate();
  return today ? `today ${timeFormat.format(date)}` : formatShortDate(timestamp);
}

/** "Edited today 13:16" when edited today, otherwise "Edited 07.11.2026". */
export function editedText(timestamp: string, now: Date = new Date()): string {
  const date = parseTimestamp(timestamp);
  if (!date) return `Edited ${timestamp}`;
  const today = date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth() && date.getDate() === now.getDate();
  return today ? `Edited today ${timeFormat.format(date)}` : `Edited ${formatShortDate(timestamp)}`;
}

/** The one activity line a report card shows: when it was last edited or sent, or who reviewed it. */
export function reportActivity(report: Report, now: Date = new Date()): { text: string; date?: string } {
  switch (report.status) {
    case 'ready': return { text: editedText(report.updatedAt, now), date: report.updatedAt };
    case 'pending': return { text: `Sent ${relativeDate(report.sentAt ?? '', now)}`, date: report.sentAt };
    case 'approved':
    case 'declined':
    case 'withdrawn': return { text: reportSecondaryLine(report) };
  }
}

/** "9 Oct 2026, 14:32" for the moment a report was sent. */
export function formatSentAt(date: Date): string {
  return new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }).format(date);
}

/** "14 October 2024" for an ISO timestamp; the value itself if unreadable. */
export function formatLongDate(timestamp: string | undefined): string {
  const date = parseTimestamp(timestamp);
  if (!date) return timestamp ?? '';
  return new Intl.DateTimeFormat('en-GB', { dateStyle: 'long' }).format(date);
}

/** Third card line, matching a draft's "Step X of 2" line, so every card has the same rows. */
export function reportProgressLine(report: Report): string {
  switch (report.status) {
    case 'ready': return 'All steps complete';
    case 'pending': return 'Awaiting review by Kartverket';
    case 'approved': return 'Added to the register';
    case 'declined': return 'Not added to the register';
    case 'withdrawn': return 'Will not be reviewed';
  }
}

/** Card call-to-action label: ready reports still need review, everything else just opens. */
export function reportActionLabel(report: Report): string {
  return report.status === 'ready' ? 'Review and send' : 'Open';
}

export const statusTabs = [
  { key: 'all', label: 'All' },
  { key: 'draft', label: 'Drafts' },
  { key: 'ready', label: 'Ready to send' },
  { key: 'sent', label: 'Sent' },
] as const;

export type StatusTabKey = typeof statusTabs[number]['key'];

/** Everything already sent to Kartverket: awaiting review, reviewed or withdrawn. */
export function isSent(report: Report): boolean {
  return report.status !== 'ready';
}

/** Counts reports for a tab from the data; drafts are counted separately by the page. */
export function countForStatusTab(reports: readonly Report[], key: StatusTabKey): number {
  if (key === 'all') return reports.length;
  if (key === 'draft') return 0;
  if (key === 'sent') return reports.filter(isSent).length;
  return reports.filter((report) => report.status === key).length;
}
