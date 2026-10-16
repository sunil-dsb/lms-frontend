import type { Procedure, TrainingAssignment } from "./types";

export interface CourseChapter {
  id: string;
  number: number;
  title: string;
  subtitle: string;
  status: "complete" | "active" | "locked";
}

export interface LinkedProcedureInfo {
  title: string;
  href: string;
}

export interface CourseChaptersViewData {
  courseId: string;
  title: string;
  purpose: string;
  progressPercent: number;
  chapters: CourseChapter[];
  nextChapterNumber: number | null;
  linkedProcedure: LinkedProcedureInfo | null;
  allComplete: boolean;
}

export interface ChapterProcedureData {
  titleEn: string;
  titleEs: string;
  metrics?: { label: string; value: string }[];
  ingredients?: { name: string; qty: string; isAllergen?: boolean }[];
  steps?: { en: string; es: string }[];
  slug?: string;
}

interface ChapterDefinition {
  id: string;
  number: number;
  titleEn: string;
  titleEs: string;
  contentEn: string;
  contentEs: string;
  quizPassedTextEn?: string;
  quizPassedTextEs?: string;
  procedureData?: ChapterProcedureData;
}

const COURSE_CHAPTER_REGISTRY: Record<
  string,
  {
    chapters: ChapterDefinition[];
    linkedProcedure?: {
      titleEn: string;
      titleEs: string;
      hrefSlug: string;
    };
  }
