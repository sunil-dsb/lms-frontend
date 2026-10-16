// Mock training-courses lookup for the wizard's "Training & Quiz" step.
// Stage 3 will replace this with a real `training_courses` table +
// services / controller / route. For now we keep the lookup in-process
// and seed three representative courses so the picker renders something
// the admin can actually choose.

export interface TrainingCourse {
  id: string;
  nameEn: string;
  nameEs: string;
  /** Short blurb shown under the course name in the picker. */
  descriptionEn: string;
  descriptionEs: string;
  createdAt: string;
}

const SEED_TRAINING_COURSES: TrainingCourse[] = [
  {
    id: "course-food-safety",
    nameEn: "Food Safety Foundations",
    nameEs: "Fundamentos de Inocuidad Alimentaria",
    descriptionEn:
      "Required for every back-of-house role. Covers cleaning, sanitising, and personal hygiene.",
    descriptionEs:
      "Obligatorio para todo el personal de cocina. Cubre limpieza, desinfección e higiene personal.",
    createdAt: "2026-08-15T00:00:00Z",
  },
  {
    id: "course-kitchen-ops",
    nameEn: "Kitchen Operations",
    nameEs: "Operaciones de Cocina",
    descriptionEn:
      "Opening / closing procedures, station safety, and equipment logs.",
    descriptionEs:
      "Procedimientos de apertura y cierre, seguridad de estación y registros de equipo.",
    createdAt: "2026-08-20T00:00:00Z",
  },
  {
    id: "course-recipes",
    nameEn: "Core Recipes",
    nameEs: "Recetas Principales",
    descriptionEn:
      "Standard recipes for house-made sauces, marinades, and batch prep.",
    descriptionEs:
      "Recetas estándar de salsas, adobos y preparación por lotes.",
    createdAt: "2026-08-25T00:00:00Z",
  },
];

const STORE_KEY = "lms_demo_training-courses";

function loadCourses(): TrainingCourse[] {
  if (typeof window === "undefined") return SEED_TRAINING_COURSES;
  const raw = window.localStorage.getItem(STORE_KEY);
  if (!raw) {
    window.localStorage.setItem(
      STORE_KEY,
      JSON.stringify(SEED_TRAINING_COURSES),
    );
    return SEED_TRAINING_COURSES;
  }
  try {
    return JSON.parse(raw) as TrainingCourse[];
  } catch {
    return SEED_TRAINING_COURSES;
  }
}

/** Return every training course the picker can offer. The wizard reads
 *  this list once on mount; stage 3 replaces the implementation with
 *  `GET /api/admin/training/courses`. */
export async function listTrainingCourses(): Promise<{
  courses: TrainingCourse[];
}> {
  return { courses: loadCourses() };
}
