export interface FaqQuestion {
  id: string;
  question: string;
  answer: string;
  note?: string;
  link?: string;
}

export interface FaqSection {
  title: string;
  questions: readonly FaqQuestion[];
}

export const faqSections: readonly FaqSection[] = [
  {
    title: 'COMMON QUESTIONS',
    questions: [
      {
        id: 'possible-obstacle',
        question: 'What should I do if I see a possible obstacle?',
        answer: 'If it is safe to use the app, open New report from the map. Choose Point, Line or Area, place or draw the geometry, add the information you know, review the observation and submit it for registrar review.',
        link: 'View the full reporting guide',
      },
      {
        id: 'direct-nrl',
        question: 'Does my submission go directly to NRL?',
        answer: 'No. This app lets pilots submit obstacle observations to a registrar. The registrar reviews the observation and decides how it should be handled. A pilot submission is not a formal owner report sent directly to NRL.',
      },
      {
        id: 'geometry',
        question: 'Which geometry should I choose?',
        answer: 'Use Point for one compact obstacle. Use Line for an airspan, cable or another long obstacle. Use Area when the obstacle covers a larger surface.',
        link: 'View drawing instructions',
      },
    ],
  },
  {
    title: 'MAP AND REPORT DETAILS',
    questions: [
      {
        id: 'details',
        question: 'What if I do not know all the details?',
        answer: 'Provide the information you have. Required fields are clearly marked. Select Not sure for illumination when appropriate, and add a note or photo when it can help explain the observation. You can save the report as a draft and complete it later.',
      },
      {
        id: 'accuracy',
        question: 'How accurately should I place the obstacle?',
        answer: 'Place the geometry as accurately as possible. Check the location accuracy before using your current position and verify the location against the available map layers. You can adjust the geometry before confirming it.',
      },
      {
        id: 'photo',
        question: 'Should I add a photo?',
        answer: 'Add a photo when it can help the registrar identify the obstacle or verify its location, condition or illumination. You can preview or replace the photo before continuing. Only take a photo when it is safe to do so.',
      },
    ],
  },
  {
    title: 'DRAFTS AND REVIEW',
    questions: [
      {
        id: 'save-draft',
        question: 'Can I save an observation and continue later?',
        answer: 'Yes. After the geometry is confirmed, the report is saved as a draft. Open My reports and select My drafts to continue.',
        note: 'Saved on this device means that the report is stored locally and has not been submitted.',
      },
      {
        id: 'after-submit',
        question: 'What happens after I submit an observation?',
        answer: 'The observation is sent to a registrar for review. The registrar may request more information, add it to the register, mark it as a duplicate, or close it without adding it. Follow the outcome in My reports. Submission does not mean that the observation is already available in HemsWX.',
      },
      {
        id: 'labels',
        question: 'What do the report labels mean?',
        answer: 'Draft means the report has not been submitted. Saved on this device means it is stored locally only. Submitted means it has been sent to a registrar for review. Needs information means the registrar has asked you to update the report.',
      },
    ],
  },
  {
    title: 'TROUBLESHOOTING',
    questions: [
      {
        id: 'cannot-submit',
        question: "Why can't I submit my observation?",
        answer: 'Check that the drawing is finished, all required fields are completed and the device has an internet connection. Missing or invalid information will be highlighted in the report.',
        link: 'Contact support',
      },
    ],
  },
];

export function filterFaq(query: string): FaqSection[] {
  const search = query.toLowerCase();
  return faqSections.map(section => ({
    ...section,
    questions: section.questions.filter(question =>
      [question.question, question.answer, question.note ?? ''].some(text => text.toLowerCase().includes(search))),
  })).filter(section => section.questions.length > 0);
}
