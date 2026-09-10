import type { LineString, Point, Polygon } from 'geojson';

/** Geometry only; reporting metadata is collected in a later step. */
export type ObstacleGeometry = Point | LineString | Polygon;
export type ObstacleGeometryType = ObstacleGeometry['type'];
export type GeographicVertex = readonly [longitude: number, latitude: number];

export const obstacleGeometryChoices = [
  { type: 'Point', id: 'point', label: 'Point', colorToken: '--color-radial-point' },
  { type: 'LineString', id: 'line', label: 'Line', colorToken: '--color-radial-line' },
  { type: 'Polygon', id: 'polygon', label: 'Polygon', colorToken: '--color-radial-polygon' },
] as const;

export type Obstacle =
    {
        id: string;
        type: string;
        description: string;
        height: number;
        gps_position: { lat: number; lng: number };
        timestamp: Date;
        obstacle_position: { lat: number; lng: number };
    }
