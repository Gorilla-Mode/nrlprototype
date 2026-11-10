import type { FeatureCollection } from 'geojson';
import type { GeoJSONSource, Map } from 'maplibre-gl';
import type { ReportGeometry } from '../reports/reportGeometry.js';
import { geometryLayers, userReportSourceId } from './mapConfig.js';
import { readPreviewVisuals } from './previewMap.js';

/** Draws the user's own reports on the main map, in the same colours as their report maps. */
export function createReportDisplay(map: Map) {
  let geometries: readonly ReportGeometry[] = [];
  let destroyed = false;
  const layers = geometryLayers(userReportSourceId, userReportSourceId, readPreviewVisuals(map.getContainer()));

  function features(): FeatureCollection {
    return { type: 'FeatureCollection', features: geometries.map((geometry) => ({ type: 'Feature', properties: {}, geometry })) };
  }

  function render() {
    if (destroyed) return;
    const source = map.getSource<GeoJSONSource>(userReportSourceId);
    if (source) {
      source.setData(features());
      return;
    }
    // Before the style is ready addSource throws, and the style.load listener renders again.
    try {
      map.addSource(userReportSourceId, { type: 'geojson', data: features() });
    } catch { return; }
    for (const layer of layers) if (!map.getLayer(layer.id)) map.addLayer(layer);
  }

  map.on('style.load', render);
  render();

  return {
    show(next: readonly ReportGeometry[]) {
      if (destroyed || next === geometries) return;
      geometries = next;
      render();
    },
    destroy() {
      if (destroyed) return;
      destroyed = true;
      map.off('style.load', render);
      for (const layer of layers) if (map.getLayer(layer.id)) map.removeLayer(layer.id);
      if (map.getSource(userReportSourceId)) map.removeSource(userReportSourceId);
    },
  };
}
