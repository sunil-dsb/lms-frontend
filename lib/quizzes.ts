// Mock quizzes lookup + helper for the centralised `quizzes` table.
// The wizard authors quiz questions locally in form state and, on save,
// calls `createQuiz()` to materialise a Quiz row in this store and
// stamp its id onto the procedure. Stage 3 (course creation) will write
// to the same store — that is the whole point of having one table:
// quizzes authored from any flow land in the same place.
//
// The backend will replace this file with a real `quizzes` Postgres
// table + service / controller / route. The wizard and reader components
// (`QuizEditor`, `QuizReader`) already work against the `Quiz` shape
// below, so the swap is API-only.

import type { ProcedureQuizQuestion } from "./types";

export interface Quiz {
  id: string;
  nameEn?: string;
  nameEs?: string;
  quizType?: string;
  /** Authoring payload — same shape as the legacy inline `ProcedureQuiz`
   *  so the existing `QuizEditor` + `QuizReader` components work
   *  unchanged. */
  questions: ProcedureQuizQuestion[];
  /** Manual attach toggle. Visibility on the read side is the OR of this
   *  flag and the parent procedure / course's training-attached flag. */
  attached: boolean;
  createdAt: string;
  updatedAt: string;
}

// ---------------------------------------------------------------------------
// Question banks for the three training-course seed quizzes. Lives here so
// mock-training.ts can reference the resulting `Quiz` rows by id without
// carrying the question payload inline.
// ---------------------------------------------------------------------------

const knifeQuizQuestions: ProcedureQuizQuestion[] = [
  {
    id: "kn-q1",
    prompt: {
      en: "A cook drops a knife on the floor. What is the correct action?",
      es: "A un cocinero se le cae un cuchillo al piso. ¿Cuál es la acción correcta?",
    },
    choices: [
      {
        id: "kn-q1-a",
        label: {
          en: "Try to catch it before it hits the floor.",
          es: "Intentar atraparlo antes de que caiga.",
        },
      },
      {
        id: "kn-q1-b",
        label: {
          en: "Step back. Do not try to catch it.",
          es: "Dar un paso atrás. No intentar atraparlo.",
        },
      },
      {
        id: "kn-q1-c",
        label: {
          en: "Pick it up immediately with a bare hand.",
          es: "Recogerlo inmediatamente con la mano desnuda.",
        },
      },
    ],
    correctChoiceId: "kn-q1-b",
  },
  {
    id: "kn-q2",
    prompt: {
      en: "How do you hand a knife to another cook?",
      es: "¿Cómo se le pasa un cuchillo a otro cocinero?",
    },
    choices: [
      {
        id: "kn-q2-a",
        label: {
          en: "Blade first, so they take the tip to control it.",
          es: "Primero el filo, así agarran la punta para controlarlo.",
        },
      },
      {
        id: "kn-q2-b",
        label: {
          en: 'Handle first, announce "Knife behind you".',
          es: 'Por el mango, diciendo "Cuchillo detrás de usted".',
        },
      },
      {
        id: "kn-q2-c",
        label: {
          en: "Lay it on a board and step aside.",
          es: "Ponerlo sobre una tabla y hacerse a un lado.",
        },
      },
    ],
    correctChoiceId: "kn-q2-b",
  },
];

const allergenQuizQuestions: ProcedureQuizQuestion[] = [
  {
    id: "al-q1",
    prompt: {
      en: "How many of the Big-9 allergens must you verify on every prep line?",
      es: "¿Cuántos de los nueve alérgenos principales debe verificar en cada línea de preparación?",
    },
    choices: [
      { id: "al-q1-a", label: { en: "Five", es: "Cinco" } },
      { id: "al-q1-b", label: { en: "All nine of them", es: "Los nueve" } },
      {
        id: "al-q1-c",
        label: {
          en: "Only the ones on the current ticket",
          es: "Solo los de la comanda actual",
        },
      },
    ],
    correctChoiceId: "al-q1-b",
  },
  {
    id: "al-q2",
    prompt: {
      en: "An allergen ticket and a regular ticket for the same table arrive together. What runs first?",
      es: "Una comanda con alérgenos y una regular del mismo cliente llegan juntas. ¿Cuál va primero?",
    },
    choices: [
      {
        id: "al-q2-a",
        label: {
          en: "The regular ticket. Speed matters.",
          es: "La regular. La velocidad importa.",
        },
      },
      {
        id: "al-q2-b",
        label: {
          en: "The allergen ticket, always.",
          es: "La de alérgenos, siempre.",
        },
      },
      {
        id: "al-q2-c",
        label: {
          en: "Whichever the manager picks.",
          es: "La que el gerente elija.",
        },
      },
    ],
    correctChoiceId: "al-q2-b",
  },
];

