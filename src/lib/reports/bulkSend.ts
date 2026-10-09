import type { Report } from './reportsData.js';

/** Delivers one report to Kartverket; rejects with an Error whose message is the reason. */
export type ReportSender = (report: Report) => Promise<void>;

/** The prototype has no submission endpoint, so delivery always succeeds, as before. */
export const sendToKartverket: ReportSender = async () => {};

export interface FailedReport {
  report: Report;
  /** Short, user-facing reason shown beside the report. */
  reason: string;
}

export interface BulkSendResult {
  sent: Report[];
  failed: FailedReport[];
}

const fallbackReason = 'Could not be sent. Try again.';

/** Sends every report independently, so one failure never blocks the others. Order is kept. */
export async function sendReports(reports: readonly Report[], send: ReportSender): Promise<BulkSendResult> {
  const outcomes = await Promise.allSettled(reports.map((report) => send(report)));
  const result: BulkSendResult = { sent: [], failed: [] };
  outcomes.forEach((outcome, index) => {
    const report = reports[index];
    if (outcome.status === 'fulfilled') result.sent.push(report);
    else result.failed.push({ report, reason: outcome.reason instanceof Error && outcome.reason.message ? outcome.reason.message : fallbackReason });
  });
  return result;
}

/** A retry adds its successes to the earlier ones; only its failures remain failed. */
export function mergeRetry(previous: BulkSendResult, retry: BulkSendResult): BulkSendResult {
  return { sent: [...previous.sent, ...retry.sent], failed: retry.failed };
}

/** Marks a delivered report as awaiting review, sent today (dd.mm.yyyy). */
export function markSent(report: Report, today: string): void {
  report.status = 'pending';
  report.secondaryDate = today;
}

/** "1 report" or "n reports". */
export function reportCount(count: number): string {
  return `${count} ${count === 1 ? 'report' : 'reports'}`;
}

/** Receipt title: everything sent, or how many of the attempted reports got through. */
export function bulkSendTitle(result: BulkSendResult): string {
  const total = result.sent.length + result.failed.length;
  return result.failed.length === 0 ? `${reportCount(total)} sent for review` : `${result.sent.length} of ${reportCount(total)} sent`;
}

/** Polite live announcement once a send attempt finishes. */
export function bulkSendAnnouncement(result: BulkSendResult): string {
  return result.failed.length === 0 ? `${reportCount(result.sent.length)} sent` : `${bulkSendTitle(result)}. ${reportCount(result.failed.length)} failed`;
}
