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
  readonly message: string;
}

export const idleDrawingState: DrawingState = {
  status: 'idle', draft: null, measurement: null, canComplete: false, message: '',
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

export function createDrawingController({ onChange, onComplete }: {
  onChange: (state: DrawingState) => void;
  onComplete: (geometry: ObstacleGeometry) => void;
}) {
  let state = idleDrawingState;

  function update(draft: GeometryDraft) {
    state = { status: 'drawing', draft, ...inspect(draft) };
    onChange(state);
  }

  function complete() {
    if (state.status !== 'drawing' || !state.draft || !state.canComplete) return;
    const { type, vertices } = state.draft;
    const geometry: ObstacleGeometry = type === 'Point'
      ? { type, coordinates: [...vertices[0]] }
      : type === 'LineString'
        ? { type, coordinates: vertices.map((vertex) => [...vertex]) }
        : polygonGeometry(vertices);
    state = { ...state, status: 'completed', canComplete: false, message: '' };
    onChange(state);
    onComplete(geometry);
  }

  return {
    getState: () => state,
    start(type: ObstacleGeometryType, vertex: GeographicVertex) {
      if (state.status !== 'idle' || !validVertex(vertex)) return;
      update({ type, vertices: [[...vertex]] });
      if (type === 'Point') complete();
    },
    append(vertex: GeographicVertex) {
      if (state.status !== 'drawing' || !state.draft || !validVertex(vertex)) return;
      update({ ...state.draft, vertices: [...state.draft.vertices, [...vertex]] });
    },
    undo() {
      if (state.status !== 'drawing' || !state.draft || state.draft.vertices.length <= 1) return;
      update({ ...state.draft, vertices: state.draft.vertices.slice(0, -1) });
    },
    delete() {
      if (state.status === 'idle') return;
      state = idleDrawingState;
      onChange(state);
    },
    complete,
  };
}

export type DrawingController = ReturnType<typeof createDrawingController>;

const measurementFormat = new Intl.NumberFormat('en-GB', { maximumFractionDigits: 1 });

export function formatMeasurement(measurement: DrawingState['measurement']): string {
  return measurement ? `≈ ${measurementFormat.format(measurement.value)} ${measurement.unit}` : '';
}
