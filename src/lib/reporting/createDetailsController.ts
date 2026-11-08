import { ObstacleType, obstacleTypeChoices, type Obstacle } from './obstacle.js';
import { defaultObstacleHeightMeters, minObstacleHeightMeters, maxObstacleHeightMeters, type ReportingVariant } from './reporting.js';

export const maxPhotos = 3;
export type Illumination = 'unknown' | 'illuminated' | 'not-illuminated';
export const illuminationLabels: Record<Illumination, string> = {
  unknown: 'Unknown', illuminated: 'Illuminated', 'not-illuminated': 'Not illuminated',
};
export interface DetailsDraft {
  readonly report: Obstacle;
  readonly type: ObstacleType | null;
  /** Null until a height is entered, for flows that start without one. */
  readonly height: number | null;
  readonly illumination: Illumination;
  readonly dirty: boolean;
  readonly customType: string;
  readonly description: string;
  readonly photos: readonly File[];
}
type PayloadBase = Omit<Obstacle, 'type' | 'height'> & { illumination: Illumination; customType?: string; photos: readonly File[] };
export type DetailsPayload = PayloadBase & { type: ObstacleType | null; height: number | null };
/** Every required field is set: a type and a height. */
export type ContinueDetailsPayload = PayloadBase & { type: ObstacleType; height: number };
export type CompleteReport = ContinueDetailsPayload;
export type DraftSaveReason = 'explicit' | 'dismissal';
export interface ReportingContext { readonly variantId: string }
export interface ReportingResult extends ReportingContext {
  readonly report: CompleteReport;
  /** The finished draft and its flow, so the summary can reopen a step to edit it. */
  readonly draft: DetailsDraft;
  readonly variant: ReportingVariant;
}
export interface DetailsHooks {
  onSaveDraft?: (payload: DetailsPayload, reason: DraftSaveReason) => void | Promise<void>;
  onContinue?: (payload: ContinueDetailsPayload) => void | Promise<void>;
  onFinish?: (payload: CompleteReport, context: ReportingContext) => void | Promise<void>;
}
export interface DetailsState {
  draft: DetailsDraft | null;
  open: boolean;
  busy: boolean;
  error: string;
  step: number;
  variant: ReportingVariant | null;
  result: ReportingResult | null;
  summaryOpen: boolean;
  /** The summary being edited; closing the form returns to it without saving. */
  editing: ReportingResult | null;
}
export const initialDetailsState: DetailsState = {
  draft: null, open: false, busy: false, error: '', step: 1, variant: null, result: null, summaryOpen: false, editing: null,
};

export function detailsPayload(draft: DetailsDraft): DetailsPayload {
  const { type: _type, height: _height, ...report } = draft.report;
  return {
    ...report, type: draft.type, height: draft.height, illumination: draft.illumination,
    description: draft.description, photos: [...draft.photos],
    ...(draft.type === ObstacleType.Other ? { customType: draft.customType } : {}),
  };
}

/** Required fields still unset, in form order; empty exactly when the report can be finished (Ready to send). */
export function missingDetailsFields(draft: Pick<DetailsDraft, 'type' | 'height'>): ('obstacle type' | 'height')[] {
  return [...(draft.type ? [] : ['obstacle type' as const]), ...(draft.height === null ? ['height' as const] : [])];
}

/** The payload when every required field is set; otherwise null. */
export function completePayload(draft: DetailsDraft): ContinueDetailsPayload | null {
  if (missingDetailsFields(draft).length) return null;
  const payload = detailsPayload(draft);
  const { type, height } = payload;
  return type && height !== null ? { ...payload, type, height } : null;
}

export function detailsComplete(draft: DetailsDraft): boolean {
  return completePayload(draft) !== null;
}

