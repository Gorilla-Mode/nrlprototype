import type { ControlPosition, IControl, Map as MapLibreMap } from 'maplibre-gl';

type MetricScale = { meters: number; width: number; label: string };

export function selectMetricScale(maxMeters: number, maxWidth: number): MetricScale | null {
  if (!Number.isFinite(maxMeters) || maxMeters <= 0 || !Number.isFinite(maxWidth) || maxWidth <= 0) return null;
  const magnitude = 10 ** Math.floor(Math.log10(maxMeters));
  const fraction = maxMeters / magnitude;
  const meters = (fraction >= 5 ? 5 : fraction >= 2 ? 2 : 1) * magnitude;
  return {
    meters,
    width: maxWidth * meters / maxMeters,
    label: meters >= 2000 ? `${meters / 1000} km` : `${meters} m`,
  };
}

const scaleEvents = ['move', 'resize', 'projectiontransition'] as const;

/** A local ground-distance scale sampled through MapLibre's current projection. */
export class MetricScaleControl implements IControl {
  private map?: MapLibreMap;
  private container?: HTMLElement;
  private label?: HTMLElement;

  constructor(private readonly options: { maxWidth: number }) {}

  getDefaultPosition(): ControlPosition {
    return 'bottom-right';
  }

  onAdd(map: MapLibreMap): HTMLElement {
    this.map = map;
    const document = map.getContainer().ownerDocument;
    this.container = document.createElement('div');
    this.container.className = 'maplibregl-ctrl nrl-map-scale';
    this.label = document.createElement('span');
    this.label.className = 'nrl-map-scale-label';
    const line = document.createElement('span');
    line.className = 'nrl-map-scale-line';
    line.setAttribute('aria-hidden', 'true');
    this.container.append(this.label, line);
    for (const event of scaleEvents) map.on(event, this.update);
    this.update();
    return this.container;
  }

  onRemove(): void {
    for (const event of scaleEvents) this.map?.off(event, this.update);
    this.container?.remove();
    this.map = undefined;
    this.container = undefined;
    this.label = undefined;
  }

  private update = (): void => {
    if (!this.map || !this.container || !this.label) return;
    const viewport = this.map.getContainer();
    const sampleWidth = Math.min(this.options.maxWidth, viewport.clientWidth);
    if (sampleWidth <= 0 || viewport.clientHeight <= 0) {
      this.container.hidden = true;
      return;
    }
    const x = viewport.clientWidth / 2;
    const y = viewport.clientHeight / 2;
    const left = this.map.unproject([x - sampleWidth / 2, y]);
    const right = this.map.unproject([x + sampleWidth / 2, y]);
    // Globe edges can clamp unprojected points; use their actual on-screen span.
    const projectedWidth = Math.abs(this.map.project(right).x - this.map.project(left).x);
    const scale = selectMetricScale(left.distanceTo(right), Math.min(sampleWidth, projectedWidth));
    this.container.hidden = scale === null;
    if (!scale) return;
    this.label.textContent = scale.label;
    // Runtime-derived distance width; all appearance values remain in the stylesheet.
    this.container.style.setProperty('--map-scale-width', `${scale.width}px`);
  };
}
