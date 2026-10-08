import { length } from '@turf/length';
import { area } from '@turf/area';
import { kinks } from '@turf/kinks';
import type { Polygon } from 'geojson';
import type { GeographicVertex, ObstacleGeometry, ObstacleGeometryType } from './obstacle.js';

export interface GeometryDraft {
  readonly type: ObstacleGeometryType;
  readonly vertices: readonly GeographicVertex[];
}

export interface DrawingState {
  readonly status: 'idle' | 'drawing' | 'completed';
  readonly draft: GeometryDraft | null;
  readonly measurement: { readonly value: number; readonly unit: 'm' | 'm²' } | null;
  readonly canComplete: boolean;
  readonly canUndo: boolean;
  readonly message: string;
}

export const idleDrawingState: DrawingState = {
  status: 'idle', draft: null, measurement: null, canComplete: false, canUndo: false, message: '',
};

/** Close the derived ring without adding a duplicate editable vertex. */
export function polygonGeometry(vertices: readonly GeographicVertex[]): Polygon {
  return { type: 'Polygon', coordinates: [[...vertices, vertices[0]].map((vertex) => [...vertex])] };
}

// Turf kinks finds crossings, but collinear overlaps also make a ring invalid.
function hasVertexOnEdge(vertices: readonly GeographicVertex[]): boolean {
  return vertices.some(([ax, ay], index) => {
    const next = (index + 1) % vertices.length;
    const [bx, by] = vertices[next];
    return vertices.some(([x, y], other) => {
      if (other === index || other === next) return false;
      const left = (bx - ax) * (y - ay);
      const right = (by - ay) * (x - ax);
      const tolerance = 32 * Number.EPSILON * Math.max(Math.abs(left), Math.abs(right));
      return Math.abs(left - right) <= tolerance &&
        x >= Math.min(ax, bx) && x <= Math.max(ax, bx) &&
        y >= Math.min(ay, by) && y <= Math.max(ay, by);
    });
  });
}

function inspect(draft: GeometryDraft): Pick<DrawingState, 'measurement' | 'canComplete' | 'message'> {
  const { type, vertices } = draft;
  if (type === 'Point') return { measurement: null, canComplete: true, message: '' };
  const distinctCount = new Set(vertices.map(([lng, lat]) => `${lng},${lat}`)).size;
  if (type === 'LineString') {
    const value = vertices.length < 2 ? 0 : length({
      type: 'Feature', properties: {},
      geometry: { type: 'LineString', coordinates: vertices.map((vertex) => [...vertex]) },
    }, { units: 'meters' });
    const canComplete = distinctCount >= 2 && value > 0;
    return { measurement: { value, unit: 'm' }, canComplete,
      message: canComplete ? '' : 'Place at least two distinct points to complete the line.' };
  }

  const invalid = (message: string) => ({ measurement: null, canComplete: false, message });
  if (distinctCount !== vertices.length) return invalid('Polygon points must not repeat. Undo the latest points to adjust the shape.');
  if (distinctCount < 3) return invalid('Place at least three distinct points to complete the polygon.');
  const polygon = polygonGeometry(vertices);
  if (kinks(polygon).features.length || hasVertexOnEdge(vertices)) {
    return invalid('Polygon edges must not cross or overlap. Undo the latest points to adjust the shape.');
  }
  const value = area(polygon);
  if (value <= 0) return invalid('Polygon must enclose an area. Add a point or undo to adjust the shape.');
  return { measurement: { value, unit: 'm²' }, canComplete: true, message: '' };
}

function validVertex([lng, lat]: GeographicVertex) {
  return Number.isFinite(lng) && Number.isFinite(lat) && lat >= -90 && lat <= 90;
}

export function createDrawingController({ onChange, onComplete, vertexEditing = false, deferPointCompletion = false }: {
  vertexEditing?: boolean;
  deferPointCompletion?: boolean;
  onChange: (state: DrawingState) => void;
  onComplete: (geometry: ObstacleGeometry) => void;
}) {
  let state = idleDrawingState;
  const history: GeometryDraft[] = [];
  let move: { index: number; original: GeometryDraft } | undefined;

  function remember() {
    if (state.draft) history.push(state.draft);
  }

  function cancelVertexMove() {
    if (!move) return;
    const { original } = move;
    move = undefined;
    update(original);
  }

  function update(draft: GeometryDraft) {
    state = { status: 'drawing', draft, ...inspect(draft), canUndo: history.length > 0 };
    if (move) state = { ...state, canComplete: false };
    onChange(state);
  }

  function complete() {
    if (state.status !== 'drawing' || !state.draft || !state.canComplete || move) return;
    const { type, vertices } = state.draft;
    const geometry: ObstacleGeometry = type === 'Point'
      ? { type, coordinates: [...vertices[0]] }
      : type === 'LineString'
        ? { type, coordinates: vertices.map((vertex) => [...vertex]) }
        : polygonGeometry(vertices);
    state = { ...state, status: 'completed', canComplete: false, canUndo: false, message: '' };
    onChange(state);
    onComplete(geometry);
  }

  return {
    getState: () => state,
    start(type: ObstacleGeometryType, vertex: GeographicVertex) {
      if (state.status !== 'idle' || !validVertex(vertex)) return;
      update({ type, vertices: [[...vertex]] });
      if (type === 'Point' && !deferPointCompletion) complete();
    },
    append(vertex: GeographicVertex) {
      if (state.status !== 'drawing' || !state.draft || state.draft.type === 'Point' || move || !validVertex(vertex)) return;
      remember();
      update({ ...state.draft, vertices: [...state.draft.vertices, [...vertex]] });
    },
    undo() {
      if (state.status !== 'drawing') return;
      cancelVertexMove();
      const previous = history.pop();
      if (previous) update(previous);
    },
    delete() {
      if (state.status === 'idle') return;
      move = undefined;
      history.length = 0;
      state = idleDrawingState;
      onChange(state);
    },
    beginVertexMove(index: number): boolean {
      if (!vertexEditing || move || state.status !== 'drawing' || !state.draft ||
        !Number.isInteger(index) || index < 0 || index >= state.draft.vertices.length) return false;
      move = { index, original: state.draft };
      update(state.draft);
      return true;
    },
    updateVertexMove(vertex: GeographicVertex) {
      if (!move || !state.draft || !validVertex(vertex)) return;
      const movingIndex = move.index;
      update({ ...state.draft, vertices: state.draft.vertices.map((value, index) =>
        index === movingIndex ? [...vertex] : value) });
    },
    commitVertexMove() {
      if (!move || !state.draft) return;
      const { index, original } = move;
      move = undefined;
      const current = state.draft.vertices[index];
      const before = original.vertices[index];
      if (current[0] !== before[0] || current[1] !== before[1]) history.push(original);
      update(state.draft);
    },
    cancelVertexMove,
    complete,
  };
}

export type DrawingController = ReturnType<typeof createDrawingController>;

const measurementFormat = new Intl.NumberFormat('en-GB', { maximumFractionDigits: 1 });

export function formatMeasurement(measurement: DrawingState['measurement']): string {
  return measurement ? `≈ ${measurementFormat.format(measurement.value)} ${measurement.unit}` : '';
}
