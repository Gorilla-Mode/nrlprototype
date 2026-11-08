import { buildErrorReport, isValidHeight, type ErrorReportRecord } from '../obstacles/errorReport.js';
import { ObstacleType } from '../reporting/obstacle.js';
import { formatHeightFromMeters, type Draft, type Lighting } from '../drafts/types.js';
import { reporter } from './detailsReport.js';
import type { Report } from './reportsData.js';
import type { ReportGeometry } from './reportGeometry.js';

/** The stored draft or report with this id, whose optional name and creation time are kept. */
export interface ErrorRecordContext {
  existing?: { name: string; createdAt: string };
  now?: Date;
}

/** Shared report fields describe the obstacle as reported: corrected where the pilot says it is wrong. */
function reportedFields({ obstacle, answers }: ErrorReportRecord) {
  const meters = answers.errorKinds.includes('wrong-height') && isValidHeight(answers.actualHeightM) ? answers.actualHeightM : obstacle.heightM;
  const lit = answers.errorKinds.includes('wrong-lighting') ? !obstacle.lit : obstacle.lit;
  const lighting: Lighting = lit ? 'yes' : 'no';
  const position = answers.errorKinds.includes('wrong-position') && answers.correctedPosition ? answers.correctedPosition : obstacle;
  const geometry: ReportGeometry = { type: 'Point', coordinates: [position.lng, position.lat] };
  return { meters, lighting, geometry };
}

/** Save draft: stored with the other drafts, one step, reopened in the error form. */
export function errorReportToDraft(id: string, record: ErrorReportRecord, { existing, now = new Date() }: ErrorRecordContext = {}): Draft {
  const { meters, lighting, geometry } = reportedFields(record);
  const value = formatHeightFromMeters(meters);
  const createdAt = existing?.createdAt ?? now.toISOString();
  return {
    id, title: existing?.name ?? '', category: ObstacleType.Other, value,
    currentStep: 1, totalSteps: 1, stepLabel: 'Error details',
    createdAt, updatedAt: createdAt,
    heightAboveGround: value, lighting, pilotReportText: record.answers.description.trim(), ...reporter,
    geometry, photos: [], errorReport: record,
  };
}

/** Finish report: a Ready report, like a finished new-obstacle report. */
export function errorReportToReport(id: string, record: ErrorReportRecord, { existing, now = new Date() }: ErrorRecordContext = {}): Report {
  const { meters, lighting, geometry } = reportedFields(record);
  const createdAt = existing?.createdAt ?? now.toISOString();
  return {
    id, name: existing?.name ?? '', obstacleType: ObstacleType.Other,
    heightFeet: Math.round(meters * 3.28084), heightMeters: meters,
    status: 'ready', createdAt, updatedAt: createdAt,
    lighting, pilotReportText: record.answers.description.trim(), ...reporter,
    geometry, photos: [], errorReport: record,
  };
}

/**
 * Sends an error report once it is Sent: the same payload as before, built by buildErrorReport.
 * No backend yet: the console is the only consumer. New-obstacle reports send nothing here.
 */
export function deliverErrorReport(report: Report): void {
  if (!report.errorReport) return;
  console.log('Error report:', buildErrorReport(report.errorReport.obstacle, report.errorReport.answers, new Date(report.sentAt ?? report.updatedAt)));
}
