import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createReportStore, draftToReport, reportToDraft, webStorageRepository } from '../src/lib/reports/reportStore.js';
import { detailsToDraft, detailsToReport } from '../src/lib/reports/detailsReport.js';
import { obstacleHeading, reportActivity, reportHeading, reportProgressLine, type Report } from '../src/lib/reports/reportsData.js';
import { heightInMeters, type Draft } from '../src/lib/drafts/types.js';
import type { CompleteReport, DetailsPayload } from '../src/lib/reporting/createDetailsController.js';
import { ObstacleType } from '../src/lib/reporting/obstacle.js';
import { drafts as examples, reports as exampleReports } from './helpers/reportFixtures.js';

class MemoryStorage implements Storage {
  private items = new Map<string, string>();
  get length() { return this.items.size; }
  clear() { this.items.clear(); }
  getItem(key: string) { return this.items.get(key) ?? null; }
  key(index: number) { return [...this.items.keys()][index] ?? null; }
  removeItem(key: string) { this.items.delete(key); }
  setItem(key: string, value: string) { this.items.set(key, value); }
}

const storageKey = 'nrl.reports.v1';

/** A store over the given storage whose clock moves on one minute per call. */
function setup(storage: Storage = new MemoryStorage()) {
  let minute = 0;
  const clock = () => new Date(2026, 9, 27, 10, minute++);
  return { storage, store: createReportStore(webStorageRepository(storage), clock) };
}

function newDraft(overrides: Partial<Draft> = {}): Draft {
  return {
    id: 'new-1', title: '', category: ObstacleType.Pole, value: 'Not set',
    currentStep: 1, totalSteps: 2, stepLabel: 'Obstacle details',
    createdAt: new Date(2026, 9, 27, 9, 0).toISOString(), updatedAt: new Date(2026, 9, 27, 9, 0).toISOString(),
    heightAboveGround: 'Not set', lighting: null, pilotReportText: '',
    reportedByName: 'Paul Atreides', reportedByOrg: 'Politihelikoptertjenesten',
    geometry: { type: 'Point', coordinates: [5.33, 60.4] }, photos: [], ...overrides,
  };
}

/** A stored Ready report, made the way the app makes one. */
function readyReport(store: ReturnType<typeof setup>['store'], id = 'ready-1'): Report {
  const draft = store.saveDraft(newDraft({ id, heightAboveGround: '30 m (98 ft)', value: '30 m (98 ft)' }))!;
  return store.markReady(draftToReport(draft))!;
}

test('a new user starts with no reports and nothing is written to storage', () => {
  const { storage, store } = setup();
  assert.deepEqual(store.getState(), { drafts: [], reports: [] });
  assert.equal(storage.getItem(storageKey), null);
});

test('example reports stored by earlier versions are removed; the user\'s own reports are kept', () => {
  const storage = new MemoryStorage();
  const own = newDraft({ id: 'own-1', title: 'Uten navn', heightAboveGround: '98 ft (30 m)', value: '98 ft (30 m)' });
  const ownReport: Report = { ...draftToReport(newDraft({ id: 'own-2', title: 'Mast Bergen' })), status: 'pending' };
  storage.setItem(storageKey, JSON.stringify({ drafts: [...examples, own], reports: [...exampleReports, ownReport] }));
  const { store } = setup(storage);
  assert.deepEqual(store.getDrafts().map(({ id }) => id), ['own-1']);
  assert.deepEqual(store.getReports().map(({ id }) => id), ['own-2']);
  assert.equal(store.getDrafts()[0].title, '', 'the old placeholder name is not a name');
  assert.equal(store.getDrafts()[0].heightAboveGround, '30 m (98 ft)');
  assert.equal(store.getReports()[0].name, 'Mast Bergen');
  // The cleanup is written back, so the examples stay gone.
  const saved = JSON.parse(storage.getItem(storageKey)!);
  assert.equal(saved.drafts.length + saved.reports.length, 2);
});

test('unreadable storage starts empty', () => {
  const storage = new MemoryStorage();
  storage.setItem(storageKey, '{not json');
  assert.equal(setup(storage).store.getReports().length, 0);
});

test('saving a draft twice updates it in place and keeps the step reached', () => {
  const { store } = setup();
  const first = store.saveDraft(newDraft())!;
  store.saveDraft({ ...first, currentStep: 2, stepLabel: 'Additional information' });
  assert.equal(store.getDrafts().length, 1);
  const [saved] = store.getDrafts();
  assert.equal(saved.currentStep, 2);
  assert.equal(saved.stepLabel, 'Additional information');
  assert.ok(Date.parse(saved.updatedAt) > Date.parse(first.updatedAt));
});

test('Draft → Ready → Sent for review, each step leaving one record with the same id', () => {
  const { store } = setup();
  const ready = readyReport(store);
  assert.equal(ready.status, 'ready');
  assert.equal(ready.heightMeters, 30);
  assert.equal(reportProgressLine(ready), 'All steps complete');
  assert.equal(store.getDrafts().length, 0);

  const sent = store.submitReport(ready.id)!;
  assert.equal(sent.status, 'pending');
  assert.equal(sent.sentAt, new Date(2026, 9, 27, 10, 2).toISOString());
  assert.equal(reportProgressLine(sent), 'Awaiting review by Kartverket');
  assert.equal(reportActivity(sent, new Date(2026, 9, 27, 18, 0)).text, 'Sent today');
  assert.equal(store.getReports().length, 1);
});

