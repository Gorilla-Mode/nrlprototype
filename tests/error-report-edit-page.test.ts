import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { Component } from 'svelte';
import { render } from 'svelte/server';
import type { ErrorReportAnswers, ErrorReportRecord } from '../src/lib/obstacles/errorReport.js';
import { describeEditRequirement } from '../src/lib/obstacles/errorReport.js';
import { ObstacleType } from '../src/lib/reporting/obstacle.js';
import { editedErrorReport, errorReportToReport } from '../src/lib/reports/errorReportRecords.js';
import { reportedChanges } from '../src/lib/reports/sentReport.js';
import type { Report } from '../src/lib/reports/reportsData.js';
import { compileSvelteComponent } from './helpers/svelte-server.js';
import { compileStatusBadge } from './helpers/statusBadge.js';

const obstacle = { id: 'DSB-201', name: 'Sandviken', type: 'Building' as const, heightM: 10, lit: true, lat: 60.4054, lng: 5.3235 };
const record: ErrorReportRecord = { obstacle, answers: { errorKinds: ['wrong-height'], actualHeightM: 14, correctedPosition: null, description: 'Taller now.' } };
const stored: Report = {
  ...errorReportToReport('e1', record, { existing: { name: 'Roof', createdAt: '2026-10-12T10:00:00.000Z' } }),
  photos: [{ id: 'p1', name: 'IMG_1.jpg', url: 'blob:p1', width: 4, height: 3 }],
};
const answers = (patch: Partial<ErrorReportAnswers>): ErrorReportAnswers => ({ ...record.answers, ...patch });

test('saving complete answers keeps the Ready report, with its name, creation time and photos', () => {
  const moved = { lat: 60.4054, lng: 5.3299 };
  const edited = editedErrorReport(stored, answers({ errorKinds: ['wrong-height', 'wrong-position'], correctedPosition: moved, description: '  Moved east. ' }), stored.photos);
  assert.equal(edited.kind, 'ready');
  if (edited.kind !== 'ready') return;
  const { report } = edited;
  assert.deepEqual([report.id, report.name, report.createdAt, report.status], ['e1', 'Roof', '2026-10-12T10:00:00.000Z', 'ready']);
  assert.deepEqual(report.photos.map(({ id }) => id), ['p1']);
  assert.equal(report.heightMeters, 14);
  assert.deepEqual(report.geometry, { type: 'Point', coordinates: [5.3299, 60.4054] });
  assert.equal(report.pilotReportText, 'Moved east.');
  assert.deepEqual(report.errorReport?.answers.errorKinds, ['wrong-height', 'wrong-position']);
});

test('saving incomplete answers moves it back to Drafts, as on the new obstacle edit page', () => {
  const edited = editedErrorReport(stored, answers({ actualHeightM: null }), []);
  assert.equal(edited.kind, 'draft');
  if (edited.kind !== 'draft') return;
  assert.deepEqual([edited.draft.id, edited.draft.title], ['e1', 'Roof']);
  assert.deepEqual(edited.draft.errorReport?.answers.errorKinds, ['wrong-height']);
  assert.throws(() => editedErrorReport({ ...stored, errorReport: undefined }, record.answers, []));
});

test('the edit page rule: at least one checked field, values for a checked type and height', () => {
  const none = answers({ errorKinds: [], actualHeightM: null, description: 'Only a description' });
  assert.equal(describeEditRequirement(none), 'Select at least one field that is wrong');
  assert.equal(describeEditRequirement(answers({ errorKinds: ['wrong-type'], actualType: null })), 'Choose the reported type');
  assert.equal(describeEditRequirement(answers({ actualHeightM: null })), 'Enter the reported height');
  assert.equal(describeEditRequirement(answers({ errorKinds: ['does-not-exist'], actualHeightM: null })), null);
  assert.equal(describeEditRequirement(answers({})), null);
  // Saving with none checked keeps it as a draft.
  assert.equal(editedErrorReport(stored, none, []).kind, 'draft');
});

