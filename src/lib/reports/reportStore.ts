import type { Draft } from '../drafts/types.js';
import { draftType, formatHeightFromMeters, heightInMeters } from '../drafts/types.js';
import { markSent } from './bulkSend.js';
import type { Report, ReportStatus } from './reportsData.js';
import { placeIsCurrent, type StoredPlace } from './placeName.js';

/** Every draft and report the Reports page lists. Drafts have no status of their own. */
export interface ReportState {
  readonly drafts: readonly Draft[];
  readonly reports: readonly Report[];
}

/** Where the store keeps its state; swap for an API-backed implementation later. */
export interface ReportRepository {
  /** The saved state, or null when nothing has been saved yet. */
  load(): ReportState | null;
  save(state: ReportState): void;
}

const storageKey = 'nrl.reports.v1';

/** Photos are object URLs that do not survive a reload, so they are kept in memory only. */
function withoutPhotos<T extends { photos: readonly unknown[] }>(item: T): T {
  return { ...item, photos: [] };
}

/** Persists to Web Storage. Unreadable or unavailable storage behaves as empty. */
export function webStorageRepository(storage: Storage | undefined, key: string = storageKey): ReportRepository {
  return {
    load() {
      try {
        const raw = storage?.getItem(key);
        if (!raw) return null;
        const parsed: unknown = JSON.parse(raw);
        if (typeof parsed !== 'object' || parsed === null) return null;
        const { drafts, reports } = parsed as Partial<ReportState>;
        return Array.isArray(drafts) && Array.isArray(reports) ? { drafts, reports } : null;
      } catch {
        return null;
      }
    },
    save(state) {
      try {
        storage?.setItem(key, JSON.stringify({ drafts: state.drafts.map(withoutPhotos), reports: state.reports.map(withoutPhotos) }));
      } catch {
        // Quota or privacy mode: the session keeps working from memory.
      }
    },
  };
}

// Ids of the example reports earlier versions seeded into storage, and the
// placeholder name they gave unnamed reports. Both are cleaned up on load.
const exampleIds = new Set([
  'kraftlinje-sor', 'gondolbane-voss', 'mast-fjellet', 'taubane-lofoten', 'antenne-tromso',
  'lysmast-gardermoen', 'kabel-hardanger', 'vindturbin-smola', 'floibanen-bergen', 'kraftlinje-sogn',
  '1', '2', '3',
]);
const placeholderName = 'Uten navn';

/** Stored state without the example reports, placeholder names or the earlier "98 ft (30 m)" height text. */
export function withoutExamples(state: ReportState): ReportState {
  return {
    drafts: state.drafts.filter(({ id }) => !exampleIds.has(id)).map((draft) => {
      const value = formatHeightFromMeters(heightInMeters(draft.heightAboveGround));
      return { ...draft, title: draft.title === placeholderName ? '' : draft.title, value, heightAboveGround: value };
    }),
    reports: state.reports.filter(({ id }) => !exampleIds.has(id))
      .map((report) => (report.name === placeholderName ? { ...report, name: '' } : report)),
  };
}

function browserStorage(): Storage | undefined {
  try {
    return typeof localStorage === 'undefined' ? undefined : localStorage;
  } catch {
    return undefined;
  }
}

/** Ready → Sent for review → Approved, Declined or Withdrawn; statuses never move backwards. */
const nextStatuses: Record<ReportStatus, readonly ReportStatus[]> = {
  ready: ['pending'],
  pending: ['approved', 'declined', 'withdrawn'],
  approved: [],
  declined: [],
  withdrawn: [],
};

/** The date each status records beside updatedAt: reviewed or withdrawn. */
const statusDate: Partial<Record<ReportStatus, 'reviewedAt' | 'withdrawnAt'>> = {
  approved: 'reviewedAt', declined: 'reviewedAt', withdrawn: 'withdrawnAt',
};

/**
 * A completed draft as a Ready report, keeping its id and creation time. Only a draft with a
 * chosen type is complete (missingDraftFields), so the type is never filled in here.
 */
export function draftToReport(draft: Draft): Report {
  const type = draftType(draft);
  if (type === null) throw new Error('A draft needs an obstacle type before it can become a report.');
  const meters = heightInMeters(draft.heightAboveGround) ?? 0;
  return {
    id: draft.id, name: draft.title, obstacleType: type,
    heightFeet: Math.round(meters * 3.28084), heightMeters: meters,
    status: 'ready', createdAt: draft.createdAt, updatedAt: draft.updatedAt,
    lighting: draft.lighting, pilotReportText: draft.pilotReportText,
    reportedByName: draft.reportedByName, reportedByOrg: draft.reportedByOrg,
    geometry: draft.geometry, photos: draft.photos,
    ...(draft.errorReport ? { errorReport: draft.errorReport } : {}),
    ...(draft.place ? { place: draft.place } : {}),
  };
}

/** A Ready report that is no longer complete, back at the step that holds its height. */
export function reportToDraft(report: Report, heightSet: boolean): Draft {
  const value = heightSet ? formatHeightFromMeters(report.heightMeters) : 'Not set';
  return {
    id: report.id, title: report.name, category: report.obstacleType, value,
    currentStep: 1, totalSteps: 2, stepLabel: 'Obstacle details',
    createdAt: report.createdAt, updatedAt: report.updatedAt,
    heightAboveGround: value, lighting: report.lighting, pilotReportText: report.pilotReportText,
    reportedByName: report.reportedByName, reportedByOrg: report.reportedByOrg,
    geometry: report.geometry, photos: report.photos,
    ...(report.errorReport ? { errorReport: report.errorReport } : {}),
    ...(report.place ? { place: report.place } : {}),
  };
}

