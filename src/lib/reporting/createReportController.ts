import { ObstacleType, type Obstacle, type ObstacleGeometry } from './obstacle.js';

type RequestPosition = (
  onSuccess: (position: GeolocationPosition) => void,
  onError: () => void,
) => void;

interface PendingReport {
  readonly id: string;
  readonly timestamp: Date;
  reporterPosition: Obstacle['gps_position'] | undefined;
  obstaclePosition: ObstacleGeometry | undefined;
}

const positionOptions: PositionOptions = { enableHighAccuracy: true, timeout: 10000 };

function requestReporterPosition(onSuccess: PositionCallback, onError: () => void) {
  if (typeof window === 'undefined' || !window.isSecureContext ||
    typeof navigator === 'undefined' || !navigator.geolocation) {
    onError();
    return;
  }

  try {
    navigator.geolocation.getCurrentPosition(onSuccess, onError, positionOptions);
  } catch {
    onError();
  }
}

export function createReportController({
  onRegister,
  requestPosition = requestReporterPosition,
  createId = () => crypto.randomUUID(),
  now = () => new Date(),
}: {
  onRegister: (obstacle: Obstacle) => void;
  requestPosition?: RequestPosition;
  createId?: () => string;
  now?: () => Date;
}) {
  let pending: PendingReport | undefined;
  let destroyed = false;

  function registerIfReady() {
    if (!pending) return;
    const { reporterPosition, obstaclePosition } = pending;
    if (reporterPosition === undefined || !obstaclePosition) return;
    const report = pending;
    pending = undefined;
    onRegister({
      id: report.id,
      type: ObstacleType.Other,
      description: '',
      height: 0,
      gps_position: reporterPosition,
      timestamp: report.timestamp,
      obstacle_position: obstaclePosition,
    });
  }

  function settleReporterPosition(report: PendingReport, position: Obstacle['gps_position']) {
    if (destroyed || pending !== report) return;
    report.reporterPosition = position;
    registerIfReady();
  }

  return {
    start() {
      if (destroyed || pending) return;
      const report: PendingReport = {
        id: createId(),
        timestamp: now(),
        reporterPosition: undefined,
        obstaclePosition: undefined,
      };
      pending = report;
      try {
        requestPosition(
          ({ coords }) => settleReporterPosition(report, { lat: coords.latitude, lng: coords.longitude }),
          () => settleReporterPosition(report, null),
        );
      } catch {
        settleReporterPosition(report, null);
      }
    },
    complete(geometry: ObstacleGeometry) {
      if (destroyed || !pending || pending.obstaclePosition) return;
      pending.obstaclePosition = geometry;
      registerIfReady();
    },
    cancel() {
      pending = undefined;
    },
    destroy() {
      if (destroyed) return;
      destroyed = true;
      pending = undefined;
    },
  };
}

export type ReportController = ReturnType<typeof createReportController>;
