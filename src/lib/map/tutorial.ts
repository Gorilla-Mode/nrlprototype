import type { PlacementEditingVariantId } from './placementEditing.js';

export interface TutorialEntry {
  id: string;
  header: string;
  question: string;
  answer: string;
}

export const reportingGuideRoute = '#/Help/ReportObstacle';

export function reportingGuideBlocks(variant: PlacementEditingVariantId): readonly TutorialEntry[] {
  const placement = variant === 'persistent-donut'
    ? 'Press and hold on the map to open the donut. Releasing keeps it open. Drag its center to move placement, tap the center to cancel, or tap a sector to choose Point, Line or Polygon. With the donut focused, arrows move its center, Shift moves faster, 1/2/3 choose Point/Line/Polygon, and Escape cancels.'
    : variant === 'two-finger'
      ? 'Press and hold on the map to open the donut. Keep holding, move into a Point, Line or Polygon sector, and release to choose it. A second finger lets you pan the map beneath the fixed donut; lift the second finger before choosing a sector. Lifting the original finger first cancels.'
      : 'Press and hold on the map to open the donut. Move into a Point, Line or Polygon sector, and release to choose it. Release in the center or press Escape to cancel.';
  const crosshairEditing = 'In crosshair mode, lighter dotted edges preview placement and a black line and ring identify the nearest placed point. Edit locks that point; its ring stays at the original position and an arrow points toward the crosshair. Move the map to preview a new position and choose Place point to confirm, or Cancel/Escape to discard. The original geometry stays visible until confirmation. Undo and Complete are unavailable while editing; Delete remains available. Switching crosshair off or leaving the map cancels the move. Undo reverses additions and confirmed moves in order, including moves of the initial point. Unchanged and cancelled moves add no Undo entry. Invalid moves are allowed, but Complete stays unavailable until the shape is valid. ';
  const editing = crosshairEditing + (variant === 'default'
    ? 'With crosshair off, use Undo to reverse the last addition or crosshair move. Delete discards the whole selection. The initial point cannot be undone; delete the selection to start again.'
    : (variant === 'two-finger'
      ? 'With crosshair off, drag a placed point to edit it immediately.'
      : 'With crosshair off, hold a placed point for 100 ms with touch, or 200 ms with a mouse or pen, then drag to edit it. Moving more than 8 px before the delay keeps map navigation available.') +
      ' Touch targets are 72 px across; mouse and pen targets are 44 px. The closest point is selected, with point order breaking ties. Focus a point and use arrow keys to move it; Shift moves faster and Escape cancels the current move. Undo reverses additions and committed moves in order, including a move of the initial point. Delete discards the selection.');
  return [
    { id: 'report-obstacle', header: 'Choosing placement', question: 'How do I choose geometry with the donut?', answer: placement },
    { id: 'crosshair', header: 'Using the crosshair', question: 'How do I place an obstacle at the map center?',
      answer: 'Turn on the crosshair using the right-side map button. Choose Point, Line or Polygon in the bottom picker, move the map to aim at the obstacle, and select Report obstacle. For Line or Polygon, move the map and use Add point for each vertex. Map taps and holds navigate in this mode. Switching the crosshair off keeps the selection and restores map placement.' },
    { id: 'editing', header: 'Editing the selection', question: 'How do I adjust or remove placed points?', answer: editing },
    { id: 'completion', header: 'Completing geometry', question: 'When can I open the report form?',
      answer: (variant === 'basic'
        ? 'Basic keeps Point editable until you choose Complete (or Complete selection). A Point has one vertex and cannot use Add point; crosshair mode still offers Edit and Cancel/Place point. '
        : 'Choosing Point opens the report form immediately. ') +
        'For Line and Polygon, tap the map to add vertices when the crosshair is off. A Line needs at least two distinct points; a Polygon needs at least three and its edges must not cross. Complete becomes available when geometry is valid. Completion locks placement and opens details; it does not submit or save a report.' },
    { id: 'obstacle-details', header: 'Details and session drafts', question: 'What happens when I save or finish?',
      answer: 'Enter the obstacle details in the report form. Close or Save Draft returns to the map with Resume details. Delete discards the active draft. Finish clears the selection and shows a session-only summary. This prototype has no submission endpoint or durable draft storage: reloading loses the draft and result. These actions do not update the sample Reports or Draft lists.' },
  ];
}

export const tutorialBlocks = reportingGuideBlocks('default');
