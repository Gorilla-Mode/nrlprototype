export interface TutorialEntry {
  id: string;
  header: string;
  question: string;
  answer: string;
}

export const tutorialBlocks: readonly TutorialEntry[] = [
  {
    id: 'placeholder-1',
    header: 'Placeholder 1 — Getting started',
    question: 'Where will the first tutorial question go?',
    answer: 'Placeholder answer. Replace this text with guidance for using the map.',
  },
  {
    id: 'placeholder-2',
    header: 'Placeholder 2 — Selecting an obstacle',
    question: 'Where will the next tutorial question go?',
    answer: 'Placeholder answer. Replace this text with guidance for selecting an obstacle.\nAdd more blocks as the tutorial grows.',
  },
];
