export interface TutorialEntry {
  id: string;
  header: string;
  question: string;
  answer: string;
}

export function isTutorialEnabled(search: string, debug: boolean): boolean {
  return debug && new URLSearchParams(search).get('help') === '1';
}

export const tutorialBlocks: readonly TutorialEntry[] = [
  {
    id: 'report-obstacle',
    header: 'Getting started — Reporting an obstacle',
    question: 'How do I report an obstacle on the map?',
    answer: 'Press and hold on the map to open the obstacle menu, then choose Point, Line or Area. Tap the map to add points, and use Complete selection once the shape looks right. You can Undo the last point or Delete the selection at any time.',
  },
  {
    id: 'obstacle-details',
    header: 'Adding the details',
    question: 'What happens after I complete the shape?',
    answer: 'You are guided through the remaining details for the obstacle, such as height, type and photos. You can save the report as a draft at any point and finish it later.',
  },
  {
    id: 'find-reports',
    header: 'Finding your reports',
    question: 'Where do I see the reports I have submitted or saved?',
    answer: 'Tap Reports in the top bar. From there you can filter by status — Draft, Ready to send, Awaiting review or Reviewed — and open any report to continue or review it.',
  },
  {
    id: 'more-help',
    header: 'Need more help?',
    question: 'What if this tutorial does not answer my question?',
    answer: 'Open Menu and select FAQ for more detailed guidance.',
  },
];
