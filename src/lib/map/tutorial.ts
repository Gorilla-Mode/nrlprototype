export const reportingGuideRoute = '#/Help/ReportObstacle';

/**
 * Zero-based index of the step the reader has reached: the last section whose top has
 * scrolled to within `threshold` CSS px of the app bar's bottom edge. Reaching the end of
 * the page completes the progress even when the final section is too short to get there.
 */
export function guideProgressStep(sectionTops: readonly number[], threshold: number, atEnd: boolean): number {
  if (sectionTops.length === 0) return 0;
  if (atEnd) return sectionTops.length - 1;
  let reached = 0;
  sectionTops.forEach((top, index) => { if (top <= threshold) reached = index; });
  return reached;
}
