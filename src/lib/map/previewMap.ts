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
      casing: color('--color-drawing-casing'),
      lineWidth: number('--map-drawing-line-width'),
      casingThickness: number('--map-drawing-casing-thickness'),
      radius: number('--map-drawing-vertex-radius'),
      strokeWidth: number('--map-drawing-stroke-width'),
    };
  } finally { probe.remove(); }
}
