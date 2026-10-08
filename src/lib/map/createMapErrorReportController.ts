import type { Map } from 'maplibre-gl';
import type { GeographicVertex } from '../reporting/obstacle.js';
import { findObstacleInCircle, type RegisteredObstacle, type ScreenPoint } from '../obstacles/registeredObstacles.js';
import { obstacleMenuOuterRadius, type HoldMode } from './createMapDrawingInteraction.js';
import { positionHandleRadius } from './createPositionDragInteraction.js';

export interface ErrorReportTarget {
  center: ScreenPoint | null;
  match: RegisteredObstacle | null;
  position: GeographicVertex | null;
}

type ErrorReportMap = Pick<Map, 'getCanvas' | 'project' | 'unproject' | 'getPadding' | 'stop' | 'easeTo' | 'on' | 'off'>;

/** Owns geographic targeting for both the draggable circle and the fixed crosshair. */
export function createMapErrorReportController(map: ErrorReportMap, options: {
  onChange: (target: ErrorReportTarget) => void;
  onObstaclesChange: (obstacles: readonly RegisteredObstacle[] | null, selectedId: string | null) => void;
  onCorrectionChange: (origin: GeographicVertex | null, target: GeographicVertex | null) => void;
  onGesturesChange: (correcting: boolean, crosshair: boolean) => void;
  onCameraChange: () => void;
}) {
  const canvas = map.getCanvas();
  let holdMode: HoldMode = 'obstacle';
  let crosshair = false;
  let crosshairSize = 0;
  let obstacles: readonly RegisteredObstacle[] = [];
  let position: GeographicVertex | null = null;
  let correction: { origin: GeographicVertex; centerBefore: GeographicVertex | null } | null = null;
  let bottomInset = 0;
  let destroyed = false;

  function viewport() {
    if (destroyed || canvas.closest('[inert]')) return null;
    const { width, height } = canvas.getBoundingClientRect();
    return Number.isFinite(width) && Number.isFinite(height) && width > 0 && height > 0 ? { width, height } : null;
  }

  function project(vertex: GeographicVertex): ScreenPoint {
    const { x, y } = map.project([...vertex]);
    return { x, y };
  }

  function sync(): ErrorReportTarget {
    const size = viewport();
    let center: ScreenPoint | null = null;
    if (holdMode === 'error-report' && size) {
      if (crosshair) {
        center = { x: size.width / 2, y: size.height / 2 };
        const { lng, lat } = map.unproject([center.x, center.y]);
        position = [lng, lat];
      } else if (position) center = project(position);
    }
    const match = center && !correction && (!crosshair || crosshairSize > 0)
      ? findObstacleInCircle(center, obstacles, (obstacle) => project([obstacle.lng, obstacle.lat]),
        crosshair ? crosshairSize / 2 : obstacleMenuOuterRadius)
      : null;
    const target: ErrorReportTarget = { center, match, position: center && position ? [...position] : null };
    if (!destroyed) {
      options.onObstaclesChange(correction ? null : obstacles, match?.id ?? null);
      options.onCorrectionChange(correction?.origin ?? null, target.position);
      options.onChange(target);
    }
    return target;
  }

  function centerCrosshair(vertex: GeographicVertex) {
    if (!viewport()) return;
    options.onCameraChange();
    map.stop();
    // Offset from MapLibre's padded camera centre to the visible canvas midpoint.
    const { left = 0, right = 0, top = 0, bottom = 0 } = map.getPadding();
    map.easeTo({ center: [...vertex], offset: [(right - left) / 2, (bottom - top) / 2], duration: 0 });
  }

  function revealCircle() {
    const size = viewport();
    if (!size || crosshair || !correction || !position) return;
    const { x, y } = project(position);
    if (x < 0 || y < 0 || x > size.width || y > size.height - bottomInset - obstacleMenuOuterRadius) {
      options.onCameraChange();
      map.easeTo({ center: [...position], offset: [0, -bottomInset / 2] });
    }
  }

  function setHoldMode(mode: HoldMode) {
    if (destroyed || mode === holdMode) return;
    holdMode = mode;
    if (mode !== 'error-report') {
      position = null;
      correction = null;
      options.onGesturesChange(false, crosshair);
    }
    sync();
  }

  function moveCircle(x: number, y: number) {
    const size = viewport();
    if (!size || holdMode !== 'error-report' || crosshair) return;
    if (correction) {
      const maxX = Math.max(positionHandleRadius, size.width - positionHandleRadius);
      const maxY = Math.max(positionHandleRadius, size.height - bottomInset - obstacleMenuOuterRadius);
      x = Math.min(Math.max(x, positionHandleRadius), maxX);
      y = Math.min(Math.max(y, positionHandleRadius), maxY);
    }
    const { lng, lat } = map.unproject([x, y]);
    position = [lng, lat];
    sync();
  }

  map.on('move', sync);
  map.on('resize', sync);

  return {
    sync,
    setHoldMode,
    moveCircle,
    placeCircle(vertex: GeographicVertex) {
      if (destroyed || crosshair || correction || holdMode !== 'error-report' || !viewport()) return;
      position = [...vertex];
      sync();
    },
    isOnObstacle(center: ScreenPoint, radius: number) {
      return findObstacleInCircle(center, obstacles,
        (obstacle) => project([obstacle.lng, obstacle.lat]), radius) !== null;
    },
    getDragCenter: () => !crosshair && correction && position ? project(position) : null,
    setRegisteredObstacles(next: readonly RegisteredObstacle[]) {
      if (destroyed) return;
      obstacles = next;
      sync();
    },
    setCrosshairSize(size: number) {
      if (destroyed) return;
      crosshairSize = Number.isFinite(size) && size > 0 ? size : 0;
      sync();
    },
    setCrosshairMode(enabled: boolean) {
      if (destroyed || enabled === crosshair) return;
      // Preserve only an active correction candidate when leaving crosshair input.
      if (crosshair && correction) sync();
      const candidate: GeographicVertex | null = position ? [...position] : null;
      crosshair = enabled;
      if (!crosshair) {
        if (correction) correction.centerBefore = null;
        else position = null;
      }
      options.onGesturesChange(!!correction, crosshair);
      if (crosshair && correction && candidate) centerCrosshair(candidate);
      else revealCircle();
      sync();
    },
    sample(): ErrorReportTarget {
      if (holdMode === 'error-report' && viewport()) map.stop();
      return sync();
    },
    startPositionCorrection(origin: GeographicVertex, start: GeographicVertex) {
      if (!viewport() || holdMode !== 'error-report') return;
      correction = { origin: [...origin], centerBefore: correction ? correction.centerBefore : !crosshair && position ? [...position] : null };
      position = [...start];
      options.onGesturesChange(true, crosshair);
      if (crosshair) centerCrosshair(start);
      else revealCircle();
      sync();
    },
    endPositionCorrection() {
      if (destroyed || !correction) return;
      position = correction.centerBefore;
      correction = null;
      options.onGesturesChange(false, crosshair);
      sync();
    },
    setBottomInset(pixels: number) {
      if (destroyed) return;
      bottomInset = Number.isFinite(pixels) ? Math.max(0, pixels) : 0;
      revealCircle();
      sync();
    },
    destroy() {
      if (destroyed) return;
      destroyed = true;
      map.off('move', sync);
      map.off('resize', sync);
    },
  };
}
