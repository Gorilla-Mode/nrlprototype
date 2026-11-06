import type { CompleteReport, DetailsPayload, Illumination } from '../reporting/createDetailsController.js';
import { ObstacleType } from '../reporting/obstacle.js';
import { formatHeightFromMeters, type Draft, type Lighting } from '../drafts/types.js';
import type { ReportPhoto } from './photos.js';
import type { Report } from './reportsData.js';

const reporter = { reportedByName: 'Paul Atreides', reportedByOrg: 'Politihelikoptertjenesten' } as const;
const stepLabels = ['Obstacle details', 'Additional information'] as const;

const lightingByIllumination: Record<Illumination, Lighting> = { illuminated: 'yes', 'not-illuminated': 'no', unknown: 'unknown' };

export interface DetailsRecordContext {
  /** Step shown when the draft was saved, and how many steps this form has. */
  step: number;
  totalSteps: number;
  photos: ReportPhoto[];
  /** The stored draft or report with this id, whose optional name and creation time are kept. */
  existing?: { name: string; createdAt: string };
}

export function detailsToDraft(payload: DetailsPayload, context: DetailsRecordContext): Draft {
  const value = formatHeightFromMeters(payload.height);
  const createdAt = context.existing?.createdAt ?? payload.timestamp.toISOString();
  return {
    id: payload.id, title: context.existing?.name ?? '',
    category: payload.type ?? ObstacleType.Other, value,
    currentStep: context.step, totalSteps: context.totalSteps, stepLabel: stepLabels[Math.min(context.step, stepLabels.length) - 1],
    createdAt, updatedAt: createdAt,
    heightAboveGround: value, lighting: lightingByIllumination[payload.illumination],
    pilotReportText: payload.description, ...reporter,
    geometry: payload.obstacle_position, photos: context.photos,
  };
}

export function detailsToReport(payload: CompleteReport, context: Omit<DetailsRecordContext, 'step' | 'totalSteps'>): Report {
  const meters = payload.height;
  const createdAt = context.existing?.createdAt ?? payload.timestamp.toISOString();
  return {
    id: payload.id, name: context.existing?.name ?? '', obstacleType: payload.type,
    heightFeet: Math.round(meters * 3.28084), heightMeters: meters,
    status: 'ready', createdAt, updatedAt: createdAt,
    lighting: lightingByIllumination[payload.illumination],
    pilotReportText: payload.description, ...reporter,
    geometry: payload.obstacle_position, photos: context.photos,
  };
}
