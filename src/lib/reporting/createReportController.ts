import { ObstacleType, type Obstacle, type ObstacleGeometry } from './obstacle.js';

type RequestPosition = (
  onSuccess: (position: GeolocationPosition) => void,
  onError: () => void,
) => void;

interface PendingReport {
  readonly id: string;
  readonly timestamp: Date;
  reporterPosition: Obstacle['gps_position'] | undefined;
  readonly positionReady: Promise<Obstacle['gps_position']>;
  readonly resolvePosition: (position: Obstacle['gps_position']) => void;
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
  onRegister: (obstacle: Obstacle, positionReady?: Promise<Obstacle['gps_position']>) => void;
  requestPosition?: RequestPosition;
  createId?: () => string;
  now?: () => Date;
}) {
  let pending: PendingReport | undefined;
  let destroyed = false;

  function registerIfReady() {
    if (!pending) return;
    const { reporterPosition, obstaclePosition } = pending;
    if (!obstaclePosition) return;
    const report = pending;
    if (reporterPosition !== undefined) pending = undefined;
    onRegister({
      id: report.id,
      type: ObstacleType.Other,
      description: '',
      height: 0,
      gps_position: reporterPosition ?? null,
      timestamp: report.timestamp,
      obstacle_position: obstaclePosition,
    }, reporterPosition === undefined ? report.positionReady : undefined);
  }

  function settleReporterPosition(report: PendingReport, position: Obstacle['gps_position']) {
    if (destroyed || pending !== report || report.reporterPosition !== undefined) return;
    report.reporterPosition = position;
    report.resolvePosition(position);
    if (report.obstaclePosition) pending = undefined;
  }

  function cancel() {
    const report = pending;
    pending = undefined;
    report?.resolvePosition(null);
  }

  return {
    start() {
      if (destroyed || pending) return;
      let resolvePosition!: PendingReport['resolvePosition'];
      const positionReady = new Promise<Obstacle['gps_position']>((resolve) => { resolvePosition = resolve; });
      const report: PendingReport = {
        id: createId(),
        timestamp: now(),
        reporterPosition: undefined,
        positionReady,
        resolvePosition,
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
    cancel,
    destroy() {
      if (destroyed) return;
      destroyed = true;
      cancel();
    },
  };
}

export type ReportController = ReturnType<typeof createReportController>;
