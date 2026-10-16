import type { Procedure, ProcedureBlock, TrainingAssignment } from "./types";

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

// Block builders mapping 1:1 to ProcedureBlock from the procedure system
const blockText = (id: string, en: string, es: string): ProcedureBlock => ({
  id,
  kind: "text",
  body: { en, es },
});

const blockHeading = (
  id: string,
  level: 1 | 2 | 3,
  en: string,
  es: string,
): ProcedureBlock => ({
  id,
  kind: "heading",
  level,
  text: { en, es },
});

const blockWarning = (
  id: string,
  severity: "warn" | "tip" | "alt" | "equip" | "allergen",
  en: string,
  es: string,
): ProcedureBlock => ({
  id,
  kind: "warning",
  severity,
  body: { en, es },
});

const blockTable = (
  id: string,
  headers: { en: string; es: string }[],
  rows: { en: string; es: string }[][],
): ProcedureBlock => ({
  id,
  kind: "table",
  headers,
  rows,
});

const blockImage = (
  id: string,
  src: string,
  alt: { en: string; es: string },
  caption?: { en: string; es: string },
): ProcedureBlock => ({
  id,
  kind: "image",
  src,
  alt,
  caption,
  hint: "photo",
});

const blockVideo = (
  id: string,
  src: string,
  caption?: { en: string; es: string },
): ProcedureBlock => ({
  id,
  kind: "video",
  src,
  caption,
});

const blockIngredients = (
  id: string,
  ingredients: {
    name: string;
    amounts: string[];
    unit?: string;
    allergen?: boolean;
  }[],
  allergenSummary?: { en: string; es: string },
): ProcedureBlock => ({
  id,
  kind: "ingredients",
  factors: [1],
  ingredients: ingredients.map((i) => ({
    name: i.name,
    amounts: i.amounts,
    unit: i.unit,
    allergen: i.allergen,
  })),
  allergen: allergenSummary
    ? {
        summary: allergenSummary.en,
        detail: allergenSummary.en,
        selectedAllergens: ["Crustaceans / Shellfish"],
      }
    : undefined,
});

const blockMethod = (
  id: string,
  steps: { en: string; es: string; critical?: boolean }[],
): ProcedureBlock => ({
  id,
  kind: "method",
  steps: steps.map((s, idx) => ({
    id: `step-${idx + 1}`,
    body: { en: s.en, es: s.es },
    critical: s.critical,
  })),
});

/**
 * Full procedure blocks for "Shrimp Ceviche Verde / Roja"
 * Directly mirrors the procedure at /admin/library/shrimp-ceviche-verde-roja-2
 */
