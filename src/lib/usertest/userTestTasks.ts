export interface UserTestTaskSection {
  heading: string;
  steps: readonly string[];
  note?: string;
}

export interface UserTestTask {
  id: string;
  title: string;
  sections: readonly UserTestTaskSection[];
}

/** Step numbers run through the whole task, so each section continues where the previous ended. */
export function sectionStart(task: UserTestTask, sectionIndex: number): number {
  return task.sections.slice(0, sectionIndex).reduce((count, section) => count + section.steps.length, 1);
}

export const userTestTasks: readonly UserTestTask[] = [
  {
    id: 'move-point',
    title: 'Oppgave 1: Flytt punktet etter at det er registrert',
    sections: [
      {
        heading: 'Registrer punktet',
        steps: [
          'Trykk med én finger på kartet der hinderet står, og hold fingeren nede. Doughnut-menyen kommer opp.',
          'Dra fingeren ut mot den hindertypen du vil registrere, uten å løfte den fra skjermen. Hindertypen du drar mot, blir utvidet i doughnut-menyen.',
          'Slipp fingeren på “point” Nå vises et punkt på kartet.',
        ],
      },
      {
        heading: 'Flytt punktet',
        steps: [
          'Trykk på punktet som ble opprettet, og hold fingeren nede.',
          'Dra punktet dit du vil ha det, mens du fortsatt holder fingeren nede.',
          'Slipp fingeren når punktet står på riktig sted.',
        ],
      },
      {
        heading: 'Avslutt oppgaven',
        steps: ['Trykk “delete”. Da er oppgaven fullført.'],
      },
    ],
  },
  {
    id: 'persistent-donut',
    title: 'Oppgave 2: Flytt punktet med doughnut-menyen',
    sections: [
      {
        heading: 'Få opp doughnut-menyen',
        steps: [
          'Hold med én finger på kartet. Doughnut-menyen kommer opp.',
          'Slipp fingeren. Doughnut-menyen blir stående oppe selv om du slipper.',
        ],
      },
      {
        heading: 'Flytt til riktig sted',
        steps: [
          'Hold fingeren nede i midten av doughnut-menyen og dra. Kartet beveger seg i bakgrunnen slik at du kan navigere dit hinderet skal registreres.',
          'Du kan slippe fingeren underveis. Doughnut-menyen forsvinner ikke, og du kan holde i midten igjen for å navigere videre',
        ],
        note: 'Et kort trykk i midten av doughnut-menyen lukker den. Hvis det skjer, trykker du på kartet igjen for å få den opp.',
      },
      {
        heading: 'Registrer hinderet',
        steps: [
          'Trykk på den hindertypen du vil registrere, i doughnut-menyen.',
          'Trykk på «Punkt». Punktet er registrert.',
          'Trykk “delete”. Oppgaven er fullført.',
        ],
      },
    ],
  },
  {
    id: 'two-finger',
    title: 'Oppgave 3: Flytt doughnut-menyen med to fingre',
    sections: [
      {
        heading: 'Få opp doughnut-menyen',
        steps: [
          'Trykk med én finger på kartet, og hold den nede. Doughnut-menyen kommer opp.',
          'Hold denne fingeren nede hele veien, helt til du har valgt hinder.',
        ],
      },
      {
        heading: 'Flytt til riktig sted',
        steps: [
          'Sett en finger til på kartet, mens den første fortsatt holdes nede.',
          'Flytt begge fingrene for å navigere dit du vil plassere hinderet.',
          'Løft den andre fingeren når du er på riktig sted. Den første fingeren, den som fikk opp doughnut-menyen, skal fortsatt være nede.',
        ],
      },
      {
        heading: 'Registrer hinderet',
        steps: [
          'Dra den første fingeren ut mot det hinderet du vil registrere. Hinderet du drar mot, blir utvidet i doughnut-menyen. I denne oppgaven velger du «Punkt».',
          'Slipp fingeren når «Punkt» er utvidet. Nå vises et punkt på kartet.',
        ],
      },
      {
        heading: 'Avslutt oppgaven',
        steps: [
          '«New obstacle report» kommer opp. Trykk på krysset (X) for å lukke den.',
          'Trykk på «Delete». Da er oppgaven fullført.',
        ],
      },
    ],
  },
];
