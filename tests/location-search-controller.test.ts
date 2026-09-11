import assert from 'node:assert/strict';
import { test, type TestContext } from 'node:test';
import {
  createLocationSearchController,
  type LocationSearchState,
} from '../src/lib/map/createLocationSearchController.js';
import type { LocationSuggestion } from '../src/lib/map/locationSearch.js';

const debounceMs = 200;

const named = (label: string): LocationSuggestion =>
  ({ id: label, label, detail: '', lng: 1, lat: 2, zoom: 15 });

interface PendingSearch {
  query: string;
  signal: AbortSignal;
  resolve: (suggestions: LocationSuggestion[]) => void;
  reject: (reason: Error) => void;
}

// Lets the search promise's continuation run without advancing the mocked clock.
const settle = () => Promise.resolve();

function setup(t: TestContext) {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  const states: LocationSearchState[] = [];
  const selected: LocationSuggestion[] = [];
  const searches: PendingSearch[] = [];
  const controller = createLocationSearchController({
    onChange: (state) => states.push(state),
    onSelect: (suggestion) => selected.push(suggestion),
    search: (query, signal) => new Promise<LocationSuggestion[]>((resolve, reject) => {
      searches.push({ query, signal, resolve, reject });
    }),
    debounceMs,
  });
  t.after(() => controller.destroy());
  return { controller, states, selected, searches };
}

async function resolveSearch(pending: PendingSearch, suggestions: LocationSuggestion[]) {
  pending.resolve(suggestions);
  await settle();
}

test('a query below the minimum length never reaches the network', (t: TestContext) => {
  const h = setup(t);
  h.controller.setQuery('S');
  t.mock.timers.tick(debounceMs * 2);
  assert.equal(h.searches.length, 0, 'one character is not worth a request');
  assert.equal(h.controller.getState().status, 'idle');
});

test('rapid typing collapses into one request for the final query', (t: TestContext) => {
  const h = setup(t);
  for (const query of ['St', 'Sto', 'Stor']) h.controller.setQuery(query);
  assert.equal(h.searches.length, 0, 'nothing fires until the debounce elapses');
  t.mock.timers.tick(debounceMs);
  assert.deepEqual(h.searches.map((search) => search.query), ['Stor']);
});

test('a superseded request is aborted and its late answer ignored', async (t: TestContext) => {
  const h = setup(t);
  h.controller.setQuery('Stor');
  t.mock.timers.tick(debounceMs);
  h.controller.setQuery('Bergen');
  t.mock.timers.tick(debounceMs);
  assert.equal(h.searches.length, 2);
  assert.ok(h.searches[0].signal.aborted, 'the earlier request is cancelled');

  await resolveSearch(h.searches[1], [named('Bergen')]);
  await resolveSearch(h.searches[0], [named('Storgata')]);

  assert.deepEqual(
    h.controller.getState().suggestions.map((suggestion) => suggestion.label),
    ['Bergen'],
    'the stale answer must not overwrite the newer one',
  );
});

test('selecting a suggestion keeps its label and starts no further search', async (t: TestContext) => {
  const h = setup(t);
  h.controller.setQuery('Ulrik');
  t.mock.timers.tick(debounceMs);
  await resolveSearch(h.searches[0], [named('Ulriken')]);

  h.controller.select(h.controller.getState().suggestions[0]);
  t.mock.timers.tick(debounceMs * 2);

  assert.deepEqual(h.selected.map((suggestion) => suggestion.label), ['Ulriken']);
  assert.deepEqual(h.controller.getState(), {
    query: 'Ulriken',
    status: 'idle',
    suggestions: [],
    highlighted: -1,
  });
  assert.equal(h.searches.length, 1, 'adopting the label must not search for the label');
});

test('the highlight wraps in both directions and Enter takes the highlighted row', async (t: TestContext) => {
  const h = setup(t);
  h.controller.setQuery('Stor');
  t.mock.timers.tick(debounceMs);
  await resolveSearch(h.searches[0], [named('A'), named('B')]);

  h.controller.highlightPrevious();
  assert.equal(h.controller.getState().highlighted, 1, 'up from nothing lands on the last row');
  h.controller.highlightNext();
  assert.equal(h.controller.getState().highlighted, 0, 'and wraps round to the first');
  h.controller.selectHighlighted();
  assert.deepEqual(h.selected.map((suggestion) => suggestion.label), ['A']);
});

test('an empty result is reported differently from a failed one', async (t: TestContext) => {
  const h = setup(t);
  h.controller.setQuery('zzzz');
  t.mock.timers.tick(debounceMs);
  await resolveSearch(h.searches[0], []);
  assert.equal(h.controller.getState().status, 'empty');

  h.controller.setQuery('Stor');
  t.mock.timers.tick(debounceMs);
  h.searches[1].reject(new Error('offline'));
  await settle();
  assert.equal(h.controller.getState().status, 'error');
  assert.deepEqual(h.controller.getState().suggestions, []);
});

test('closing drops the list but leaves the typed query alone', async (t: TestContext) => {
  const h = setup(t);
  h.controller.setQuery('Stor');
  t.mock.timers.tick(debounceMs);
  await resolveSearch(h.searches[0], [named('Storgata')]);

  h.controller.close();
  assert.deepEqual(h.controller.getState(), {
    query: 'Stor',
    status: 'idle',
    suggestions: [],
    highlighted: -1,
  });
});

test('destroy is idempotent and abandons work already in flight', async (t: TestContext) => {
  const h = setup(t);
  h.controller.setQuery('Stor');
  t.mock.timers.tick(debounceMs);
  h.controller.destroy();
  h.controller.destroy();

  assert.ok(h.searches[0].signal.aborted);
  const published = h.states.length;
  await resolveSearch(h.searches[0], [named('Storgata')]);
  assert.equal(h.states.length, published, 'nothing is published after destroy');
});