> = {
  // Orientation (course-004) - Matches reference specification
  "course-004": {
    chapters: [
      {
        id: "ch-welcome",
        number: 1,
        titleEn: "Welcome to Alimentaria",
        titleEs: "Bienvenido a Alimentaria",
        contentEn: "Guide and culture overview",
        contentEs: "Guía y resumen de cultura",
        quizPassedTextEn: "Quiz passed · 3 of 3 correct",
        quizPassedTextEs: "Cuestionario aprobado · 3 de 3 correctas",
      },
      {
        id: "ch-kitchen-safety",
        number: 2,
        titleEn: "Kitchen safety and hygiene",
        titleEs: "Seguridad e higiene en cocina",
        contentEn: "Video, guide and quiz",
        contentEs: "Video, guía y cuestionario",
        procedureData: {
          titleEn: "Food Safety & Hand Hygiene SOP",
          titleEs: "POE Inocuidad e higiene de manos",
          metrics: [
            { label: "Target temp", value: "≥ 100°F (38°C)" },
            { label: "Scrub duration", value: "20 seconds" },
            { label: "Verification", value: "Station entry" },
            { label: "Standard", value: "HACCP compliant" },
          ],
          ingredients: [
            { name: "Antibacterial hand soap", qty: "2 pumps" },
            { name: "Single-use paper towels", qty: "2 sheets" },
            {
              name: "Disposable nitrile gloves",
              qty: "1 pair",
              isAllergen: false,
            },
          ],
          steps: [
            {
              en: "Wet hands with warm running water (≥ 100°F / 38°C).",
              es: "Mójate las manos con agua tibia corriente (≥ 38°C).",
            },
            {
              en: "Apply soap and scrub vigorously for at least 20 seconds, including between fingers and forearms.",
              es: "Aplica jabón y frota vigorosamente durante al menos 20 segundos, incluidos dedos y antebrazos.",
            },
            {
              en: "Rinse thoroughly under clean running water, letting water drain towards fingertips.",
              es: "Enjuaga bien con agua corriente limpia, dejando que el agua corra hacia la punta de los dedos.",
            },
            {
              en: "Dry completely with a clean single-use paper towel and discard.",
              es: "Sécate completamente con papel toalla desechable limpio y descártalo.",
            },
          ],
          slug: "handwashing-glove-protocol",
        },
      },
      {
        id: "ch-first-week",
        number: 3,
        titleEn: "Your first week",
        titleEs: "Tu primera semana",
        contentEn: "Expectations, uniform and conduct",
        contentEs: "Expectativas, uniforme y conducta",
      },
    ],
    linkedProcedure: {
      titleEn: "Handwashing SOP",
      titleEs: "POE Lavado de manos",
      hrefSlug: "handwashing-glove-protocol",
    },
  },
  // Knife safety fundamentals (course-002)
  "course-002": {
    chapters: [
      {
        id: "ch-knife-grip",
        number: 1,
        titleEn: "Knife handling and pinch grip",
        titleEs: "Manejo del cuchillo y agarre de pinza",
        contentEn: "Video, technique and linked procedure",
        contentEs: "Video, técnica y procedimiento vinculado",
        quizPassedTextEn: "Checklist completed",
        quizPassedTextEs: "Lista de verificación completada",
        procedureData: {
          titleEn: "Pinch Grip & Cutting Technique Standard",
          titleEs: "Norma de agarre de pinza y técnica de corte",
          metrics: [
            { label: "Grip style", value: "Thumb & index pinch" },
            { label: "Off-hand", value: "Curled claw" },
            { label: "Board base", value: "Damp towel" },
            { label: "Motion", value: "Rocking cut" },
          ],
          ingredients: [
            { name: "Chef knife 8-inch (20cm)", qty: "1 unit" },
            { name: "High-density cutting board", qty: "1 board" },
            { name: "Non-slip mat / damp towel", qty: "1 underlay" },
          ],
          steps: [
            {
              en: "Pinch the blade at the bolster firmly between thumb and index finger.",
              es: "Sujeta la hoja en la virola firmemente entre el pulgar y el dedo índice.",
            },
            {
              en: "Wrap remaining three fingers around the handle for balance and directional control.",
              es: "Envuelve los tres dedos restantes alrededor del mango para balance y control.",
            },
            {
              en: "Form a protective 'claw' with guiding hand, tucking fingertips safely inward.",
              es: "Forma una 'garra' protectora con la mano guía, metiendo las puntas de los dedos.",
            },
            {
              en: "Cut in a smooth rolling motion, never sawing or lifting knife above hand height.",
              es: "Corta con un movimiento rodante suave, nunca serruchando ni levantando el cuchillo por encima de la mano.",
            },
          ],
          slug: "knife-safety-fundamentals",
        },
      },
      {
        id: "ch-knife-rules",
        number: 2,
        titleEn: "Carry and pass rules (Critical)",
        titleEs: "Reglas de transporte y entrega (Crítico)",
        contentEn: "Guide, safety rules and linked procedure",
        contentEs: "Guía, reglas de seguridad y procedimiento vinculado",
        quizPassedTextEn: "Quiz passed · 2 of 2 correct",
        quizPassedTextEs: "Cuestionario aprobado · 2 de 2 correctas",
        procedureData: {
          titleEn: "Knife Carry & Station Transfer Standard",
          titleEs: "Norma de transporte y transferencia de cuchillos",
          metrics: [
            { label: "Carry position", value: "Tip down at side" },
            { label: "Transfer rule", value: "Board-to-board" },
            { label: "Verbal call", value: "'Knife behind'" },
            { label: "Speed limit", value: "Walk only" },
          ],
          ingredients: [
            { name: "Station chef knife", qty: "1 unit" },
            { name: "Clean station prep board", qty: "1 unit" },
          ],
          steps: [
            {
              en: "Hold the knife firmly by the handle with the blade against your outer leg and tip pointing directly at the floor.",
              es: "Sostén el cuchillo firmemente por el mango con la hoja junto a tu pierna exterior y la punta apuntando al piso.",
            },
            {
              en: "Call out loud and clear whenever navigating near peers: 'Sharp knife behind' or 'Knife moving'.",
              es: "Avisa fuerte y claro cuando te desplaces cerca de compañeros: 'Cuchillo detrás' o 'Cuchillo pasando'.",
            },
            {
              en: "Never pass a knife directly hand-to-hand. Place it flat on a sanitized board with the handle facing the receiver.",
              es: "Nunca entregues un cuchillo de mano en mano. Colócalo plano sobre una tabla sanitizada con el mango hacia la persona.",
            },
            {
              en: "Wait for the receiving cook to verbally acknowledge ('Got it') before removing your attention.",
              es: "Espera a que el cocinero confirme verbalmente ('Recibido') antes de retirar tu atención.",
            },
          ],
          slug: "knife-safety-fundamentals",
        },
      },
      {
        id: "ch-knife-storage",
        number: 3,
        titleEn: "Blade sanitizing and storage",
        titleEs: "Desinfección de hojas y guardado",
        contentEn: "Sanitation guide and linked procedure",
        contentEs: "Guía de desinfección y procedimiento vinculado",
        procedureData: {
          titleEn: "Knife Sharpening & Honing SOP",
          titleEs: "POE Afilado y mantenimiento de cuchillo",
          metrics: [
            { label: "Rod angle", value: "20°" },
            { label: "Frequency", value: "Every shift" },
            { label: "Whetstone grit", value: "1000 / 6000" },
            { label: "Storage", value: "Magnetic bar" },
          ],
          ingredients: [
            { name: "Diamond / ceramic steel rod", qty: "1 unit" },
            { name: "Mineral food-safe oil", qty: "1 drop" },
            { name: "Sanitizing wipe", qty: "1 sheet" },
          ],
          steps: [
            {
              en: "Hold the steel rod point-down firmly against a secure cutting board.",
              es: "Sostén la varilla de afilar hacia abajo firmemente sobre una tabla segura.",
            },
            {
              en: "Maintain a steady 20-degree angle from the heel to the tip across the steel.",
              es: "Mantén un ángulo constante de 20 grados desde el talón hasta la punta sobre el acero.",
            },
            {
              en: "Swipe gently downward 4-5 times per side, matching pressure on both faces.",
              es: "Desliza suavemente hacia abajo 4 a 5 veces por lado, igualando la presión en ambas caras.",
            },
            {
              en: "Sanitize blade and mount immediately to station magnetic strip.",
              es: "Sanitiza la hoja y móntala de inmediato en la barra magnética de la estación.",
            },
          ],
          slug: "knife-sharpening-honing",
        },
      },
      {
        id: "ch-knife-maintenance",
        number: 4,
        titleEn: "Weekly whetstone maintenance & sign-off",
        titleEs: "Mantenimiento semanal en piedra y firma",
        contentEn: "Blade angle, whetstone technique and sign-off",
        contentEs: "Ángulo de hoja, técnica en piedra y firma",
        procedureData: {
          titleEn: "Whetstone Sharpening & Maintenance SOP",
          titleEs: "POE Afilado y mantenimiento en piedra",
          metrics: [
            { label: "Soak duration", value: "15 minutes" },
            { label: "Bevel angle", value: "15° – 20°" },
            { label: "Initial grit", value: "1000 (rough)" },
            { label: "Finish grit", value: "6000 (polish)" },
          ],
          ingredients: [
            { name: "Dual grit combination whetstone", qty: "1 unit" },
            { name: "Whetstone sink bridge / rubber base", qty: "1 stand" },
            { name: "Clean water bath", qty: "1 basin" },
          ],
          steps: [
            {
              en: "Submerge whetstone in clean water until bubbles cease completely (approx 15 mins).",
              es: "Sumerge la piedra en agua limpia hasta que cesen las burbujas por completo (aprox 15 mins).",
            },
            {
              en: "Secure stone in rubber holder on a damp towel to prevent slippage during work.",
              es: "Asegura la piedra en el soporte de goma sobre un paño húmedo para evitar deslizamientos.",
            },
            {
              en: "Begin on 1000 grit side: glide blade at 15-20° from heel to tip with smooth, consistent strokes.",
              es: "Comienza por el grano 1000: desliza la hoja a 15-20° de talón a punta con pasadas suaves y constantes.",
            },
            {
              en: "Finish on 6000 grit side to deburr and hone edge until it cleanly slices paper.",
              es: "Termina en el grano 6000 para quitar rebabas y asentar el filo hasta cortar papel limpiamente.",
            },
          ],
          slug: "knife-sharpening-honing",
        },
      },
    ],
    linkedProcedure: {
      titleEn: "Knife sharpening & honing",
      titleEs: "Afilado y mantenimiento de cuchillo",
      hrefSlug: "knife-sharpening-honing",
    },
  },
  // Allergen awareness FOH (course-003)
  "course-003": {
    chapters: [
      {
        id: "ch-allergen-9",
        number: 1,
        titleEn: "The 9 major food allergens",
        titleEs: "Los 9 alérgenos alimentarios principales",
        contentEn: "Identification and severity guide",
        contentEs: "Guía de identificación y gravedad",
        quizPassedTextEn: "Quiz passed · 4 of 4 correct",
        quizPassedTextEs: "Cuestionario aprobado · 4 de 4 correctas",
      },
      {
        id: "ch-allergen-cross",
        number: 2,
        titleEn: "Cross-contact prevention on the line",
        titleEs: "Prevención de contacto cruzado en línea",
        contentEn: "Video, checklist and prep rules",
        contentEs: "Video, lista de verificación y reglas",
      },
      {
        id: "ch-allergen-ticket",
        number: 3,
        titleEn: "Allergen tickets and communication",
        titleEs: "Comandas con alérgenos y comunicación",
        contentEn: "Protocol guide and quiz",
        contentEs: "Guía de protocolo y cuestionario",
      },
    ],
  },
  // Handwashing & glove protocol (course-001)
  "course-001": {
    chapters: [
      {
        id: "ch-hw-when",
        number: 1,
        titleEn: "When to wash hands",
        titleEs: "Cuándo lavarse las manos",
        contentEn: "Contamination rules and triggers",
        contentEs: "Reglas de contaminación y momentos clave",
        quizPassedTextEn: "Completed",
        quizPassedTextEs: "Completado",
      },
      {
        id: "ch-hw-technique",
        number: 2,
        titleEn: "20-second technique & temperature",
        titleEs: "Técnica de 20 segundos y temperatura",
        contentEn: "Video and demonstration guide",
        contentEs: "Video y guía demostrativa",
        quizPassedTextEn: "Steps verified",
        quizPassedTextEs: "Pasos verificados",
      },
      {
        id: "ch-hw-gloves",
        number: 3,
        titleEn: "Glove protocol & disposal",
        titleEs: "Protocolo de guantes y descarte",
        contentEn: "Guide and quiz",
        contentEs: "Guía y cuestionario",
        quizPassedTextEn: "Quiz passed · 3 of 3 correct",
        quizPassedTextEs: "Cuestionario aprobado · 3 de 3 correctas",
      },
    ],
    linkedProcedure: {
      titleEn: "Handwashing SOP",
      titleEs: "POE Lavado de manos",
      hrefSlug: "handwashing-glove-protocol",
    },
  },
  // Cleaning fundamentals (course-005)
  "course-005": {
    chapters: [
      {
        id: "ch-clean-chemicals",
        number: 1,
        titleEn: "Chemical handling & dilution",
        titleEs: "Manejo y dilución de químicos",
        contentEn: "Safety data sheet and PPE",
        contentEs: "Ficha de datos de seguridad y EPP",
      },
      {
        id: "ch-clean-sink",
        number: 2,
        titleEn: "Three-compartment sink setup",
        titleEs: "Preparación de tarjas de tres compartimentos",
        contentEn: "Wash, rinse and sanitize protocol",
        contentEs: "Protocolo de lavado, enjuague y desinfección",
      },
      {
        id: "ch-clean-close",
        number: 3,
        titleEn: "End-of-shift closing checklist",
        titleEs: "Lista de cierre de turno",
        contentEn: "Breakdown, trash and sign-off",
        contentEs: "Desmontaje, basura y firma",
      },
    ],
  },
};

