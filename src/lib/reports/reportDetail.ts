import { errorReportHeading } from '../obstacles/errorReport.js';
import { obstacleTypeLabel } from '../reporting/obstacle.js';
import { currentPlaceName, placeLabel } from './placeName.js';
import { coordinateLabel } from './reportGeometry.js';
import { newObstacleTitle, type Report } from './reportsData.js';

/** The report detail page (Ready to send and sent): title, location line and map viewer text. */

/** "New obstacle · Sandviken, Bergen" from the list's place source; error reports keep their heading. */
export function reportDetailTitle(report: Report): string {
  if (report.errorReport) return errorReportHeading(report.errorReport);
  const place = placeLabel(report.place, report.geometry);
  return place ? `New obstacle · ${place}` : newObstacleTitle(report.obstacleType, report.heightMeters);
}

/** The place name for this location, or null until one has been looked up. */
export function reportPlaceName(report: Report): string | null {
  return currentPlaceName(report.place, report.geometry);
}

/** "Near Sandviken, Bergen · 60.4054° N, 5.3235° E", or only the coordinates without a place. */
export function locationLine(report: Report): string {
  const coordinates = coordinateLabel(report.geometry) ?? 'Location not set';
  const place = reportPlaceName(report);
  return place ? `Near ${place} · ${coordinates}` : coordinates;
}

/** What the read-only map viewer says: place, then report type, obstacle and coordinates, and that it is view only. */
export function mapViewerText(report: Report): { title: string; subtitle: string; note: string } {
  const coordinates = coordinateLabel(report.geometry) ?? 'Location not set';
  const record = report.errorReport;
  const obstacle = record
    ? `Error report · ${record.obstacle.type} · ${record.obstacle.heightM} m`
    : `New obstacle · ${obstacleTypeLabel(report.obstacleType)} · ${report.heightMeters} m`;
  return {
    title: reportPlaceName(report) ?? coordinates,
    subtitle: `${obstacle} · ${coordinates}`,
    note: 'View only. To move the point, close the map and choose Edit report.',
  };
}
