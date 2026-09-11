import { searchLocations, type LocationSearch, type LocationSuggestion } from './locationSearch.js';

export type LocationSearchStatus = 'idle' | 'searching' | 'results' | 'empty' | 'error';

export interface LocationSearchState {
  readonly query: string;
  readonly status: LocationSearchStatus;
  readonly suggestions: readonly LocationSuggestion[];
  readonly highlighted: number;
}

export const idleSearchState: LocationSearchState = {
  query: '',
  status: 'idle',
  suggestions: [],
  highlighted: -1,
};

export const minQueryLength = 2;

export function createLocationSearchController({
  onChange,
  onSelect,
  search = searchLocations,
  debounceMs = 250,
}: {
  onChange: (state: LocationSearchState) => void;
  onSelect: (suggestion: LocationSuggestion) => void;
  search?: LocationSearch;
  debounceMs?: number;
}) {
  let state = idleSearchState;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let inFlight: AbortController | undefined;
  let generation = 0;
  let destroyed = false;

  function publish(next: Partial<LocationSearchState>) {
    state = { ...state, ...next };
    onChange(state);
  }

  function cancelPending() {
    // Invalidate queued responses before tearing down the request that produced them.
    generation++;
    if (timer !== undefined) {
      clearTimeout(timer);
      timer = undefined;
    }
    inFlight?.abort();
    inFlight = undefined;
  }

  function run(query: string) {
    const request = ++generation;
    const isCurrent = () => !destroyed && request === generation;
    const pending = new AbortController();
    inFlight = pending;
    search(query, pending.signal).then((suggestions) => {
      if (!isCurrent()) return;
      inFlight = undefined;
      publish({
        suggestions,
        status: suggestions.length ? 'results' : 'empty',
        highlighted: -1,
      });
    }, () => {
      if (!isCurrent()) return;
      inFlight = undefined;
      publish({ suggestions: [], status: 'error', highlighted: -1 });
    });
  }

  function close() {
    if (destroyed) return;
    cancelPending();
    publish({ status: 'idle', suggestions: [], highlighted: -1 });
  }

  function select(suggestion: LocationSuggestion) {
    if (destroyed) return;
    // Adopting the label as the query must not search for that label in turn.
    cancelPending();
    publish({
      query: suggestion.label,
      status: 'idle',
      suggestions: [],
      highlighted: -1,
    });
    onSelect(suggestion);
  }

  function moveHighlight(step: number) {
    if (destroyed || state.suggestions.length === 0) return;
    const count = state.suggestions.length;
    const next = state.highlighted === -1
      ? (step > 0 ? 0 : count - 1)
      : (state.highlighted + step + count) % count;
    publish({ highlighted: next });
  }

  return {
    getState: () => state,
    setQuery(query: string) {
      if (destroyed) return;
      cancelPending();
      if (query.trim().length < minQueryLength) {
        publish({ query, status: 'idle', suggestions: [], highlighted: -1 });
        return;
      }
publish({ query, status: 'searching', suggestions: [], highlighted: -1 });
      timer = setTimeout(() => {
        timer = undefined;
        run(query);
      }, debounceMs);
    },
    highlightNext: () => moveHighlight(1),
    highlightPrevious: () => moveHighlight(-1),
    selectHighlighted() {
      const suggestion = state.suggestions[state.highlighted];
      if (suggestion) select(suggestion);
    },
    select,
    close,
    destroy() {
      if (destroyed) return;
      destroyed = true;
      cancelPending();
    },
  };
}

export type LocationSearchController = ReturnType<typeof createLocationSearchController>;