/**
 * Resolves the chapters, progress and next step for an assigned course.
 * Adheres strictly to DESIGN.md tokens and clean separation of concerns.
 */
export function getCourseChaptersViewData(
  course: Procedure,
  assignment: TrainingAssignment | undefined,
  locale: string,
): CourseChaptersViewData {
  const isEs = locale === "es";
  const courseId = course.id;

  const title =
    (isEs
      ? course.titleEs || course.titleEn
      : course.titleEn || course.titleEs) || course.slug;
  const purpose =
    (isEs
      ? course.purposeEs || course.purposeEn
      : course.purposeEn || course.purposeEs) || "";

  // Check custom registry or fall back to 3 standard chapters derived from course
  const reg = COURSE_CHAPTER_REGISTRY[courseId];
  const chapterDefs: ChapterDefinition[] = reg?.chapters ?? [
    {
      id: `${courseId}-ch-1`,
      number: 1,
      titleEn: `${course.titleEn || "Introduction"} - Overview`,
      titleEs: `${course.titleEs || "Introducción"} - Resumen`,
      contentEn: "Guide and objectives",
      contentEs: "Guía y objetivos",
    },
    {
      id: `${courseId}-ch-2`,
      number: 2,
      titleEn: "Core procedure & execution",
      titleEs: "Procedimiento principal y ejecución",
      contentEn: "Video, method and checklist",
      contentEs: "Video, método y pasos",
    },
    {
      id: `${courseId}-ch-3`,
      number: 3,
      titleEn: "Verification and sign-off",
      titleEs: "Verificación y firma",
      contentEn: "Assessment and sign-off",
      contentEs: "Evaluación y firma",
    },
  ];

  const totalChapters = chapterDefs.length;
  const isComplete =
    assignment?.status === "complete" || Boolean(assignment?.acknowledgedAt);

  // Compute number of completed chapters
  let completedCount = 0;
  if (isComplete) {
    completedCount = totalChapters;
  } else if (assignment) {
    // Check specific known step milestones
    const stepCount = assignment.completedStepIds.length;
    if (stepCount >= totalChapters) {
      completedCount = totalChapters - 1; // Needs final sign-off
    } else if (stepCount > 0) {
      completedCount = Math.min(stepCount, totalChapters - 1);
    }
  }

  const progressPercent = isComplete
    ? 100
    : Math.round((completedCount / totalChapters) * 100);

  const activeIndex = isComplete
    ? -1
    : Math.min(completedCount, totalChapters - 1);

  const nextChapterNumber =
    isComplete || activeIndex === -1 ? null : activeIndex + 1;

  const chapters: CourseChapter[] = chapterDefs.map((def, index) => {
    const chapterTitle = isEs ? def.titleEs : def.titleEn;

    if (isComplete || index < completedCount) {
      const passedText = isEs
        ? (def.quizPassedTextEs ?? "Completado")
        : (def.quizPassedTextEn ?? "Completed");
      return {
        id: def.id,
        number: def.number,
        title: chapterTitle,
        subtitle: passedText,
        status: "complete",
      };
    }

    if (index === activeIndex) {
      const contentDesc = isEs ? def.contentEs : def.contentEn;
      return {
        id: def.id,
        number: def.number,
        title: chapterTitle,
        subtitle: contentDesc,
        status: "active",
      };
    }

    // Locked chapter
    const prevChapterNumber = index; // 1-based previous chapter number
    const lockedText = isEs
      ? `Bloqueado hasta aprobar el capítulo ${prevChapterNumber}`
      : `Locked until chapter ${prevChapterNumber} is passed`;

    return {
      id: def.id,
      number: def.number,
      title: chapterTitle,
      subtitle: lockedText,
      status: "locked",
    };
  });

  // Resolve linked procedure if available
  let linkedProcedure: LinkedProcedureInfo | null = null;
  if (reg?.linkedProcedure) {
    linkedProcedure = {
      title: isEs ? reg.linkedProcedure.titleEs : reg.linkedProcedure.titleEn,
      href: `/${locale}/procedures/${reg.linkedProcedure.hrefSlug}`,
    };
  }

  return {
    courseId,
    title,
    purpose,
    progressPercent,
    chapters,
    nextChapterNumber,
    linkedProcedure,
    allComplete: isComplete,
  };
}

export function getChapterDetail(
  courseId: string,
  chapterNumber: number,
  locale: string,
): {
  title: string;
  subtitle: string;
  procedureData?: {
    title: string;
    metrics?: { label: string; value: string }[];
    ingredients?: { name: string; qty: string; isAllergen?: boolean }[];
    steps?: string[];
    slug?: string;
  };
} {
  const isEs = locale === "es";
  const reg = COURSE_CHAPTER_REGISTRY[courseId];
  const def =
    reg?.chapters.find((c) => c.number === chapterNumber) ?? reg?.chapters[0];

  const title = def
    ? isEs
      ? def.titleEs
      : def.titleEn
    : `Chapter ${chapterNumber}`;
  const subtitle = def ? (isEs ? def.contentEs : def.contentEn) : "";

  let procedureData = undefined;
  if (def?.procedureData) {
    procedureData = {
      title: isEs ? def.procedureData.titleEs : def.procedureData.titleEn,
      metrics: def.procedureData.metrics,
      ingredients: def.procedureData.ingredients,
      steps: def.procedureData.steps?.map((s) => (isEs ? s.es : s.en)),
      slug: def.procedureData.slug,
    };
  }

  return { title, subtitle, procedureData };
}