/** Session-only metadata. Geometry assembly and reporter GPS remain in createReportController. */
export function createDetailsController({ onChange, getHooks = () => ({}) }: {
  onChange: (state: DetailsState) => void;
  getHooks?: () => DetailsHooks;
}) {
  let state = initialDetailsState;
  let generation = 0;
  let navigation = 0;
  let pendingPosition: Promise<void> | undefined;
  function publish(next: Partial<DetailsState>) {
    state = { ...state, ...next };
    onChange(state);
  }
  function edit(values: Partial<Pick<DetailsDraft, 'type' | 'height' | 'illumination' | 'customType' | 'description' | 'photos'>>) {
    if (!state.draft || state.busy) return;
    if (Object.entries(values).every(([key, value]) => state.draft?.[key as keyof DetailsDraft] === value)) return;
    publish({ draft: { ...state.draft, ...values, dirty: true }, error: '' });
  }
  async function run(action: () => void | Promise<void>, saved: boolean) {
    const current = generation;
    publish({ busy: true, error: '' });
    try {
      await action();
      if (current === generation && saved && state.draft) publish({ draft: { ...state.draft, dirty: false } });
      return current === generation;
    } catch {
      if (current === generation) publish({ error: 'The action could not be completed. Your details remain in this session. Please retry.' });
      return false;
    } finally {
      if (current === generation) publish({ busy: false });
    }
  }
  function save(reason: DraftSaveReason) {
    const hook = getHooks().onSaveDraft;
    if (!state.draft || state.busy || !hook || (reason === 'dismissal' && !state.draft.dirty)) return Promise.resolve(false);
    const payload = detailsPayload(state.draft);
    return run(() => hook(payload, reason), true);
  }
  return {
    getState: () => state,
    start(variant: ReportingVariant) {
      generation++;
      navigation++;
      pendingPosition = undefined;
      publish({ ...initialDetailsState, variant });
    },
    begin(report: Obstacle, variant: ReportingVariant, positionReady?: Promise<Obstacle['gps_position']>) {
      generation++;
      navigation++;
      const current = generation;
      const applyPosition = (position: Obstacle['gps_position']) => {
        if (current !== generation || state.draft?.report.id !== report.id) return;
        pendingPosition = undefined;
        publish({ draft: { ...state.draft, report: { ...state.draft.report, gps_position: position } } });
      };
      pendingPosition = positionReady?.then(applyPosition, () => applyPosition(null));
      const height = variant.initialHeightMeters === undefined ? defaultObstacleHeightMeters : variant.initialHeightMeters;
      publish({ ...initialDetailsState, variant, draft: { report, type: null, height, illumination: 'unknown', dirty: false, customType: '', description: report.description, photos: [] }, open: true });
    },
    resume(step: number = state.step) {
      if (!state.draft || !state.variant) return;
      const validStep = Number.isInteger(step) && step >= 1 && step <= state.variant.stepRoutes.length;
      const nextStep = state.draft.type && validStep ? step : 1;
      if (!state.open || state.step !== nextStep) navigation++;
      publish({ open: true, step: nextStep });
    },
    dismiss() {
      if (!state.open) return Promise.resolve();
      if (state.editing) {
        // Leaving an edit from the summary keeps the saved report as it was.
        generation++;
        navigation++;
        publish(initialDetailsState);
        return Promise.resolve();
      }
      navigation++;
      publish({ open: false });
      return save('dismissal');
    },
    clear() { generation++; navigation++; pendingPosition = undefined; publish(initialDetailsState); },
    closeSummary() { publish({ result: null, summaryOpen: false }); },
    /** Reopens the finished report at a step, with its values; finishing again returns to the summary. */
    editResult(step: number) {
      const result = state.result;
      if (!result || !state.summaryOpen) return false;
      const valid = Number.isInteger(step) && step >= 1 && step <= result.variant.stepRoutes.length;
      generation++;
      navigation++;
      pendingPosition = undefined;
      publish({ ...initialDetailsState, variant: result.variant, draft: result.draft, open: true, step: valid ? step : 1, editing: result });
      return true;
    },
    /** Discards an edit started from the summary and shows the summary again. */
    cancelEdit() {
      const result = state.editing;
      if (!result) return false;
      generation++;
      navigation++;
      pendingPosition = undefined;
      publish({ ...initialDetailsState, result, summaryOpen: true });
      return true;
    },
    /** Replaces the finished report's location shown in the summary; the caller stores it. */
    setResultGeometry(geometry: Obstacle['obstacle_position']) {
      const result = state.result;
      if (!result || !state.summaryOpen) return;
      publish({ result: {
        ...result,
        report: { ...result.report, obstacle_position: geometry },
        draft: { ...result.draft, report: { ...result.draft.report, obstacle_position: geometry } },
      } });
    },
    setType(type: ObstacleType) { if (obstacleTypeChoices.some((choice) => choice.type === type)) edit({ type }); },
    setHeight(height: number) {
      if (!Number.isFinite(height)) return;
      edit({ height: Math.max(minObstacleHeightMeters, Math.min(maxObstacleHeightMeters, Math.round(height))) });
    },
    cycleIllumination() {
      if (!state.draft) return;
      const next: Record<Illumination, Illumination> = { unknown: 'illuminated', illuminated: 'not-illuminated', 'not-illuminated': 'unknown' };
      edit({ illumination: next[state.draft.illumination] });
    },
    setCustomType(customType: string) { edit({ customType }); },
    setDescription(description: string) { edit({ description }); },
    addPhotos(files: readonly File[]) {
      if (!state.draft || state.busy || files.length === 0) return;
      const remaining = maxPhotos - state.draft.photos.length;
      if (files.length > remaining) {
        publish({ error: remaining === 0 ? 'You can attach up to 3 photos. Remove one first.' : `Choose up to ${remaining} more photo${remaining === 1 ? '' : 's'}.` });
        return;
      }
      edit({ photos: [...state.draft.photos, ...files] });
    },
    removePhoto(index: number) {
      if (!state.draft || !Number.isInteger(index) || index < 0 || index >= state.draft.photos.length) return;
      edit({ photos: state.draft.photos.filter((_, position) => position !== index) });
    },
    save: () => save('explicit'),
    async saveAndDismiss() {
      const currentNavigation = navigation;
      if (!state.open || !await save('explicit') || currentNavigation !== navigation) return false;
      navigation++;
      publish({ open: false, editing: null });
      return true;
    },
    async continue() {
      const hook = getHooks().onContinue;
      const payload = state.draft && completePayload(state.draft);
      if (!payload || !state.variant || state.busy || !state.open || state.step >= state.variant.stepRoutes.length) return false;
      const currentNavigation = navigation;
      const succeeded = !hook || await run(() => hook(payload), false);
      if (!succeeded || currentNavigation !== navigation) return false;
      publish({ step: state.step + 1, error: '' });
      return true;
    },
    async finish() {
      const hook = getHooks().onFinish;
      if (!state.draft || !completePayload(state.draft) || !state.variant || state.busy || !hook || !state.open || state.step !== state.variant.stepRoutes.length) return false;
      let payload: CompleteReport | undefined;
      let finished: DetailsDraft | undefined;
      const variant = state.variant;
      const variantId = variant.id;
      const currentNavigation = navigation;
      const current = generation;
      const positionReady = pendingPosition;
      if (!await run(async () => {
        // Details can be edited before GPS settles; only Finish waits for it.
        if (positionReady) await positionReady;
        if (current !== generation || currentNavigation !== navigation || !state.open || !state.draft) return;
        const complete = completePayload(state.draft);
        if (!complete) return;
        payload = complete;
        finished = { ...state.draft, dirty: false };
        await hook(payload, { variantId });
      }, false) || !payload || !finished) return false;
      const showSummary = currentNavigation === navigation && state.open;
      generation++;
      pendingPosition = undefined;
      publish({ ...initialDetailsState, result: showSummary ? { report: payload, variantId, variant, draft: finished } : null, summaryOpen: showSummary });
      return true;
    },
  };
}
