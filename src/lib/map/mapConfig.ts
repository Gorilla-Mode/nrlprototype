import type { FeatureCollection, Geometry } from 'geojson';
import type { LayerSpecification, Map, MapOptions, RasterSourceSpecification, StyleSpecification } from 'maplibre-gl';

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
  area: string;
  casing: string;
  /** Area fill opacity; also how faint a registered (original) location is drawn. */
  fillOpacity: number;
  dashLength: number;
  lineWidth: number;
  casingThickness: number;
  radius: number;
  strokeWidth: number;
}

/**
 * Area, line and point layers for one GeoJSON source, in the main map's drawing colours.
 * Faint layers draw a registered (original) location under an edited one.
 */
export function geometryLayers(prefix: string, source: string, visuals: PreviewVisuals, options: { faint?: boolean } = {}): LayerSpecification[] {
  const opacity = options.faint ? visuals.fillOpacity : 1;
  const outlined = ['in', ['geometry-type'], ['literal', ['LineString', 'Polygon']]] as ['in', ['geometry-type'], ['literal', string[]]];
  const dash = options.faint ? { 'line-dasharray': [visuals.dashLength, visuals.dashLength] } : {};
  return [
    {
      id: `${prefix}-area-fill`, type: 'fill', source,
      filter: ['==', ['geometry-type'], 'Polygon'],
      paint: { 'fill-color': visuals.area, 'fill-opacity': visuals.fillOpacity * opacity },
    },
    {
      id: `${prefix}-line-casing`, type: 'line', source,
      filter: outlined,
      layout: { 'line-cap': 'round', 'line-join': 'round' },
      paint: { 'line-color': visuals.casing, 'line-width': visuals.lineWidth + 2 * visuals.casingThickness, 'line-opacity': opacity },
    },
    {
      id: `${prefix}-line`, type: 'line', source,
      filter: outlined,
      layout: { 'line-cap': 'round', 'line-join': 'round' },
      paint: { 'line-color': ['match', ['geometry-type'], 'Polygon', visuals.area, visuals.line], 'line-width': visuals.lineWidth, 'line-opacity': opacity, ...dash },
    },
    {
      id: `${prefix}-point`, type: 'circle', source,
      filter: ['==', ['geometry-type'], 'Point'],
      paint: { 'circle-color': visuals.point, 'circle-radius': visuals.radius, 'circle-stroke-color': visuals.casing, 'circle-stroke-width': visuals.strokeWidth, 'circle-opacity': opacity, 'circle-stroke-opacity': opacity },
    },
  ];
}

export const emptyFeatures: FeatureCollection = { type: 'FeatureCollection', features: [] };

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
      ...geometryLayers('preview', PREVIEW_GEOMETRY_SOURCE_ID, visuals),
    ],
  };
}

export const REPORT_MAP_REGISTERED_SOURCE_ID = 'report-map-registered';

/**
 * The report map on report pages: Kartverket topo, the report's geometry (a filled point with a
 * white edge), and optionally a registered position as a hollow ring with a white halo.
 */
export function createReportMapStyle(geometry: Geometry, visuals: PreviewVisuals, registered: [number, number] | null = null): StyleSpecification {
  const style = createPreviewStyle(geometry, visuals);
  if (!registered) return style;
  return {
    ...style,
    sources: { ...style.sources, [REPORT_MAP_REGISTERED_SOURCE_ID]: { type: 'geojson', data: { type: 'Feature', properties: {}, geometry: { type: 'Point', coordinates: registered } } } },
    layers: [
      style.layers[0],
      {
        id: 'report-map-registered-halo', type: 'circle', source: REPORT_MAP_REGISTERED_SOURCE_ID,
        paint: { 'circle-color': 'transparent', 'circle-radius': visuals.radius, 'circle-stroke-color': visuals.casing, 'circle-stroke-width': visuals.strokeWidth * 3 },
      },
      {
        id: 'report-map-registered', type: 'circle', source: REPORT_MAP_REGISTERED_SOURCE_ID,
        paint: { 'circle-color': 'transparent', 'circle-radius': visuals.radius, 'circle-stroke-color': visuals.point, 'circle-stroke-width': visuals.strokeWidth * 1.5 },
      },
      ...style.layers.slice(1),
    ],
  };
}

export const LOCATION_REGISTERED_SOURCE_ID = 'location-registered';
export const LOCATION_CONNECTOR_SOURCE_ID = 'location-connector';
export const LOCATION_EDIT_SOURCE_ID = 'location-edit';

/**
 * Location editor: the registered location drawn faintly, a dashed line from a registered
 * point to its new position, and the edited line or polygon. An edited point is the fixed pin.
 */
export function createLocationEditorStyle(registered: Geometry, visuals: PreviewVisuals): StyleSpecification {
  return {
    version: 8,
    sources: {
      n100: kartverketTopoSource,
      [LOCATION_REGISTERED_SOURCE_ID]: { type: 'geojson', data: { type: 'Feature', properties: {}, geometry: registered } },
      [LOCATION_CONNECTOR_SOURCE_ID]: { type: 'geojson', data: emptyFeatures },
      [LOCATION_EDIT_SOURCE_ID]: { type: 'geojson', data: emptyFeatures },
    },
    layers: [
      { id: 'n100-layer', type: 'raster', source: 'n100' },
      ...geometryLayers('location-registered', LOCATION_REGISTERED_SOURCE_ID, visuals, { faint: true }),
      {
        id: 'location-connector', type: 'line', source: LOCATION_CONNECTOR_SOURCE_ID,
        paint: { 'line-color': visuals.point, 'line-width': visuals.strokeWidth, 'line-dasharray': [visuals.dashLength, visuals.dashLength] },
      },
      ...geometryLayers('location-edit', LOCATION_EDIT_SOURCE_ID, visuals),
    ],
  };
}

/** Users' own Draft and Ready reports on the main map. */
export const userReportSourceId = 'user-reports';

/** Kartverket topographic basemap alone, for the reporting guide's example map. */
export function createTopoStyle(): StyleSpecification {
  return {
    version: 8,
    sources: { n100: kartverketTopoSource },
    layers: [{ id: 'n100-layer', type: 'raster', source: 'n100' }],
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
