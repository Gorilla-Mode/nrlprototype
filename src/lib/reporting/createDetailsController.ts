import { ObstacleType, type Obstacle } from './obstacle.js';

export const detailsRoute = '#/Report/details';
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
}
type ActiveDetails =
  | { notPresent: true; height?: never; illumination?: never }
  | { notPresent: false; height: number; illumination: Illumination };
export type DetailsPayload = Omit<Obstacle, 'type' | 'height'> & {
  type: ObstacleType | null;
} & ActiveDetails;
export type ContinueDetailsPayload = DetailsPayload & { type: ObstacleType };
export type DraftSaveReason = 'explicit' | 'dismissal';
export interface DetailsHooks {
  onSaveDraft?: (payload: DetailsPayload, reason: DraftSaveReason) => void | Promise<void>;
  onContinue?: (payload: ContinueDetailsPayload) => void | Promise<void>;
}
export interface DetailsState {
  draft: DetailsDraft | null;
  open: boolean;
  busy: boolean;
  error: string;
}
export const initialDetailsState: DetailsState = { draft: null, open: false, busy: false, error: '' };

export function detailsPayload(draft: DetailsDraft): DetailsPayload {
  const { type: _type, height: _height, ...report } = draft.report;
  return {
    ...report, type: draft.type,
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
  function publish(next: Partial<DetailsState>) {
    state = { ...state, ...next };
    onChange(state);
  }
  function edit(values: Partial<Pick<DetailsDraft, 'type' | 'height' | 'illumination' | 'notPresent'>>) {
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
    } catch {
      if (current === generation) publish({ error: 'The action could not be completed. Your details remain in this session; reopen them to retry.' });
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
      publish({ draft: { report, type: null, height: 30, illumination: 'unknown', notPresent: false, dirty: false }, open: true, busy: false, error: '' });
    },
    resume() { if (state.draft) publish({ open: true }); },
    dismiss() {
      if (!state.open) return Promise.resolve();
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
    save: () => save('explicit'),
    continue() {
      const hook = getHooks().onContinue;
      if (!state.draft?.type || state.busy || !hook) return Promise.resolve();
      const payload = { ...detailsPayload(state.draft), type: state.draft.type };
      return run(() => hook(payload), false);
    },
  };
}
