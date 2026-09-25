import { ObstacleType, type Obstacle } from '../../src/lib/reporting/obstacle.js';
import type { DetailsDraft } from '../../src/lib/reporting/createDetailsController.js';
import { detailsRoute, additionalInformationRoute, type ReportingVariant } from '../../src/lib/reporting/reporting.js';
import type { ReportingVariantProps } from '../../src/lib/reporting/reportingVariantProps.js';

export const oneStep: ReportingVariant = { id: 'one-step', label: 'One step — scrolling', stepRoutes: [detailsRoute] };
export const oneStepKeypad: ReportingVariant = { id: 'one-step-keypad', label: 'One step — keypad', stepRoutes: [detailsRoute] };
export const twoStep: ReportingVariant = { id: 'two-step', label: 'Two steps', stepRoutes: [detailsRoute, additionalInformationRoute] };
export const twoStepKeypad: ReportingVariant = { id: 'two-step-keypad', label: 'Two steps — keypad', stepRoutes: [detailsRoute, additionalInformationRoute] };
export const report: Obstacle = {
  id: 'test-report', type: ObstacleType.Other, description: '', height: 0,
  gps_position: null, timestamp: new Date('2026-09-18T10:00:00Z'),
  obstacle_position: { type: 'Point', coordinates: [5.34, 60.4] },
};

export function draft(overrides: Partial<DetailsDraft> = {}): DetailsDraft {
  return {
    report, type: null, height: 30, illumination: 'unknown', notPresent: false,
    dirty: false, customType: '', description: '', photos: [], ...overrides,
  };
}

const noop = () => {};
export function viewProps(value: DetailsDraft, overrides: Partial<ReportingVariantProps> = {}): ReportingVariantProps {
  return {
    draft: value, open: true, step: 1, totalSteps: 1, busy: false, error: '',
    ontype: noop, onheight: noop, onillumination: noop, onabsence: noop, oncustomtype: noop,
    ondescription: noop, onphotos: noop, onremovephoto: noop, onsave: noop, oncontinue: noop,
    onfinish: noop, onback: noop, ondismiss: noop, ...overrides,
  };
}
