import type { LineString, Point, Polygon } from 'geojson';

/** Geometry only; reporting metadata is collected in a later step. */
export type ObstacleGeometry = Point | LineString | Polygon;
export type ObstacleGeometryType = ObstacleGeometry['type'];
export type GeographicVertex = readonly [longitude: number, latitude: number];

export const obstacleGeometryChoices = [
  { type: 'Point', id: 'point', label: 'Point', colorToken: '--color-map-point' },
  { type: 'LineString', id: 'line', label: 'Line', colorToken: '--color-map-line' },
  { type: 'Polygon', id: 'polygon', label: 'Polygon', colorToken: '--color-map-area' },
] as const;

export enum ObstacleType {
  AerialSpan = 'aerial_span',
  PoleTower = 'pole_tower',
  Building = 'building',
  Construction = 'construction',
  Bridge = 'bridge',
  Other = 'other',
}

export const obstacleTypeChoices = [
  { type: ObstacleType.AerialSpan, id: 'aerial-span', label: 'Aerial Span', iconKey: 'aerial-span' },
  { type: ObstacleType.PoleTower, id: 'pole-tower', label: 'Pole/Tower', iconKey: 'pole-tower' },
  { type: ObstacleType.Building, id: 'building', label: 'Building', iconKey: 'building' },
  { type: ObstacleType.Construction, id: 'construction', label: 'Construction', iconKey: 'construction' },
  { type: ObstacleType.Bridge, id: 'bridge', label: 'Bridge', iconKey: 'bridge' },
  { type: ObstacleType.Other, id: 'other', label: 'Other', iconKey: 'other' },
] as const;

export interface Obstacle {
  id: string;
  type: ObstacleType;
  description: string;
  height: number;
  gps_position: { lat: number; lng: number } | null;
  timestamp: Date;
  obstacle_position: ObstacleGeometry;
}
