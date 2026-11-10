import type { FeatureCollection, Point } from 'geojson';
import type { RegisteredObstacle } from './registeredObstacles.js';

/**
 * «Brannstasjoner» (DSB/Kartverket, NLOD) stand in for registered obstacles, to show the
 * map with many real points. Refresh the file with `npm run data:brannstasjoner`.
 */
export const fireStationDataUrl = 'data/brannstasjoner.geojson';
export const fireStationAttribution =
  'Inneholder data fra DSB/Kartverket under <a href="https://data.norge.no/nlod/no/2.0" target="_blank" rel="noopener">NLOD</a>';

/** Field names as delivered by the WFS layer app:Brannstasjon. */
export interface FireStationProperties {
  id: string;
  brannstasjon: string;
  brannvesen: string | null;
  stasjonstype: string | null;
  kasernert: string | null;
  opphav: string | null;
  informasjon: string | null;
}

/** Fire stations have no obstacle data; these fixed values only make them reportable. */
const standIn = { type: 'Building', heightM: 10, lit: false } as const;

export function fireStationToObstacle(properties: FireStationProperties, [lng, lat]: Point['coordinates']): RegisteredObstacle {
  return {
    // "brannstasjon.12" → "DSB-12"
    id: `DSB-${properties.id.replace(/^brannstasjon\./, '')}`,
    name: properties.brannstasjon,
    ...standIn,
    lat,
    lng,
  };
}

export function fireStationsToObstacles(collection: FeatureCollection<Point | null, FireStationProperties>): RegisteredObstacle[] {
  return collection.features.flatMap(({ geometry, properties }) =>
    geometry?.type === 'Point' ? [fireStationToObstacle(properties, geometry.coordinates)] : []);
}

export async function loadFireStationObstacles(url = fireStationDataUrl): Promise<RegisteredObstacle[]> {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Could not load fire stations from ${url}: ${response.status}`);
  return fireStationsToObstacles(await response.json() as FeatureCollection<Point | null, FireStationProperties>);
}
