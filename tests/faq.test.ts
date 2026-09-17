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

test('FAQ does not imply offline maps exist and retains the registrar distinction and local draft note', () => {
  const questions = faqSections.flatMap(s => s.questions);
  assert.equal(questions.some(q => q.question.includes('downloaded maps')), false);
  assert.equal(questions.find(q => q.id === 'direct-nrl')?.answer,
    'No. This app lets pilots submit obstacle observations to a registrar. The registrar reviews the observation and decides how it should be handled. A pilot submission is not a formal owner report sent directly to NRL.');
  assert.equal(questions.find(q => q.id === 'save-draft')?.note,
    'Saved on this device means that the report is stored locally and has not been submitted.');
});
