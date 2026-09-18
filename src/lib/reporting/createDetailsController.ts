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
  readonly height: number;
  readonly illumination: Illumination;
  readonly notPresent: boolean;
  readonly dirty: boolean;
  readonly customType: string;
  readonly description: string;
  readonly photos: readonly File[];
}
type ActiveDetails =
  | { notPresent: true; height?: never; illumination?: never }
  | { notPresent: false; height: number; illumination: Illumination };
export type DetailsPayload = Omit<Obstacle, 'type' | 'height'> & {
  type: ObstacleType | null;
  customType?: string;
  photos: readonly File[];
} & ActiveDetails;
export type ContinueDetailsPayload = DetailsPayload & { type: ObstacleType };
export type CompleteReport = ContinueDetailsPayload;
export type DraftSaveReason = 'explicit' | 'dismissal';
export interface ReportingContext { readonly variantId: string }
export interface ReportingResult extends ReportingContext { readonly report: CompleteReport }
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
}
export const initialDetailsState: DetailsState = {
  draft: null, open: false, busy: false, error: '', step: 1, variant: null, result: null, summaryOpen: false,
};

export function detailsPayload(draft: DetailsDraft): DetailsPayload {
  const { type: _type, height: _height, ...report } = draft.report;
  return {
    ...report, type: draft.type,
    description: draft.description, photos: [...draft.photos],
    ...(draft.type === ObstacleType.Other ? { customType: draft.customType } : {}),
    ...(draft.notPresent
      ? { notPresent: true }
      : { notPresent: false, height: draft.height, illumination: draft.illumination }),
  };
}

/** Session-only metadata. Geometry assembly and reporter GPS remain in createReportController. */
export function createDetailsController({ onChange, getHooks = () => ({}) }: {
  onChange: (state: DetailsState) => void;
  getHooks?: () => DetailsHooks;
}) {
  let state = initialDetailsState;
  let generation = 0;
  let navigation = 0;
  function publish(next: Partial<DetailsState>) {
    state = { ...state, ...next };
    onChange(state);
  }
  function edit(values: Partial<Pick<DetailsDraft, 'type' | 'height' | 'illumination' | 'notPresent' | 'customType' | 'description' | 'photos'>>) {
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
      publish({ ...initialDetailsState, variant });
    },
    begin(report: Obstacle, variant: ReportingVariant) {
      generation++;
      navigation++;
      publish({ ...initialDetailsState, variant, draft: { report, type: null, height: defaultObstacleHeightMeters, illumination: 'unknown', notPresent: false, dirty: false, customType: '', description: report.description, photos: [] }, open: true });
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
      navigation++;
      publish({ open: false });
      return save('dismissal');
    },
    clear() { generation++; navigation++; publish(initialDetailsState); },
    closeSummary() { publish({ result: null, summaryOpen: false }); },
    setType(type: ObstacleType) { if (obstacleTypeChoices.some((choice) => choice.type === type)) edit({ type }); },
    setHeight(height: number) {
      if (state.draft?.notPresent || !Number.isFinite(height)) return;
      edit({ height: Math.max(minObstacleHeightMeters, Math.min(maxObstacleHeightMeters, Math.round(height))) });
    },
    cycleIllumination() {
      if (!state.draft || state.draft.notPresent) return;
      const next: Record<Illumination, Illumination> = { unknown: 'illuminated', illuminated: 'not-illuminated', 'not-illuminated': 'unknown' };
      edit({ illumination: next[state.draft.illumination] });
    },
    setNotPresent(notPresent: boolean) { edit({ notPresent }); },
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
      publish({ open: false });
      return true;
    },
    async continue() {
      const hook = getHooks().onContinue;
      if (!state.draft?.type || !state.variant || state.busy || !state.open || state.step >= state.variant.stepRoutes.length) return false;
      const payload = { ...detailsPayload(state.draft), type: state.draft.type };
      const currentNavigation = navigation;
      const succeeded = !hook || await run(() => hook(payload), false);
      if (!succeeded || currentNavigation !== navigation) return false;
      publish({ step: state.step + 1, error: '' });
      return true;
    },
    async finish() {
      const hook = getHooks().onFinish;
      if (!state.draft?.type || !state.variant || state.busy || !hook || !state.open || state.step !== state.variant.stepRoutes.length) return false;
      const payload = { ...detailsPayload(state.draft), type: state.draft.type };
      const variantId = state.variant.id;
      const currentNavigation = navigation;
      if (!await run(() => hook(payload, { variantId }), false)) return false;
      const showSummary = currentNavigation === navigation && state.open;
      generation++;
      publish({ ...initialDetailsState, result: showSummary ? { report: payload, variantId } : null, summaryOpen: showSummary });
      return true;
    },
  };
}
