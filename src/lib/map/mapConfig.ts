import type { MapOptions, StyleSpecification } from 'maplibre-gl';

export const SATELLITE_LAYER_ID = 'satellite-layer';

export const mapDefaults = {
  center: [5.3435, 60.4055],
  zoom: 13.5,
  maxZoom: 18,
  attributionControl: { compact: true },
} satisfies Pick<MapOptions, 'center' | 'zoom' | 'maxZoom' | 'attributionControl'>;

/* Future regional basemap APIs:
 * Svalbard: https://geodata.npolar.no/arcgis/rest/services/Basisdata/NP_Basiskart_Svalbard_WMTS_3857/MapServer/WMTS/tile/1.0.0/Basisdata_NP_Basiskart_Svalbard_WMTS_3857/default/default028mm/{z}/{y}/{x}
 * Jan Mayen: https://geodata.npolar.no/arcgis/rest/services/Basisdata/NP_Basiskart_JanMayen_WMTS_3857/MapServer/WMTS/tile/1.0.0/Basisdata_NP_Basiskart_JanMayen_WMTS_3857/default/default028mm/{z}/{y}/{x}
 */
export function createRasterStyle(opacity = 0): StyleSpecification {
  return {
    version: 8,
    sources: {
      n100: {
        type: 'raster',
        tiles: ['https://cache.kartverket.no/v1/wmts/1.0.0/topo/default/webmercator/{z}/{y}/{x}.png'],
        tileSize: 256,
        attribution: '&copy; <a href="https://www.kartverket.no/">Kartverket</a>',
      },
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
      },
      {
        id: 'n100-layer',
        type: 'raster',
        source: 'n100',
      },
      {
        id: SATELLITE_LAYER_ID,
        type: 'raster',
        source: 'satellite',
        paint: {
          'raster-opacity': opacity,
        },
      },
    ],
  };
}