export const shrimpCevicheBlocks: ProcedureBlock[] = [
  blockHeading(
    "shrimp-head-1",
    1,
    "Shrimp Ceviche Verde / Roja",
    "Ceviche Verde / Roja de Camarones",
  ),
  blockText(
    "shrimp-info-1",
    "Recipe Information\nCategory: Recipes · Type: Ceviche · Yield: 1 order · Serving: 1 plate (chilled curved plate)\n\nFollow the recipe for Shrimp Ceviche Verde / Roja carefully.",
    "Información de la Receta\nCategoría: Recetas · Tipo: Ceviche · Rendimiento: 1 orden · Porción: 1 plato (plato curvado frío)\n\nSiga la receta de Ceviche Verde / Roja de Camarones con cuidado.",
  ),
  blockWarning(
    "shrimp-allergen-1",
    "allergen",
    "Allergen Notice: Contains Crustaceans / Shellfish (Prepared Shrimp). Never cross-contaminate prep bowls, cutting boards, or utensils with non-shellfish tickets.",
    "Aviso de alérgenos: Contiene crustáceos / mariscos (camarón preparado). Nunca contamine tazones, tablas o utensilios de preparación con comandas sin mariscos.",
  ),
  blockIngredients(
    "shrimp-ing-1",
    [
      {
        name: "Prepared shrimp",
        amounts: ["1"],
        unit: "container",
        allergen: true,
      },
      { name: "Sliced cucumber", amounts: ["1"], unit: "handful" },
      { name: "Diced white onion", amounts: ["2½"], unit: "spoonfuls" },
      { name: "Cut tomatillo", amounts: ["3–4"], unit: "pieces" },
      { name: "Lime juice", amounts: ["4–5"], unit: "tablespoons" },
      { name: "Ceviche Verde sauce", amounts: ["As needed"] },
      { name: "Salt", amounts: ["½"], unit: "tablespoon" },
      { name: "Avocado", amounts: ["¼"], unit: "avocado" },
      { name: "Virgin olive oil", amounts: ["As needed"] },
      { name: "Red onion", amounts: ["A few"], unit: "slices" },
      { name: "Cilantro", amounts: ["A few"], unit: "pieces" },
    ],
    {
      en: "Shellfish / Shrimp allergen alert",
      es: "Alerta de alérgenos: mariscos / camarón",
    },
  ),
  blockWarning(
    "shrimp-tip-1",
    "tip",
    "Always taste the ceviche before plating. If salt or lime is too strong, add a small amount of Ceviche Verde sauce to rebalance the mixture.",
    "Siempre pruebe el ceviche antes de emplatar. Si la sal o la lima están muy fuertes, agregue una pequeña cantidad de salsa Ceviche Verde para reequilibrar la mezcla.",
  ),
  blockMethod("shrimp-method-1", [
    {
      en: "Use a large mixing bowl to prepare the ceviche.",
      es: "Use un tazón grande para preparar el ceviche.",
    },
    {
      en: "Transfer 1 prepared container of shrimp from Prep into the mixing bowl.",
      es: "Transfiera 1 contenedor preparado de camarones de la preparación al tazón.",
    },
    {
      en: "Add 1 handful of sliced cucumber.",
      es: "Agregue 1 puñado de pepino en rodajas.",
    },
    {
      en: "Add 2½ spoonfuls of diced white onion.",
      es: "Agregue 2½ cucharadas de cebolla blanca picada.",
    },
    {
      en: "Add 3–4 pieces of cut tomatillo.",
      es: "Agregue 3–4 piezas de tomatillo cortado.",
    },
    {
      en: "Add approximately 4–5 tablespoons of lime juice.",
      es: "Agregue aproximadamente 4–5 cucharadas de jugo de lima.",
    },
    {
      en: "Add enough Ceviche Verde sauce to evenly coat all ingredients.",
      es: "Agregue suficiente salsa Ceviche Verde para cubrir uniformemente todos los ingredientes.",
    },
    {
      en: "Add approximately ½ tablespoon of salt.",
      es: "Agregue aproximadamente ½ cucharada de sal.",
    },
    {
      en: "Using a spoon, gently mix all ingredients until the shrimp and vegetables are evenly coated with the sauce, lime juice, and seasoning.",
      es: "Usando una cuchara, mezcle suavemente todos los ingredientes hasta que los camarones y las verduras estén cubiertos uniformemente con la salsa, el jugo de lima y el condimento.",
    },
    {
      en: "Taste the mixture and check the balance of salt, lime, and Ceviche Verde sauce.",
      es: "Pruebe la mezcla y verifique el equilibrio de sal, lima y salsa Ceviche Verde.",
      critical: true,
    },
    {
      en: "If the salt or lime is too strong, add a small amount of Ceviche Verde sauce to rebalance the mixture.",
      es: "Si la sal o la lima son demasiado fuertes, agregue una pequeña cantidad de salsa Ceviche Verde para reequilibrar la mezcla.",
    },
    {
      en: "If the salt level is too low, add a small amount of salt.",
      es: "Si el nivel de sal es demasiado bajo, agregue una pequeña cantidad de sal.",
    },
    {
      en: "If additional acidity is needed, add a small amount of lime juice.",
      es: "Si se necesita más acidez, agregue una pequeña cantidad de jugo de lima.",
    },
    {
      en: "Mix thoroughly and taste again after making any adjustment.",
      es: "Mezcle bien y pruebe nuevamente después de hacer cualquier ajuste.",
    },
    {
      en: "The measurements above provide a starting standard. With experience, develop a feel for the correct amount of each ingredient needed to achieve the proper balance.",
      es: "Las medidas anteriores proporcionan un estándar inicial. Con la experiencia, desarrolle una sensación de la cantidad correcta para lograr el equilibrio adecuado.",
    },
    {
      en: "Always taste the ceviche before plating.",
      es: "Siempre pruebe el ceviche antes de emplatar.",
      critical: true,
    },
    {
      en: "Use one of the curved plates stored in the cooler underneath the main GM station.",
      es: "Use uno de los platos curvados almacenados en el refrigerador debajo de la estación principal de GM.",
    },
    {
      en: "Cut an avocado in half. Take one half and cut it in half again. Cut once more to create two small avocado slices.",
      es: "Corte un aguacate por la mitad. Tome una mitad y córtela por la mitad nuevamente. Corte una vez más para crear dos pequeñas rodajas de aguacate.",
    },
    {
      en: "Place the two avocado slices together at the corner of the curved plate.",
      es: "Coloque las dos rodajas de aguacate juntas en la esquina del plato curvado.",
    },
    {
      en: "Using a gloved hand or spoon, transfer the ceviche from the mixing bowl onto the plate.",
      es: "Usando una mano con guante o una cuchara, transfiera el ceviche del tazón al plato.",
    },
    {
      en: "Build the ceviche upward rather than spreading it flat, creating a compact, mountain-like shape.",
      es: "Construya el ceviche hacia arriba en lugar de extenderlo plano, creando una forma compacta, similar a una montaña.",
    },
    {
      en: "Lightly drizzle virgin olive oil over the plated ceviche.",
      es: "Rocíe ligeramente aceite de oliva virgen sobre el ceviche emplatado.",
    },
    {
      en: "Finish with a few slices of red onion and cilantro.",
      es: "Termine con unas rodajas de cebolla roja y cilantro.",
    },
    {
      en: "Arrange the garnish toward the top of the ceviche to create a clean, tower-like presentation.",
      es: "Coloque la guarnición hacia la parte superior del ceviche para crear una presentación limpia y similar a una torre.",
    },
    {
      en: "Before sending the dish to Expo, confirm height, shape, even coating, clean plate edge, and no pooling sauce.",
      es: "Antes de enviar a Expo, confirme altura, forma, cobertura uniforme, borde limpio y sin charcos de salsa.",
      critical: true,
    },
    {
      en: "Hand the completed dish to the Expo Chef for the final quality check and service.",
      es: "Entregue el plato terminado al Chef de Expo para la verificación final de calidad y servicio.",
    },
  ]),
];

