import { ObstacleType, type Obstacle } from './obstacle.js';

export const detailsRoute = '#/Report/details';
export const additionalInformationRoute = '#/Report/additional-information';
export const maxPhotos = 3;
export type DetailsStep = 1 | 2;
export function detailsStepFromHash(hash: string): DetailsStep | null {
  return hash === detailsRoute ? 1 : hash === additionalInformationRoute ? 2 : null;
}
export const obstacleTypeChoices = [
  { value: ObstacleType.Bridge, label: 'Bridge' },
  { value: ObstacleType.Airspan, label: 'Airspan' },
  { value: ObstacleType.Pole, label: 'Pole' },
  { value: ObstacleType.Building, label: 'Building' },
  { value: ObstacleType.Other, label: 'Other' },
] as const;
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
export interface DetailsHooks {
  onSaveDraft?: (payload: DetailsPayload, reason: DraftSaveReason) => void | Promise<void>;
  onContinue?: (payload: ContinueDetailsPayload) => void | Promise<void>;
  onFinish?: (payload: CompleteReport) => void | Promise<void>;
}
export interface DetailsState {
  draft: DetailsDraft | null;
  open: boolean;
  busy: boolean;
  error: string;
  step: DetailsStep;
}
export const initialDetailsState: DetailsState = { draft: null, open: false, busy: false, error: '', step: 1 };

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
    if (!state.draft || state.busy || !hook || (reason === 'dismissal' && !state.draft.dirty)) return Promise.resolve();
    const payload = detailsPayload(state.draft);
    return run(() => hook(payload, reason), true);
  }
  return {
    getState: () => state,
    begin(report: Obstacle) {
      generation++;
      publish({ draft: { report, type: null, height: 30, illumination: 'unknown', notPresent: false, dirty: false, customType: '', description: report.description, photos: [] }, open: true, busy: false, error: '', step: 1 });
    },
    resume(step: DetailsStep = state.step) {
      if (!state.draft) return;
      const nextStep = state.draft.type ? step : 1;
      if (!state.open || state.step !== nextStep) navigation++;
      publish({ open: true, step: nextStep });
    },
    dismiss() {
      if (!state.open) return Promise.resolve();
      navigation++;
      publish({ open: false });
      return save('dismissal');
    },
    clear() { generation++; publish(initialDetailsState); },
    setType(type: ObstacleType) { if (obstacleTypeChoices.some((choice) => choice.value === type)) edit({ type }); },
    setHeight(height: number) {
      if (state.draft?.notPresent || !Number.isFinite(height)) return;
      edit({ height: Math.max(0, Math.min(500, Math.round(height))) });
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
    async continue() {
      const hook = getHooks().onContinue;
      if (!state.draft?.type || state.busy || !state.open || state.step !== 1) return false;
      const payload = { ...detailsPayload(state.draft), type: state.draft.type };
      const currentNavigation = navigation;
      const succeeded = !hook || await run(() => hook(payload), false);
      if (!succeeded || currentNavigation !== navigation) return false;
      publish({ step: 2, error: '' });
      return true;
    },
    async finish() {
      const hook = getHooks().onFinish;
      if (!state.draft?.type || state.busy || !hook || !state.open || state.step !== 2) return false;
      const payload = { ...detailsPayload(state.draft), type: state.draft.type };
      if (!await run(() => hook(payload), false)) return false;
      generation++;
      publish(initialDetailsState);
      return true;
    },
  };
}