/** Initial quiz entries. The cleaning SOP ships with the original
 *  three-question food-safety quiz so the read side has something to
 *  render before the wizard authors its first new quiz. The three
 *  training-course quizzes back the stage-3 mock courses. */
export const SEED_QUIZZES: Quiz[] = [
  {
    id: "quiz-cleaning",
    questions: [
      {
        id: "seed-q1",
        prompt: {
          en: "What is the minimum sanitiser concentration for food-contact surfaces?",
          es: "¿Cuál es la concentración mínima de sanitizante para superficies en contacto con alimentos?",
        },
        choices: [
          {
            id: "c1",
            label: {
              en: "100 ppm for 10 seconds",
              es: "100 ppm por 10 segundos",
            },
          },
          {
            id: "c2",
            label: {
              en: "200 ppm for at least 30 seconds",
              es: "200 ppm por al menos 30 segundos",
            },
          },
          {
            id: "c3",
            label: { en: "400 ppm for 1 minute", es: "400 ppm por 1 minuto" },
          },
          {
            id: "c4",
            label: {
              en: "No test needed if the bottle is new",
              es: "No se necesita prueba si el frasco es nuevo",
            },
          },
        ],
        correctChoiceId: "c2",
      },
      {
        id: "seed-q2",
        prompt: {
          en: "How often must the Sanitise bucket be tested?",
          es: "¿Con qué frecuencia se debe probar la cubeta de desinfección?",
        },
        choices: [
          {
            id: "c1",
            label: { en: "Once per shift", es: "Una vez por turno" },
          },
          {
            id: "c2",
            label: {
              en: "Every 4 hours and whenever remade",
              es: "Cada 4 horas y cada vez que se rehace",
            },
          },
          {
            id: "c3",
            label: { en: "Once per week", es: "Una vez por semana" },
          },
          {
            id: "c4",
            label: {
              en: "Only when the water looks dirty",
              es: "Solo cuando el agua se ve sucia",
            },
          },
        ],
        correctChoiceId: "c2",
      },
      {
        id: "seed-q3",
        prompt: {
          en: "After sanitising, how should the surface be dried?",
          es: "Después de desinfectar, ¿cómo se debe secar la superficie?",
        },
        choices: [
          {
            id: "c1",
            label: {
              en: "Wipe with a clean towel",
              es: "Secar con un paño limpio",
            },
          },
          {
            id: "c2",
            label: {
              en: "Use paper towel and discard it",
              es: "Usar papel absorbente y desecharlo",
            },
          },
          {
            id: "c3",
            label: {
              en: "Let it air dry; do not towel it",
              es: "Dejar secar al aire; no usar paño",
            },
          },
          {
            id: "c4",
            label: {
              en: "Blow on it until dry",
              es: "Soplar hasta que se seque",
            },
          },
        ],
        correctChoiceId: "c3",
      },
    ],
    attached: true,
    createdAt: "2026-09-04T00:00:00Z",
    updatedAt: "2026-09-04T00:00:00Z",
  },
  {
    id: "quiz-handwashing",
    questions: [],
    attached: false,
    createdAt: "2026-08-12T00:00:00Z",
    updatedAt: "2026-08-12T00:00:00Z",
  },
  {
    id: "quiz-knife-safety",
    questions: knifeQuizQuestions,
    attached: true,
    createdAt: "2026-07-22T00:00:00Z",
    updatedAt: "2026-07-22T00:00:00Z",
  },
  {
    id: "quiz-allergen-awareness",
    questions: allergenQuizQuestions,
    attached: true,
    createdAt: "2026-06-04T00:00:00Z",
    updatedAt: "2026-06-04T00:00:00Z",
  },
];