interface ChapterDefinition {
  id: string;
  number: number;
  titleEn: string;
  titleEs: string;
  contentEn: string;
  contentEs: string;
  quizPassedTextEn?: string;
  quizPassedTextEs?: string;
  blocks?: ProcedureBlock[];
  procedureSlug?: string;
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
        blocks: [
          blockText(
            "b-wlc-1",
            "Welcome to the Alimentaria family! Our kitchen is grounded in deep respect for Mexican culinary heritage, relentless cleanliness, and proud craftsmanship in every dish served.",
            "¡Bienvenido a la familia Alimentaria! Nuestra cocina se basa en un profundo respeto por la herencia culinaria mexicana, la limpieza implacable y el orgullo por cada platillo servido.",
          ),
          blockWarning(
            "b-wlc-w1",
            "tip",
            "Your uniform is your professional armor. Always arrive in a clean pressed coat, certified slip-resistant shoes, and full hair restraint before stepping onto the line.",
            "Tu uniforme es tu armadura profesional. Llega siempre con filipina limpia, calzado antideslizante certificado y cabello recogido antes de entrar a la línea.",
          ),
          blockTable(
            "b-wlc-t1",
            [
              { en: "Phase", es: "Fase" },
              { en: "Standard Time", es: "Horario estándar" },
              { en: "Core Duty", es: "Deber principal" },
            ],
            [
              [
                { en: "Pre-Shift Arrival", es: "Llegada previa" },
                { en: "10 min before shift", es: "10 min antes del turno" },
                {
                  en: "Locker room check & wash hands",
                  es: "Casillero y lavado de manos",
                },
              ],
              [
                { en: "Line Briefing", es: "Junta de línea" },
                { en: "At shift start", es: "Al inicio del turno" },
                {
                  en: "Review 86 list, daily specials & stations",
                  es: "Revisar lista de agotados y especiales",
                },
              ],
              [
                { en: "Handover", es: "Entrega de turno" },
                { en: "At shift end", es: "Al final del turno" },
                {
                  en: "Restock station & sign off with Sous Chef",
                  es: "Resurtir estación y firmar con Sous Chef",
                },
              ],
            ],
          ),
        ],
      },
      {
        id: "ch-kitchen-safety",
        number: 2,
        titleEn: "Kitchen safety and hygiene",
        titleEs: "Seguridad e higiene en cocina",
        contentEn: "Video, guide and quiz",
        contentEs: "Video, guía y cuestionario",
        blocks: [
          blockText(
            "b-safe-1",
            "Food safety is the foundation of customer trust. Maintaining strict temperature control, washing hands frequently, and eliminating cross-contact are mandatory on every station.",
            "La inocuidad alimentaria es la base de la confianza del cliente. Mantener un estricto control de temperaturas, lavarse las manos frecuentemente y eliminar el contacto cruzado son obligatorios.",
          ),
          blockWarning(
            "b-safe-w1",
            "warn",
            "Gloves do not replace handwashing. You must ALWAYS wash hands vigorously with warm water and soap for 20 seconds before putting on a fresh pair of gloves.",
            "Los guantes no reemplazan el lavado de manos. SIEMPRE debes lavarte las manos con agua tibia y jabón durante 20 segundos antes de colocarte guantes limpios.",
          ),
          blockTable(
            "b-safe-t1",
            [
              { en: "Area", es: "Área" },
              { en: "Critical Limit", es: "Límite crítico" },
              { en: "Action on Breach", es: "Acción correctiva" },
            ],
            [
              [
                { en: "Cold Station Line", es: "Línea fría" },
                { en: "≤ 41°F (5°C)", es: "≤ 5°C (41°F)" },
                {
                  en: "Move to walk-in cooler immediately",
                  es: "Mover a cámara frigorífica de inmediato",
                },
              ],
              [
                { en: "Hot Holding Table", es: "Mesa caliente" },
                { en: "≥ 135°F (57°C)", es: "≥ 57°C (135°F)" },
                {
                  en: "Reheat to 165°F or discard",
                  es: "Recalentar a 74°C o desechar",
                },
              ],
            ],
          ),
        ],
      },
      {
        id: "ch-first-week",
        number: 3,
        titleEn: "Your first week",
        titleEs: "Tu primera semana",
        contentEn: "Expectations, uniform and conduct",
        contentEs: "Expectativas, uniforme y conducta",
        blocks: [
          blockText(
            "b-fw-1",
            "During your first week, you will shadow senior line cooks across tortillas, prep, and line service. Take notes on recipe proportions, station setup, and ticket timing.",
            "Durante tu primera semana, acompañarás a cocineros experimentados en tortillas, producción y línea. Toma notas sobre proporciones de recetas y tiempos de comandas.",
          ),
          blockWarning(
            "b-fw-w1",
            "tip",
            "Never guess when in doubt about a ticket modification or allergy alert. Always stop and confirm with your Sous Chef or Line Lead.",
            "Nunca adivines ante una modificación de comanda o alerta de alergia. Deténte siempre y confirma con tu Sous Chef o Líder de Línea.",
          ),
        ],
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
        contentEn: "Video, technique, safety standard and linked procedure",
        contentEs:
          "Video, técnica, norma de seguridad y procedimiento vinculado",
        quizPassedTextEn: "Checklist completed",
        quizPassedTextEs: "Lista de verificación completada",
        blocks: [
          blockText(
            "b-grip-1",
            "Mastering the pinch grip gives you absolute directional control over the blade, prevents wrist strain during long prep shifts, and dramatically reduces accidental blade slipping on wet ingredients.",
            "Dominar el agarre de pinza te brinda un control direccional absoluto sobre la hoja, previene la fatiga de la muñeca en turnos largos y reduce drásticamente el deslizamiento accidental sobre ingredientes húmedos.",
          ),
          blockVideo(
            "b-grip-v1",
            "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
            {
              en: "Demonstration: Bolster Pinch & Guiding Claw (1:45 min)",
              es: "Demostración: Agarre de pinza y garra protectora (1:45 min)",
            },
          ),
          blockWarning(
            "b-grip-w1",
            "tip",
            "Always place a damp towel or non-slip silicone mat directly under your cutting board. If your board shifts even 1 millimeter during prep, stop immediately and secure it.",
            "Coloca siempre un paño húmedo o tapete de silicona antideslizante directamente debajo de la tabla de corte. Si la tabla se mueve aunque sea 1 milímetro, deténte y asegúrala.",
          ),
          blockTable(
            "b-grip-t1",
            [
              { en: "Hand", es: "Mano" },
              { en: "Standard Position", es: "Posición estándar" },
              { en: "Safety Function", es: "Función de seguridad" },
            ],
            [
              [
                {
                  en: "Cutting Hand",
                  es: "Mano de corte",
                },
                {
                  en: "Thumb & index finger pinch bolster firmly",
                  es: "Pulgar e índice sujetan firmemente la virola",
                },
                {
                  en: "Provides blade balance & prevents twisting",
                  es: "Proporciona equilibrio y evita torceduras",
                },
              ],
              [
                {
                  en: "Guiding Hand",
                  es: "Mano guía",
                },
                {
                  en: "Fingers curled inward like a bear claw",
                  es: "Dedos doblados hacia adentro como garra",
                },
                {
                  en: "Knuckles rest against blade face; nails safe",
                  es: "Los nudillos tocan la hoja; uñas protegidas",
                },
              ],
              [
                {
                  en: "Cutting Stroke",
                  es: "Movimiento",
                },
                {
                  en: "Smooth rolling rock (locomotive motion)",
                  es: "Rodante suave hacia adelante y atrás",
                },
                {
                  en: "Maintains contact with board at all times",
                  es: "Mantiene contacto con la tabla siempre",
                },
              ],
            ],
          ),
        ],
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
        blocks: [
          blockText(
            "b-rules-1",
            "Commercial kitchens are compact, high-speed environments. A carried knife is an invisible hazard unless strict transport and communication rules are followed without exception.",
            "Las cocinas comerciales son entornos compactos y de ritmo rápido. Un cuchillo en movimiento es un peligro invisible a menos que se sigan estrictas reglas de transporte y comunicación sin excepción.",
          ),
          blockWarning(
            "b-rules-w1",
            "warn",
            "A falling knife has no handle. NEVER attempt to catch a knife slipping from a counter or prep board. Step backward immediately with hands up.",
            "Un cuchillo que cae no tiene mango. NUNCA intentes atrapar un cuchillo que se resbale de una mesa o tabla. Da un paso atrás de inmediato con las manos en alto.",
          ),
          blockTable(
            "b-rules-t1",
            [
              { en: "Situation", es: "Situación" },
              { en: "Mandatory Callout", es: "Aviso obligatorio" },
              { en: "Physical Action", es: "Acción física" },
            ],
            [
              [
                { en: "Navigating on line", es: "Caminar en la línea" },
                {
                  en: "'Knife behind' or 'Sharp moving'",
                  es: "'Cuchillo detrás' o 'Cuchillo pasando'",
                },
                {
                  en: "Blade down against outer leg",
                  es: "Hoja hacia abajo junto a pierna",
                },
              ],
              [
                { en: "Handoff to cook", es: "Entrega a compañero" },
                {
                  en: "Confirm eye contact ('Knife on board')",
                  es: "Confirmar contacto visual",
                },
                {
                  en: "Place flat on board handle forward",
                  es: "Colocar plano con mango al frente",
                },
              ],
              [
                { en: "Rounding corners", es: "Doblar esquinas" },
                { en: "'Sharp corner'", es: "'Esquina con filo'" },
                { en: "Slow to steady walking pace", es: "Disminuir el paso" },
              ],
            ],
          ),
        ],
      },
      {
        id: "ch-shrimp-ceviche-procedure",
        number: 3,
        titleEn: "Procedure: Shrimp Ceviche Verde / Roja",
        titleEs: "Procedimiento: Ceviche Verde / Roja de Camarones",
        contentEn:
          "Preparation and plating procedure for Shrimp Ceviche Verde / Roja",
        contentEs:
          "Procedimiento de preparación y emplatado del Ceviche de Camarón",
        blocks: shrimpCevicheBlocks,
        procedureSlug: "shrimp-ceviche-verde-roja-2",
      },
      {
        id: "ch-knife-maintenance",
        number: 4,
        titleEn: "Weekly whetstone maintenance & sign-off",
        titleEs: "Mantenimiento semanal en piedra y firma",
        contentEn: "Blade angle, whetstone technique and sign-off",
        contentEs: "Ángulo de hoja, técnica en piedra y firma",
        blocks: [
          blockText(
            "b-stone-1",
            "Every Sunday shift, all station knives are restored on two-stage Japanese waterstones to maintain the optimal 15-20 degree factory bevel angle.",
            "Cada turno dominical, todos los cuchillos de estación se restauran en piedras de agua japonesas de dos etapas para mantener el ángulo óptimo de 15 a 20 grados.",
          ),
          blockWarning(
            "b-stone-w1",
            "tip",
            "Never rinse away the gray slurry that develops on the stone surface during sharpening. That slurry contains microscopic particles that accelerate fine edge honing.",
            "Nunca enjuagues el lodo gris que se acumula en la superficie de la piedra durante el afilado. Ese lodo contiene partículas microscópicas que aceleran el asentado fino.",
          ),
          blockTable(
            "b-stone-t1",
            [
              { en: "Stone Stage", es: "Etapa de la piedra" },
              { en: "Grit Rating", es: "Grano" },
              { en: "Purpose", es: "Propósito" },
            ],
            [
              [
                { en: "Rough Resurfacing", es: "Desbaste inicial" },
                { en: "1000 Grit", es: "Grano 1000" },
                {
                  en: "Corrects micro-nicks and sets primary apex bevel",
                  es: "Corrige mellas y fija el bisel del ápice",
                },
              ],
              [
                { en: "Fine Polishing", es: "Pulido fino" },
                { en: "6000 Grit", es: "Grano 6000" },
                {
                  en: "Removes wire burr for effortless paper slicing",
                  es: "Elimina rebabas para cortar papel sin esfuerzo",
                },
              ],
            ],
          ),
        ],
      },
    ],
    linkedProcedure: {
      titleEn: "Shrimp Ceviche Verde / Roja",
      titleEs: "Ceviche Verde / Roja de Camarones",
      hrefSlug: "shrimp-ceviche-verde-roja-2",
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
  totalChapters: number;
  blocks: ProcedureBlock[];
  procedureSlug?: string;
} {
  const isEs = locale === "es";
  const reg = COURSE_CHAPTER_REGISTRY[courseId];
  const totalChapters = reg?.chapters.length ?? 3;
  const def =
    reg?.chapters.find((c) => c.number === chapterNumber) ?? reg?.chapters[0];

  const title = def
    ? isEs
      ? def.titleEs
      : def.titleEn
    : `Chapter ${chapterNumber}`;
  const subtitle = def ? (isEs ? def.contentEs : def.contentEn) : "";

  // Return defined blocks or fallback standard procedure blocks
  const blocks: ProcedureBlock[] = def?.blocks ?? [
    blockText(
      `${courseId}-ch${chapterNumber}-b1`,
      def
        ? def.contentEn
        : "Review this chapter's key standards and operational practices.",
      def
        ? def.contentEs
        : "Revisa las normas y prácticas operativas clave de este capítulo.",
    ),
    blockWarning(
      `${courseId}-ch${chapterNumber}-b2`,
      "tip",
      "Consistency and active attention to detail ensure kitchen safety and station excellence.",
      "La constancia y atención activa al detalle aseguran la seguridad y excelencia en tu estación.",
    ),
    blockTable(
      `${courseId}-ch${chapterNumber}-b3`,
      [
        { en: "Operational Standard", es: "Norma operativa" },
        { en: "Shift Requirement", es: "Requisito de turno" },
        { en: "Verification", es: "Verificación" },
      ],
      [
        [
          { en: "Kitchen Protocol", es: "Protocolo de cocina" },
          {
            en: "Adhere to station standard",
            es: "Seguir la norma de estación",
          },
          { en: "Station lead sign-off", es: "Firma del líder de estación" },
        ],
        [
          { en: "Safe Execution", es: "Ejecución segura" },
          { en: "Follow safety guidelines", es: "Seguir reglas de seguridad" },
          { en: "Zero shortcuts", es: "Cero atajos" },
        ],
      ],
    ),
  ];

  const procedureSlug = def?.procedureSlug;
  return { title, subtitle, totalChapters, blocks, procedureSlug };
}