test('what the edit page reports is what the sent page lists: type, height, lighting, position, in order', () => {
  const moved = { lat: 60.4054, lng: 5.3299 };
  const edited = answers({
    errorKinds: ['wrong-type', 'wrong-height', 'wrong-lighting', 'wrong-position'],
    actualType: ObstacleType.Construction, actualHeightM: 14, actualLighting: 'unknown', correctedPosition: moved,
  });
  const saved = editedErrorReport(stored, edited, []);
  assert.equal(saved.kind, 'ready');
  if (saved.kind !== 'ready') return;
  assert.equal(saved.report.obstacleType, ObstacleType.Construction);
  assert.equal(saved.report.lighting, 'unknown');
  const rows = reportedChanges(saved.report.errorReport!).map(({ field, current, reported }) => [field, current, reported]);
  assert.deepEqual(rows, [
    ['Type', 'Building', 'Construction'], ['Height', '10 m', '14 m'], ['Lighting', 'Lit', 'Unknown'], ['Position', '60.4054° N, 5.3235° E', '60.4054° N, 5.3299° E'],
  ]);
  // A lighting answer from the map form, with no value chosen, still means the opposite.
  assert.deepEqual(reportedChanges({ obstacle, answers: answers({ errorKinds: ['wrong-lighting'] }) }).map(({ reported }) => reported), ['Not lit']);
});

const stub = (name: string) => `data:text/javascript,export default function ${name}() {}`;
const pageUrl = await compileSvelteComponent('src/lib/reports/ErrorReportEditPage.svelte', {
  '../components/PageHeader.svelte': await compileSvelteComponent('src/lib/components/PageHeader.svelte'),
  './StatusBadge.svelte': await compileStatusBadge(),
  './Dropdown.svelte': await compileSvelteComponent('src/lib/reports/Dropdown.svelte'),
  '../map/MiniMap.svelte': stub('MiniMap'),
  '../map/LocationEditor.svelte': stub('LocationEditor'),
  './PhotoField.svelte': stub('PhotoField'),
  '../obstacles/errorReport': new URL('../src/lib/obstacles/errorReport.js', import.meta.url).href,
  '../obstacles/position': new URL('../src/lib/obstacles/position.js', import.meta.url).href,
  '../reporting/obstacle': new URL('../src/lib/reporting/obstacle.js', import.meta.url).href,
  './reportGeometry': new URL('../src/lib/reports/reportGeometry.js', import.meta.url).href,
  './reportsData': new URL('../src/lib/reports/reportsData.js', import.meta.url).href,
  './reportStore': new URL('../src/lib/reports/reportStore.js', import.meta.url).href,
  './errorReportRecords': new URL('../src/lib/reports/errorReportRecords.js', import.meta.url).href,
});
const { default: Page } = await import(pageUrl) as { default: Component<{ report: Report; onback: () => void; ondone: () => void; onsend: () => void }> };
const noop = () => {};
const page = (report: Report) => render(Page, { props: { report, onback: noop, ondone: noop, onsend: noop } }).body.replace(/<!--[^>]*-->/g, '');
const withAnswers = (patch: Partial<ErrorReportAnswers>): Report => ({ ...stored, errorReport: { obstacle, answers: answers(patch) } });

