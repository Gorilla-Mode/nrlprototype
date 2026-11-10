import assert from 'node:assert/strict';
import { test } from 'node:test';
import { faqSections, filterFaq } from '../src/lib/faq/faq.js';

test('FAQ search matches question, answer and note text without regard to case', () => {
  assert.deepEqual(filterFaq('WHICH GEOMETRY').flatMap(s => s.questions.map(q => q.id)), ['geometry']);
  assert.deepEqual(filterFaq('HemsWX').flatMap(s => s.questions.map(q => q.id)), ['after-submit']);
  assert.deepEqual(filterFaq('stored locally and has not').flatMap(s => s.questions.map(q => q.id)), ['save-draft']);
});

test('FAQ search omits empty sections, treats punctuation literally and restores all content when cleared', () => {
  assert.deepEqual(filterFaq('no matching question here'), []);
  assert.deepEqual(filterFaq('.*'), []);
  assert.equal(filterFaq('HemsWX')[0]?.title, 'DRAFTS AND REVIEW');
  assert.equal(filterFaq('').flatMap(s => s.questions).length, 10);
  assert.equal(faqSections.length, 4);
});

test('FAQ search ignores surrounding and repeated spaces and matches every word in any order', () => {
  const ids = (query: string) => filterFaq(query).flatMap(s => s.questions.map(q => q.id));
  assert.deepEqual(ids('  hemswx  '), ['after-submit']);
  assert.equal(ids('   ').length, 10);
  assert.deepEqual(ids('SENT reports  DRAFT'), ['possible-obstacle']);
  assert.deepEqual(ids('height type press'), ['possible-obstacle']);
  assert.deepEqual(ids('hemswx polygon'), []);
});

test('the possible-obstacle answer describes press-and-hold, draft and Reports, without a guide link', () => {
  const question = faqSections.flatMap(s => s.questions).find(q => q.id === 'possible-obstacle');
  assert.equal(question?.answer, 'Press and hold on the map where the obstacle is, then drag to choose Point, Line or Polygon. Add the information you know, such as type and height, and save the report as a draft. To send it, open the draft in Reports, review it and tap Send report. You can then find it under Sent reports.');
  assert.equal(question?.link, undefined);
});

test('FAQ does not imply offline maps exist and retains the registrar distinction and local draft note', () => {
  const questions = faqSections.flatMap(s => s.questions);
  assert.equal(questions.some(q => q.question.includes('downloaded maps')), false);
  assert.equal(questions.find(q => q.id === 'direct-nrl')?.answer,
    'No. This app lets pilots submit obstacle observations to a registrar. The registrar reviews the observation and decides how it should be handled. A pilot submission is not a formal owner report sent directly to NRL.');
  assert.equal(questions.find(q => q.id === 'save-draft')?.note,
    'Saved on this device means that the report is stored locally and has not been submitted.');
});
