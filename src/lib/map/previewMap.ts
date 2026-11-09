import { PREVIEW_MAX_ZOOM, type PreviewVisuals } from './mapConfig.js';
import { geometryBounds, type GeometryBounds, type ReportGeometry } from '../reports/reportGeometry.js';

export type PreviewCamera =
  | { center: [number, number]; zoom: number }
  | { bounds: GeometryBounds; fitBoundsOptions: { padding: number; maxZoom: number } };

/** Initial camera for a report map: a fixed zoom on a point, a line fitted with a fifth of the shorter side as margin. */
export function previewCamera(geometry: ReportGeometry, width: number, height: number): PreviewCamera {
  if (geometry.type === 'Point') return { center: [geometry.coordinates[0], geometry.coordinates[1]], zoom: PREVIEW_MAX_ZOOM };
  return {
    bounds: geometryBounds(geometry),
    fitBoundsOptions: { padding: Math.round(Math.min(width, height) * 0.2), maxZoom: PREVIEW_MAX_ZOOM },
  };
}

/**
 * Report maps: the zoom the report previews always had (PREVIEW_MAX_ZOOM, 15), where roads,
 * buildings and place names around the point show. Fitted views never zoom closer than this.
 */
export const REPORT_MAP_ZOOM = 15;

/**
 * Initial camera for the report map on report pages: a point at REPORT_MAP_ZOOM; a line, an
 * area, or a reported point with its registered position fitted with a fifth of the shorter side as margin.
 */
export function reportMapCamera(geometry: ReportGeometry, width: number, height: number, registered: [number, number] | null = null): PreviewCamera {
  if (geometry.type === 'Point' && !registered) return { center: [geometry.coordinates[0], geometry.coordinates[1]], zoom: REPORT_MAP_ZOOM };
  const [[west, south], [east, north]] = geometryBounds(geometry);
  const bounds: GeometryBounds = registered
    ? [[Math.min(west, registered[0]), Math.min(south, registered[1])], [Math.max(east, registered[0]), Math.max(north, registered[1])]]
    : [[west, south], [east, north]];
  return { bounds, fitBoundsOptions: { padding: Math.round(Math.min(width, height) * 0.2), maxZoom: REPORT_MAP_ZOOM } };
}

// CSS is authoritative; resolve tokens for WebGL the same way the main map's displays do.
export function readPreviewVisuals(element: HTMLElement): PreviewVisuals {
  const view = element.ownerDocument.defaultView!;
  const probe = element.ownerDocument.createElement('span');
  probe.hidden = true;
  element.append(probe);
  const color = (token: string) => {
    probe.style.color = `var(${token})`;
    return view.getComputedStyle(probe).color;
  };
  const style = view.getComputedStyle(element);
  const number = (token: string) => {
    const value = Number.parseFloat(style.getPropertyValue(token));
    if (!Number.isFinite(value)) throw new Error(`Missing numeric design token: ${token}`);
    return value;
  };
  try {
    return {
      point: color('--color-map-point'),
      line: color('--color-map-line'),
      area: color('--color-map-area'),
      casing: color('--color-drawing-casing'),
      fillOpacity: number('--map-drawing-fill-opacity'),
      dashLength: number('--map-drawing-dash-length'),
      lineWidth: number('--map-drawing-line-width'),
      casingThickness: number('--map-drawing-casing-thickness'),
      radius: number('--map-drawing-vertex-radius'),
      strokeWidth: number('--map-drawing-stroke-width'),
    };
  } finally { probe.remove(); }
}

/** The report map's marker: the drawing visuals with a larger point and a wider white edge, from their tokens. */
export function readReportMapVisuals(element: HTMLElement): PreviewVisuals {
  const style = element.ownerDocument.defaultView!.getComputedStyle(element);
  const number = (token: string) => {
    const value = Number.parseFloat(style.getPropertyValue(token));
    if (!Number.isFinite(value)) throw new Error(`Missing numeric design token: ${token}`);
    return value;
  };
  return { ...readPreviewVisuals(element), radius: number('--report-map-marker-radius'), strokeWidth: number('--report-map-marker-stroke') };
}