test('statuses only move forward; a sent report cannot become a draft or Ready again', () => {
  const { store } = setup();
  const sent = store.submitReport(readyReport(store).id)!;
  assert.equal(store.submitReport(sent.id), undefined);
  assert.equal(store.saveDraft(reportToDraft(sent, true)), undefined);
  assert.equal(store.markReady({ ...sent, status: 'ready' }), undefined);
  assert.equal(store.updateStatus(sent.id, 'ready'), undefined);
  assert.equal(store.updateStatus(sent.id, 'approved')?.status, 'approved');
  assert.equal(store.updateStatus(sent.id, 'declined'), undefined);
  assert.equal(store.updateStatus(readyReport(store, 'ready-2').id, 'approved'), undefined);
});

test('a Ready report left incomplete moves back to Drafts at the height step', () => {
  const { store } = setup();
  const ready = readyReport(store);
  store.saveDraft(reportToDraft(ready, false));
  const [draft] = store.getDrafts();
  assert.equal(draft.heightAboveGround, 'Not set');
  assert.equal(`Step ${draft.currentStep} of ${draft.totalSteps} · ${draft.stepLabel}`, 'Step 1 of 2 · Obstacle details');
  assert.equal(store.getReports().length, 0);
});

test('updating a report keeps its status and only changes the edit time when something changed', () => {
  const { store } = setup();
  const ready = readyReport(store);
  assert.equal(store.updateReport({ ...ready })!.updatedAt, ready.updatedAt);
  const edited = store.updateReport({ ...ready, pilotReportText: 'Updated', status: 'approved' })!;
  assert.equal(edited.status, 'ready');
  assert.notEqual(edited.updatedAt, ready.updatedAt);
});

test('changes survive a reload; photos stay in memory only', () => {
  const { storage, store } = setup();
  const photo = { id: 'p1', name: 'mast.jpg', url: 'blob:x', width: 1600, height: 1200 };
  store.saveDraft(newDraft({ photos: [photo] }));
  assert.deepEqual(store.getDrafts()[0].photos, [photo]);
  const reloaded = setup(storage).store;
  assert.equal(reloaded.getDrafts()[0].id, 'new-1');
  assert.deepEqual(reloaded.getDrafts()[0].photos, []);
});

test('subscribers get the current state at once and every change after', () => {
  const { store } = setup();
  const seen: number[] = [];
  const unsubscribe = store.subscribe((state) => seen.push(state.drafts.length));
  store.saveDraft(newDraft());
  unsubscribe();
  store.saveDraft(newDraft({ id: 'new-2' }));
  assert.deepEqual(seen, [0, 1]);
});

test('card headings are the type and height in metres, or just the type without a height', () => {
  assert.equal(obstacleHeading(ObstacleType.Airspan, 30), 'Aerial Span · 30\u00a0m');
  assert.equal(obstacleHeading(ObstacleType.Bridge, null), 'Bridge');
  assert.equal(obstacleHeading(ObstacleType.Bridge, 0), 'Bridge');
  assert.equal(obstacleHeading(ObstacleType.Pole, heightInMeters('Not set')), 'Pole/Tower');
  assert.equal(reportHeading({ ...draftToReport(newDraft({ title: 'Mast Bergen', heightAboveGround: '45 m (148 ft)' })) }), 'Pole/Tower · 45\u00a0m');
});

test('heights read metres first, and the earlier feet-first text still parses', () => {
  assert.equal(heightInMeters('30 m (98 ft)'), 30);
  assert.equal(heightInMeters('98 ft (30 m)'), 30);
  assert.equal(heightInMeters('Not set'), null);
});

const created = new Date(2026, 9, 27, 9, 30);
function payload(overrides: Partial<DetailsPayload> = {}): DetailsPayload {
  return {
    id: 'map-1', description: 'Seen from the air', gps_position: null, timestamp: created,
    obstacle_position: { type: 'Polygon', coordinates: [[[5, 60], [5.1, 60], [5.1, 60.1], [5, 60]]] },
    type: null, photos: [], height: 30, illumination: 'illuminated', ...overrides,
  };
}

test('a map form draft records its step, height and geometry, and has no name until one is given', () => {
  const draft = detailsToDraft(payload({ type: ObstacleType.Pole }), { step: 2, totalSteps: 2, photos: [] });
  assert.equal(draft.title, '');
  assert.equal(draft.category, ObstacleType.Pole);
  assert.equal(draft.heightAboveGround, '30 m (98 ft)');
  assert.equal(draft.lighting, 'yes');
  assert.equal(draft.stepLabel, 'Additional information');
  assert.equal(draft.createdAt, created.toISOString());
  assert.deepEqual(draft.geometry, { type: 'Polygon', coordinates: [[[5, 60], [5.1, 60], [5.1, 60.1], [5, 60]]] });

  const untyped = detailsToDraft(payload({ height: null }), { step: 1, totalSteps: 1, photos: [], existing: { name: 'Kept', createdAt: '2026-10-01T12:00:00' } });
  assert.equal(untyped.category, ObstacleType.Other);
  assert.equal(untyped.heightAboveGround, 'Not set');
  assert.equal(untyped.title, 'Kept');
  assert.equal(untyped.createdAt, '2026-10-01T12:00:00');
  assert.equal(untyped.stepLabel, 'Obstacle details');
});

test('a finished map form report is Ready with its height in metres and feet', () => {
  const report = detailsToReport(payload({ type: ObstacleType.Building, height: 45 }) as CompleteReport, { photos: [] });
  assert.equal(report.status, 'ready');
  assert.equal(report.heightMeters, 45);
  assert.equal(report.heightFeet, 148);
  assert.equal(report.name, '');
  assert.equal(reportHeading(report), 'Building · 45\u00a0m');
});