test('one "What is wrong?" card in the edit page layout; header, description, location and footer kept', () => {
  const html = page(stored);
  assert.match(html, /<h1[^>]*>Error report · Sandviken<\/h1>/);
  assert.match(html, /data-status="ready"/);
  assert.match(html, /<p class="report-meta[^"]*">\s*Reported by [^<]+· Last edited <time/);
  assert.match(html, />What is wrong\?<\/h2>\s*<p class="registered-line[^"]*">Registered in NRL: Building · 10 m · lit · ID DSB-201<\/p>/);
  assert.match(html, /What is wrong\?[\s\S]*Description and photo \(optional\)[\s\S]*>Location<\/h2>[\s\S]*>Save draft<\/button>[\s\S]*Send for Review/);
  assert.doesNotMatch(html, /Actual height|Registered obstacle<|class="fields-row/);
  const modes = [...html.matchAll(/class="reports-segment[^"]*" aria-pressed="(true|false)"[^>]*>([^<]+)</g)].map((match) => [match[2], match[1]]);
  assert.deepEqual(modes, [['Information is wrong', 'true'], ['Does not exist', 'false']]);
});

test('a real table: checkbox, a label for it, the registered value, and Correct or an input', () => {
  const html = page(stored);
  assert.match(html, /<th scope="col"[^>]*><span class="sr-only">Wrong<\/span><\/th>\s*<th scope="col"[^>]*>Field<\/th><th scope="col"[^>]*>In NRL today<\/th><th scope="col"[^>]*>Reported<\/th>/);
  const rows = [...html.matchAll(/<input type="checkbox" id="error-check-(\w+)"([^>]*)>[\s\S]*?<th scope="row"[^>]*><label class="field-name[^"]*" for="error-check-\1">(\w+)<\/label><\/th>\s*<td class="current[^"]*">([^<]+)<\/td>/g)]
    .map((match) => [match[3], /checked/.test(match[2]), match[4]]);
  assert.deepEqual(rows, [['Type', false, 'Building'], ['Height', true, '10 m'], ['Lighting', false, 'Lit'], ['Position', false, '60.4054° N, 5.3235° E']]);
  assert.equal([...html.matchAll(/<span class="current[^"]*">Correct<\/span>/g)].length, 3);
  assert.match(html, /id="error-height"[^>]*value="14"/);
  assert.match(html, />\+4 m vs registered</);
  assert.doesNotMatch(html, /aria-disabled="true"/);
});

test('checked rows are prefilled from the report: type, lighting and position', () => {
  const html = page(withAnswers({
    errorKinds: ['wrong-type', 'wrong-lighting', 'wrong-position'], actualHeightM: null,
    actualType: ObstacleType.Construction, actualLighting: 'unknown', correctedPosition: { lat: 60.4054, lng: 5.3299 },
  }));
  assert.match(html, /id="error-type"[\s\S]*?<option value="construction"[^>]*selected/);
  assert.match(html, /id="error-lighting"[\s\S]*?<option value="unknown"[^>]*selected/);
  assert.match(html, /<strong[^>]*>60\.4054° N, 5\.3299° E<\/strong>\s*<span class="reported-note[^"]*">\d+ m east of registered · <button[^>]*>Edit in map<\/button>/);
});

test('"Does not exist": the single struck-through row and the note; nothing else to fill in', () => {
  const html = page(withAnswers({ errorKinds: ['does-not-exist'], actualHeightM: null }));
  assert.match(html, /aria-pressed="true"[^>]*>Does not exist</);
  assert.match(html, /<th scope="row"[^>]*>Obstacle<\/th>\s*<td class="current[^"]*"><s[^>]*>Building · 10 m · ID DSB-201<\/s><\/td>\s*<td class="reported[^"]*"><strong[^>]*>Does not exist<\/strong>/);
  assert.match(html, /The obstacle will be reported as removed\. Height, lighting and position aren't needed\./);
  assert.doesNotMatch(html, /type="checkbox"|aria-disabled="true"/);
});

test('nothing checked: the message by the table, and Send marked unavailable; a checked empty height says so', () => {
  const html = page(withAnswers({ errorKinds: [], actualHeightM: null }));
  assert.match(html, /<p class="field-error table-error[^"]*" role="status">Select at least one field that is wrong<\/p>/);
  assert.match(html, /class="ds-button send-button[^"]*"[^>]*aria-disabled="true"/);
  const empty = page(withAnswers({ actualHeightM: null }));
  assert.match(empty, /aria-invalid="true"/);
  assert.match(empty, />Required to send</);
  assert.match(empty, /Enter the reported height/);
});
