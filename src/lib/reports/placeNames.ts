import { lookupPlaceName, placeIsCurrent, placePoint } from './placeName.js';
import type { ReportStore } from './reportStore.js';

/**
 * Looks up the place of every stored draft and report that has a location but no place for it
 * yet: new saves, changed locations and reports saved before places existed. Each point is
 * looked up once, one at a time, and stored, so the list never calls the API to show a card.
 * A failed lookup is not retried until the next app start; the card shows coordinates meanwhile.
 */
export function startPlaceNames(store: Pick<ReportStore, 'subscribe' | 'setPlace'>, lookup = (point: [number, number]) => lookupPlaceName(point)): () => void {
  const pending = new Set<string>();
  const failed = new Set<string>();
  let queue: Promise<void> = Promise.resolve();

  return store.subscribe((state) => {
    for (const item of [...state.drafts, ...state.reports]) {
      const point = placePoint(item.geometry);
      if (!point || placeIsCurrent(item.place, item.geometry)) continue;
      const key = `${item.id}|${point.join(',')}`;
      if (pending.has(key) || failed.has(key)) continue;
      pending.add(key);
      queue = queue.then(async () => {
        try {
          store.setPlace(item.id, { name: await lookup(point), at: point });
        } catch {
          failed.add(key);
        } finally {
          pending.delete(key);
        }
      });
    }
  });
}
