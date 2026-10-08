import { mockObstacles } from './mockObstacles.js';
import { fireStationAttribution, loadFireStationObstacles } from './fireStations.js';

/** true: DSB fire stations stand in for obstacles (many real points). false: mockObstacles. */
export const USE_REAL_DATA = true;

/** Source credit for the map; only real data needs one. */
export const registeredObstacleAttribution = USE_REAL_DATA ? fireStationAttribution : undefined;

export type RegisteredObstacleType = 'Mast' | 'Wind turbine' | 'Crane' | 'Building' | 'Tower';

/** An obstacle already in the register; distinct from the new-report `Obstacle`. */
export interface RegisteredObstacle {
  id: string;
  /** Optional display name, e.g. a fire station standing in for an obstacle. */
  name?: string;
  type: RegisteredObstacleType;
  heightM: number;
  lit: boolean;
  lat: number;
  lng: number;
}

export interface ScreenPoint {
  x: number;
  y: number;
}

/** The single data boundary; replace the body with an API request when one exists. */
export async function loadRegisteredObstacles(useRealData = USE_REAL_DATA): Promise<RegisteredObstacle[]> {
  if (useRealData) {
    try {
      return await loadFireStationObstacles();
    } catch (error) {
      // The prototype stays usable offline or without the data file.
      console.warn('Falling back to mock obstacles:', error);
    }
  }
  return mockObstacles.map((obstacle) => ({ ...obstacle }));
}

/** Nearest obstacle to the circle centre whose projected position lies within the radius. */
export function findObstacleInCircle(
  center: ScreenPoint,
  obstacles: readonly RegisteredObstacle[],
  project: (obstacle: RegisteredObstacle) => ScreenPoint,
  radius: number,
): RegisteredObstacle | null {
  let nearest: RegisteredObstacle | null = null;
  let nearestDistance = Infinity;
  for (const obstacle of obstacles) {
    const { x, y } = project(obstacle);
    const distance = Math.hypot(x - center.x, y - center.y);
    if (distance <= radius && distance < nearestDistance) {
      nearest = obstacle;
      nearestDistance = distance;
    }
  }
  return nearest;
}