function sameContent<T extends { updatedAt: string }>(a: T, b: T): boolean {
  return JSON.stringify({ ...a, updatedAt: '' }) === JSON.stringify({ ...b, updatedAt: '' });
}

export function createReportStore(repository: ReportRepository, clock: () => Date = () => new Date()) {
  const stored = repository.load();
  let state: ReportState = stored ? withoutExamples(stored) : { drafts: [], reports: [] };
  if (stored) repository.save(state);
  const listeners = new Set<(state: ReportState) => void>();

  function commit(next: ReportState) {
    state = next;
    repository.save(state);
    for (const listener of listeners) listener(state);
  }

  const findReport = (id: string) => state.reports.find((report) => report.id === id);
  const withoutId = <T extends { id: string }>(items: readonly T[], id: string) => items.filter((item) => item.id !== id);
  const upsert = <T extends { id: string }>(items: readonly T[], item: T) =>
    items.some(({ id }) => id === item.id) ? items.map((existing) => (existing.id === item.id ? item : existing)) : [item, ...items];

  /** A saved item without a place keeps the one already stored for the same point, so it is not looked up again. */
  function keepPlace<T extends Draft | Report>(item: T): T {
    if (item.place) return item;
    const stored = state.drafts.find(({ id }) => id === item.id)?.place ?? findReport(item.id)?.place;
    return stored && placeIsCurrent(stored, item.geometry) ? { ...item, place: stored } : item;
  }

  function setStatus(id: string, status: ReportStatus): Report | undefined {
    const report = findReport(id);
    if (!report || !nextStatuses[report.status].includes(status)) return undefined;
    const now = clock();
    const dateKey = statusDate[status];
    const next = status === 'pending' ? markSent(report, now)
      : { ...report, status, updatedAt: now.toISOString(), ...(dateKey ? { [dateKey]: now.toISOString() } : {}) };
    commit({ ...state, reports: upsert(state.reports, next) });
    return next;
  }

  return {
    /** Svelte store contract: called now and after every change; returns the unsubscribe. */
    subscribe(listener: (state: ReportState) => void): () => void {
      listeners.add(listener);
      listener(state);
      return () => { listeners.delete(listener); };
    },
    getState: (): ReportState => state,
    getReports: (): readonly Report[] => state.reports,
    getDrafts: (): readonly Draft[] => state.drafts,

    /**
     * Creates or updates a draft by id. A Ready report with the same id moves back to Drafts;
     * a report already sent is never turned back into a draft.
     */
    saveDraft(draft: Draft): Draft | undefined {
      const existing = findReport(draft.id);
      if (existing && existing.status !== 'ready') return undefined;
      const saved = keepPlace({ ...draft, updatedAt: clock().toISOString() });
      commit({ drafts: upsert(state.drafts, saved), reports: withoutId(state.reports, draft.id) });
      return saved;
    },

    /** All steps complete: creates or updates the Ready report and removes its draft. */
    markReady(report: Report): Report | undefined {
      const existing = findReport(report.id);
      if (existing && existing.status !== 'ready') return undefined;
      const saved: Report = keepPlace({ ...report, status: 'ready', updatedAt: clock().toISOString() });
      commit({ drafts: withoutId(state.drafts, report.id), reports: upsert(state.reports, saved) });
      return saved;
    },

    /** Saves edits to a stored report, keeping its status. Unchanged reports keep their edit time. */
    updateReport(report: Report): Report | undefined {
      const existing = findReport(report.id);
      if (!existing) return undefined;
      const next = keepPlace({ ...report, status: existing.status });
      if (sameContent(existing, next)) return existing;
      const saved = { ...next, updatedAt: clock().toISOString() };
      commit({ ...state, reports: upsert(state.reports, saved) });
      return saved;
    },

    /**
     * Stores a looked-up place on a draft or report, only while it still matches the location.
     * Not an edit, so the edit time and the list order stay as they are.
     */
    setPlace(id: string, place: StoredPlace): void {
      const draft = state.drafts.find((item) => item.id === id);
      const report = draft ? undefined : findReport(id);
      const item = draft ?? report;
      if (!item || !placeIsCurrent(place, item.geometry)) return;
      if (draft) commit({ ...state, drafts: upsert(state.drafts, { ...draft, place }) });
      else if (report) commit({ ...state, reports: upsert(state.reports, { ...report, place }) });
    },

    /** Sends a Ready report for review. */
    submitReport: (id: string): Report | undefined => setStatus(id, 'pending'),

    /** Withdraws a report under review; it will not be reviewed. */
    withdrawReport: (id: string): Report | undefined => setStatus(id, 'withdrawn'),

    /** Moves a report forward one status; any other change is ignored. */
    updateStatus: setStatus,
  };
}

export type ReportStore = ReturnType<typeof createReportStore>;

export const reportStore = createReportStore(webStorageRepository(browserStorage()));
