import type { Geometry } from 'geojson';
import type { Map, MapOptions, RasterSourceSpecification, StyleSpecification } from 'maplibre-gl';

export const drawingSourceId = 'obstacle-drawing';
export const drawingLayerIds = {
  fill: 'obstacle-drawing-fill',
  casing: 'obstacle-drawing-line-casing',
  line: 'obstacle-drawing-line',
  vertices: 'obstacle-drawing-vertices',
} as const;
export const drawingPreviewSourceId = 'obstacle-drawing-preview';
export const drawingPreviewLayerIds = {
  connectorCasing: 'obstacle-drawing-target-casing',
  connector: 'obstacle-drawing-target-connector',
  edgesCasing: 'obstacle-drawing-preview-edges-casing',
  edgesCasingRight: 'obstacle-drawing-preview-edges-casing-right',
  edges: 'obstacle-drawing-preview-edges',
  target: 'obstacle-drawing-target-ring',
  candidate: 'obstacle-drawing-candidate',
} as const;

export const SATELLITE_LAYER_ID = 'satellite-layer';
export const RASTER_LAYER_IDS = ['base-layer', 'n100-layer', SATELLITE_LAYER_ID] as const;

export const mapDefaults = {
  center: [5.3435, 60.4055],
  zoom: 13.5,
  maxZoom: 18,
  attributionControl: false,
} satisfies Pick<MapOptions, 'center' | 'zoom' | 'maxZoom' | 'attributionControl'>;

const kartverketTopoSource: RasterSourceSpecification = {
  type: 'raster',
  tiles: ['https://cache.kartverket.no/v1/wmts/1.0.0/topo/default/webmercator/{z}/{y}/{x}.png'],
  tileSize: 256,
  attribution: '&copy; <a href="https://www.kartverket.no/">Kartverket</a>',
};

export const PREVIEW_GEOMETRY_SOURCE_ID = 'preview-geometry';
export const PREVIEW_MAX_ZOOM = 15;

/** Resolved from CSS tokens by the caller; WebGL paint cannot read CSS variables. */
export interface PreviewVisuals {
  point: string;
  line: string;
  casing: string;
  lineWidth: number;
  casingThickness: number;
  radius: number;
  strokeWidth: number;
}

/** Static report preview: Kartverket topo only, with one geometry drawn on top. */
export function createPreviewStyle(geometry: Geometry, visuals: PreviewVisuals): StyleSpecification {
  return {
    version: 8,
    sources: {
      n100: kartverketTopoSource,
      [PREVIEW_GEOMETRY_SOURCE_ID]: { type: 'geojson', data: { type: 'Feature', properties: {}, geometry } },
    },
    layers: [
      { id: 'n100-layer', type: 'raster', source: 'n100' },
      {
        id: 'preview-line-casing',
        type: 'line',
        source: PREVIEW_GEOMETRY_SOURCE_ID,
        filter: ['==', ['geometry-type'], 'LineString'],
        layout: { 'line-cap': 'round', 'line-join': 'round' },
        paint: { 'line-color': visuals.casing, 'line-width': visuals.lineWidth + 2 * visuals.casingThickness },
      },
      {
        id: 'preview-line',
        type: 'line',
        source: PREVIEW_GEOMETRY_SOURCE_ID,
        filter: ['==', ['geometry-type'], 'LineString'],
        layout: { 'line-cap': 'round', 'line-join': 'round' },
        paint: { 'line-color': visuals.line, 'line-width': visuals.lineWidth },
      },
      {
        id: 'preview-point',
        type: 'circle',
        source: PREVIEW_GEOMETRY_SOURCE_ID,
        filter: ['==', ['geometry-type'], 'Point'],
        paint: { 'circle-color': visuals.point, 'circle-radius': visuals.radius, 'circle-stroke-color': visuals.casing, 'circle-stroke-width': visuals.strokeWidth },
      },
    ],
  };
}

/* Future regional basemap APIs:
 * Svalbard: https://geodata.npolar.no/arcgis/rest/services/Basisdata/NP_Basiskart_Svalbard_WMTS_3857/MapServer/WMTS/tile/1.0.0/Basisdata_NP_Basiskart_Svalbard_WMTS_3857/default/default028mm/{z}/{y}/{x}
 * Jan Mayen: https://geodata.npolar.no/arcgis/rest/services/Basisdata/NP_Basiskart_JanMayen_WMTS_3857/MapServer/WMTS/tile/1.0.0/Basisdata_NP_Basiskart_JanMayen_WMTS_3857/default/default028mm/{z}/{y}/{x}
 */
export function createRasterStyle(opacity = 0, grayscale = false): StyleSpecification {
  const saturation = grayscale ? -1 : 0;
  return {
    version: 8,
    sources: {
      n100: kartverketTopoSource,
      osm: {
        type: 'raster',
        tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
        tileSize: 512,
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      },
      satellite: {
        type: 'raster',
        tiles: ['https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'],
        tileSize: 256,
        attribution:
          '&copy; <a href="https://www.esri.com/">Esri</a>, &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      },
    },
    layers: [
      {
        id: 'base-layer',
        type: 'raster',
        source: 'osm',
        paint: { 'raster-saturation': saturation },
      },
      {
        id: 'n100-layer',
        type: 'raster',
        source: 'n100',
        paint: { 'raster-saturation': saturation },
      },
      {
        id: SATELLITE_LAYER_ID,
        type: 'raster',
        source: 'satellite',
        paint: {
          'raster-opacity': opacity,
          'raster-saturation': saturation,
        },
      },
    ],
  };
}

export function applyRasterGrayscale(
  map: Pick<Map, 'getLayer' | 'setPaintProperty'>,
  grayscale: boolean,
): void {
  const saturation = grayscale ? -1 : 0;
  for (const layerId of RASTER_LAYER_IDS) {
    if (map.getLayer(layerId)) {
      map.setPaintProperty(layerId, 'raster-saturation', saturation);
    }
  }
}
