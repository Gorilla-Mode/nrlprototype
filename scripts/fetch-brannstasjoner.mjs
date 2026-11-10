// Fetches «Brannstasjoner» (DSB/Kartverket, NLOD) from Geonorge's WFS and writes GeoJSON
// (EPSG:4326, [longitude, latitude]) to public/data/brannstasjoner.geojson.
// The WFS only serves GML. Run again with: npm run data:brannstasjoner
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const endpoint = 'https://wfs.geonorge.no/skwms1/wfs.brannstasjoner';
const typeName = 'app:Brannstasjon';
const pageSize = 1000;
const output = resolve(dirname(fileURLToPath(import.meta.url)), '../public/data/brannstasjoner.geojson');
const fields = ['brannstasjon', 'brannvesen', 'stasjonstype', 'kasernert', 'opphav', 'informasjon'];

function pageUrl(startIndex) {
  const url = new URL(endpoint);
  url.search = new URLSearchParams({
    service: 'WFS',
    version: '2.0.0',
    request: 'GetFeature',
    typeNames: typeName,
    // The URN form of EPSG:4326 returns latitude first; coordinates are swapped below.
    srsName: 'urn:ogc:def:crs:EPSG::4326',
    count: String(pageSize),
    startIndex: String(startIndex),
  }).toString();
  return url;
}

function decode(text) {
  return text
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
    .replace(/&amp;/g, '&')
    .trim();
}

// The schema is flat (simple app:* elements and one gml:Point), so pattern matching suffices.
function parseMember(member) {
  const id = member.match(/gml:id="([^"]+)"/)?.[1];
  const pos = member.match(/<gml:pos>\s*([-\d.]+)\s+([-\d.]+)\s*<\/gml:pos>/);
  if (!id || !pos) throw new Error(`Unexpected feature without id or position:\n${member.slice(0, 300)}`);
  const [lat, lng] = [Number(pos[1]), Number(pos[2])];
  const properties = { id };
  for (const field of fields) {
    const value = member.match(new RegExp(`<app:${field}>([\\s\\S]*?)</app:${field}>`))?.[1];
    properties[field] = value === undefined ? null : decode(value);
  }
  return { type: 'Feature', id, properties, geometry: { type: 'Point', coordinates: [lng, lat] } };
}

const features = [];
for (let startIndex = 0; ; startIndex += pageSize) {
  const response = await fetch(pageUrl(startIndex));
  if (!response.ok) throw new Error(`WFS request failed: ${response.status} ${response.statusText}`);
  const gml = await response.text();
  if (gml.includes('ExceptionReport')) throw new Error(`WFS returned an exception:\n${gml.slice(0, 500)}`);
  const members = gml.match(/<wfs:member>[\s\S]*?<\/wfs:member>/g) ?? [];
  features.push(...members.map(parseMember));
  if (members.length < pageSize) break;
}

for (const { geometry: { coordinates: [lng, lat] }, id } of features) {
  // Norway including Svalbard and Jan Mayen; catches swapped axes.
  if (lng < -10 || lng > 35 || lat < 57 || lat > 82) throw new Error(`${id} lies outside Norway: ${lng}, ${lat}`);
}

const collection = {
  type: 'FeatureCollection',
  source: 'Inneholder data fra DSB/Kartverket under NLOD',
  fetched: new Date().toISOString(),
  features,
};
await mkdir(dirname(output), { recursive: true });
// One feature per line keeps later refreshes reviewable.
const lines = features.map((feature) => `    ${JSON.stringify(feature)}`).join(',\n');
await writeFile(output, `{\n  "type": "FeatureCollection",\n  "source": ${JSON.stringify(collection.source)},\n  "fetched": ${JSON.stringify(collection.fetched)},\n  "features": [\n${lines}\n  ]\n}\n`);
console.log(`Wrote ${features.length} fire stations to ${output}`);
