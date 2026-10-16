import type {
  Procedure,
  ProcedureAcknowledgement,
  ProcedureBody,
  ProcedureBlock,
  ProcedureMethodStep,
  TrainingAssignment,
  TrainingAssignmentStatus,
  TrainingAssignmentRow,
  TrainingCourseRow,
} from "./types";

/** Lightweight employee shape used only for the training surfaces. The real
 *  employee record comes from `fetchMe` / list endpoints; this stands in
 *  during the frontend-only build. */
export interface MockEmployee {
  id: string;
  name: string;
  station: string;
}

export const mockTrainingEmployees: MockEmployee[] = [
  { id: "emp-maria", name: "María González", station: "Grill" },
  { id: "emp-001", name: "Marisol Ruiz", station: "Cold prep" },
  { id: "emp-cook", name: "Carlos Gomez", station: "Grill" },
  { id: "emp-prep", name: "Maria Santos", station: "Prep" },
  { id: "emp-004", name: "Hiro Watanabe", station: "Grill" },
  { id: "emp-006", name: "Ana López", station: "Dishwasher" },
  { id: "emp-admin", name: "Chef Raúl Medina", station: "Saucier" },
];

// ---------------------------------------------------------------------------
// Block + step factories — literal ids so the mock survives SSR / hydration.
// ---------------------------------------------------------------------------

const step = (
  id: string,
  en: string,
  es: string,
  critical = false,
): ProcedureMethodStep => ({
  id,
  body: { en, es },
  critical,
});

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

const blockMethod = (
  id: string,
  steps: ProcedureMethodStep[],
): ProcedureBlock => ({
  id,
  kind: "method",
  steps,
});

// ---------------------------------------------------------------------------
// Course bodies — built once, reused for EN and ES in the mock (bilingual
// content is the literal copy, not a runtime translation).
// ---------------------------------------------------------------------------

// What every new hire reads on day one (PROJECT_OVERVIEW §03 Onboarding:
// culture, uniform, employee conduct).
export const welcomeBody: ProcedureBody = {
  blocks: [
    blockHeading(
      "wl-h",
      1,
      "Welcome to Alimentaria",
      "Bienvenido a Alimentaria",
    ),
    blockText(
      "wl-intro",
      "How we work here: clean, on time, and we tell each other. Ask the chef on duty whenever you are not sure.",
      "Así trabajamos aquí: limpios, puntuales y comunicándonos. Pregunta al chef de turno siempre que tengas dudas.",
    ),
    blockMethod("wl-method", [
      step(
        "wl-s1",
        "Arrive ten minutes before your shift, in a clean uniform.",
        "Llega diez minutos antes de tu turno, con el uniforme limpio.",
      ),
      step(
        "wl-s2",
        "Tie your hair back and cover it. No jewellery except a plain band.",
        "Recógete y cúbrete el cabello. Sin joyas salvo una argolla lisa.",
      ),
      step(
        "wl-s3",
        "Tell the chef on duty before you leave your station.",
        "Avisa al chef de turno antes de dejar tu estación.",
      ),
    ]),
  ],
};

export const handwashingBody: ProcedureBody = {
  blocks: [
    blockHeading(
      "hw-h",
      1,
      "Handwashing & glove protocol",
      "Protocolo de lavado de manos y guantes",
    ),
    blockText(
      "hw-intro",
      "Hands are washed at handwash sinks only, never at prep sinks or over food. Wash on station entry, after raw protein, after touching your face, after the bin, and after any non-food task.",
      "Las manos se lavan exclusivamente en los lavamanos del personal. Lávese al entrar a la estación, después de tocar proteína cruda, después de tocarse la cara, después del bote de basura y tras cualquier tarea ajena a la comida.",
    ),
    blockWarning(
      "hw-warn",
      "warn",
      "A wet glove is not a clean glove. If a glove tears, gets wet, or you touch a non-food surface with it, take it off and wash your hands before putting a new one on.",
      "Un guante húmedo no es un guante limpio. Si se rompe, se moja o toca una superficie ajena a la comida, quíteselo y lávese las manos antes de ponerse uno nuevo.",
    ),
    blockMethod("hw-method", [
      step(
        "hw-s1",
        "Wet hands with warm water (≥ 100°F / 38°C).",
        "Mójese las manos con agua tibia (≥ 38°C).",
      ),
      step(
        "hw-s2",
        "Apply soap and lather for at least 20 seconds, including wrists and between fingers.",
        "Aplique jabón y frote al menos 20 segundos, incluyendo muñecas y entre los dedos.",
      ),
      step(
        "hw-s3",
        "Rinse under running water with fingertips down.",
        "Enjuague bajo el chorro con las puntas de los dedos hacia abajo.",
      ),
      step(
        "hw-s4",
        "Dry with a single-use paper towel; use the towel to turn off the faucet.",
        "Seque con una toalla de papel de un solo uso; use la toalla para cerrar el grifo.",
      ),
      step(
        "hw-s5",
        "Sanitise after drying if the task is ready-to-eat (≥ 60 % alcohol, 5 s wet).",
        "Desinfecte después de secar si la tarea es de listo-para-comer (≥ 60 % alcohol, 5 s mojado).",
      ),
    ]),
  ],
};

export const knifeSteps: ProcedureMethodStep[] = [
  step(
    "kn-s1",
    "Place the knife in the rack with the blade facing back, never edge-out over a counter.",
    "Coloque el cuchillo en la rejilla con el filo hacia atrás; nunca sobresalga del mostrador.",
  ),
  step(
    "kn-s2",
    "Carry a knife blade-down at your side, point straight ahead. Never run.",
    "Transporte el cuchillo con el filo hacia abajo a su costado, punta al frente. Nunca corra.",
  ),
  step(
    "kn-s3",
    'Pass a knife handle-first; announce "Knife behind you" before letting go.',
    'Pase el cuchillo por el mango; diga "Cuchillo detrás de usted" antes de soltarlo.',
    true,
  ),
  step(
    "kn-s4",
    "If you drop a knife, step back. Do not try to catch it.",
    "Si se le cae un cuchillo, dé un paso atrás. No intente atraparlo.",
    true,
  ),
  step(
    "kn-s5",
    "Cut on a stable board with a damp towel underneath; never cut toward your other hand.",
    "Corte sobre una tabla estable con un paño húmedo debajo; nunca corte hacia la otra mano.",
  ),
];

export const knifeSafetyBody: ProcedureBody = {
  blocks: [
    blockHeading(
      "kn-h",
      1,
      "Knife safety fundamentals",
      "Fundamentos de seguridad con cuchillo",
    ),
    blockText(
      "kn-intro",
      "A knife is the most-used tool in the kitchen and the most common source of serious cuts. These five rules are what we expect every cook, every shift.",
      "El cuchillo es la herramienta más usada en la cocina y la fuente más común de cortes serios. Estas cinco reglas aplican para todos los cocineros, todos los turnos.",
    ),
    blockWarning(
      "kn-warn",
      "warn",
      "A wet board is a slipping board. The damp towel under the board is not optional. It is the rule.",
      "Una tabla mojada es una tabla que resbala. El paño húmedo bajo la tabla no es opcional. Es la regla.",
    ),
    blockMethod("kn-method", knifeSteps),
  ],
};

export const allergenSteps: ProcedureMethodStep[] = [
  step(
    "al-s1",
    "Verify all nine Big-9 allergens on every prep line, every shift.",
    "Verifique los nueve alérgenos del Big-9 en cada línea de preparación, cada turno.",
  ),
  step(
    "al-s2",
    "Use dedicated boards (purple) for allergen tickets; do not cross stations.",
    "Use tablas dedicadas (moradas) para las comandas con alérgenos; no cruce estaciones.",
  ),
  step(
    "al-s3",
    "No substitutions without manager sign-off and a new ticket.",
    "Sin sustituciones sin aprobación del gerente y una nueva comanda.",
  ),
  step(
    "al-s4",
    "Sanitise the entire station after an allergen ticket; wash boards separately.",
    "Desinfecte toda la estación tras una comanda con alérgenos; lave las tablas por separado.",
  ),
];

export const allergenBody: ProcedureBody = {
  blocks: [
    blockHeading(
      "al-h",
      1,
      "Allergen awareness: front of house",
      "Conocimiento de alérgenos: sala",
    ),
    blockText(
      "al-intro",
      "Every allergen ticket is the customer telling us they could be hospitalised by a wrong ingredient. Nine allergens, one shared kitchen. Mistake-proofing is the job.",
      "Cada comanda con alérgenos es el cliente diciéndonos que una ingrediente equivocada podría hospitalizarlo. Nueve alérgenos, una sola cocina. El trabajo es a prueba de errores.",
    ),
    blockWarning(
      "al-warn",
      "allergen",
      "If an allergen ticket and a non-allergen ticket for the same table both reach your station, the allergen ticket runs. Always.",
      "Si una comanda con alérgenos y otra sin alérgenos del mismo cliente llegan a su estación, va primero la de alérgenos. Siempre.",
    ),
    blockMethod("al-method", allergenSteps),
  ],
};

// ---------------------------------------------------------------------------
// Acknowledgement statements — the `I have read and understood` checkbox at
// the end of each course. Surfaced on the employee-side `.ack` block and on
// the receipt. Version label appears in the audit log.
// ---------------------------------------------------------------------------

export const handwashingAck: ProcedureAcknowledgement = {
  versionLabel: "v2026.09",
  statement: {
    en: "I have read the handwashing and glove protocol, and I will follow the five-step wash at every listed trigger point.",
    es: "He leído el protocolo de lavado de manos y guantes, y seguiré los cinco pasos de lavado en cada uno de los puntos indicados.",
  },
};

export const knifeAck: ProcedureAcknowledgement = {
  versionLabel: "v2026.08",
  statement: {
    en: "I will follow the five knife-safety rules (carry, pass, drop, board, and never-cut-toward) every shift.",
    es: "Seguiré las cinco reglas de seguridad con cuchillo (transporte, entrega, caída, tabla y nunca-cortar-hacia) en cada turno.",
  },
};

export const allergenAck: ProcedureAcknowledgement = {
  versionLabel: "v2026.09",
  statement: {
    en: "I have read the Big-9 allergen protocol. I will verify every allergen ticket before plating and will not substitute ingredients without manager sign-off.",
    es: "He leído el protocolo de los nueve alérgenos principales. Verificaré cada comanda con alérgenos antes de emplatar y no sustituiré ingredientes sin aprobación del gerente.",
  },
};

// ---------------------------------------------------------------------------
// Standalone SOPs — these are not courses. An admin links them into a course
// so the employee sees them as "Read alongside" on the course reader.
// ---------------------------------------------------------------------------

const lettuceWashBody: ProcedureBody = {
  blocks: [
    blockHeading("lw-h", 1, "Lettuce wash", "Lavado de lechuga"),
    blockMethod("lw-method", [
      step(
        "lw-s1",
        "Fill the wash sink with cold water and a chlorine tablet (50 ppm).",
        "Llene el lavabo con agua fría y una pastilla de cloro (50 ppm).",
      ),
      step(
        "lw-s2",
        "Submerge leaves for 90 s, agitating gently.",
        "Sumerja las hojas durante 90 segundos, agitando con cuidado.",
      ),
      step(
        "lw-s3",
        "Rinse twice in clean cold water.",
        "Enjuague dos veces en agua fría limpia.",
      ),
      step(
        "lw-s4",
        "Spin dry in the salad spinner: three short bursts, not one long one.",
        "Seque en la centrifugadora: tres ciclos cortos, no uno largo.",
        true,
      ),
    ]),
  ],
};

const pastaWaterBody: ProcedureBody = {
  blocks: [
    blockHeading(
      "pw-h",
      1,
      "Pasta water: salinity & temperature",
      "Agua de pasta: salinidad y temperatura",
    ),
    blockWarning(
      "pw-warn",
      "warn",
      "Pasta water must read 1.0–1.2 % salinity and 96 °C / 205 °F. Under-salted water is the single most common cause of inedible pasta.",
      "El agua de pasta debe marcar 1.0–1.2 % de salinidad y 96 °C. Un agua mal salada es la causa más común de pasta incomible.",
    ),
    blockMethod("pw-method", [
      step(
        "pw-s1",
        "Bring 4 L of water to a rolling boil per 500 g of dry pasta.",
        "Lleve 4 L de agua a hervor fuerte por cada 500 g de pasta seca.",
      ),
      step(
        "pw-s2",
        "Add 40 g of sea salt. That is the 1 % mark.",
        "Añada 40 g de sal de mar. Esa es la marca del 1 %.",
        true,
      ),
      step(
        "pw-s3",
        "Verify with the salinity refractometer; reject under 1.0 %.",
        "Verifique con el refractómetro de salinidad; rechace bajo 1.0 %.",
      ),
    ]),
  ],
};

const fryerOilBody: ProcedureBody = {
  blocks: [
    blockHeading("fo-h", 1, "Fryer oil change", "Cambio de aceite de freidora"),
    blockMethod("fo-method", [
      step(
        "fo-s1",
        "Filter the oil through the built-in filter every service.",
        "Filtre el aceite con el filtro integrado en cada servicio.",
      ),
      step(
        "fo-s2",
        "Top up with fresh oil when the level drops below the lower mark.",
        "Rellene con aceite nuevo cuando el nivel baje de la marca inferior.",
      ),
      step(
        "fo-s3",
        "Discard and replace fully when TPM falls below 12 % or colour goes dark amber.",
        "Deseche y reemplace por completo cuando el TPM caiga bajo 12 % o el color pase a ámbar oscuro.",
        true,
      ),
    ]),
  ],
};

const knifeSharpeningBody: ProcedureBody = {
  blocks: [
    blockHeading(
      "ks-h",
      1,
      "Knife sharpening & honing",
      "Afilado y mantenimiento de cuchillo",
    ),
    blockMethod("ks-method", [
      step(
        "ks-s1",
        "Hone on the rod before every shift: 5 passes each side, 20°.",
        "Afile en la varilla antes de cada turno: 5 pasadas por lado, 20°.",
      ),
      step(
        "ks-s2",
        "Whetstone once a week or when the hone no longer brings the edge back.",
        "Piedra de afilar una vez por semana o cuando la varilla ya no recupere el filo.",
        true,
      ),
      step(
        "ks-s3",
        "Strop on leather after whetstoning.",
        "Asiente en cuero después de la piedra.",
      ),
    ]),
  ],
};

const stockRotationBody: ProcedureBody = {
  blocks: [
    blockHeading(
      "sr-h",
      1,
      "Stock rotation (FIFO)",
      "Rotación de stock (PEPS)",
    ),
    blockMethod("sr-method", [
      step(
        "sr-s1",
        "Label every container with prep date and use-by date.",
        "Etiquete cada recipiente con fecha de preparación y fecha de uso.",
      ),
      step(
        "sr-s2",
        "New stock goes to the back; older stock moves to the front.",
        "El stock nuevo va atrás; el más viejo pasa al frente.",
      ),
      step(
        "sr-s3",
        "Discard anything past its use-by date. No exceptions.",
        "Deseche cualquier producto pasada su fecha de uso. Sin excepciones.",
        true,
      ),
    ]),
  ],
};

// Cleaning fundamentals — onboarding day-three course: end-of-service
// break-down, chemical handling, waste segregation, sign-off. Two critical
// steps (waste handling + missing log signature) so the auditor sees the
// shape of an orientation-grade course.
const cleaningSteps: ProcedureMethodStep[] = [
  step(
    "cl-s1",
    "Break down your station: empty pans, wipe cutting boards, return tools to the rack.",
    "Desmonte su estación: vacíe las bandejas, limpie las tablas y devuelva las herramientas a la rejilla.",
  ),
  step(
    "cl-s2",
    "Apply the colour-coded chemical: green for general surfaces, blue for restrooms, red for raw-protein only.",
    "Aplique el químico por color: verde para superficies generales, azul para baños, rojo solo para proteína cruda.",
  ),
  step(
    "cl-s3",
    "Segregate waste: food scraps to the green bin, cardboard flattened and stacked, fryer oil into the designated drum.",
    "Segregue los residuos: restos de comida al contenedor verde, cartón aplanado y apilado, aceite de freidora al tambor designado.",
    true,
  ),
  step(
    "cl-s4",
    "Sign the end-of-shift cleaning log. No signature means the station did not close — the next cook cannot start.",
    "Firme la bitácora de limpieza de fin de turno. Sin firma la estación no cerró — el siguiente cocinero no puede empezar.",
    true,
  ),
];

export const cleaningBody: ProcedureBody = {
  blocks: [
    blockHeading("cl-h", 1, "Cleaning fundamentals", "Fundamentos de limpieza"),
    blockText(
      "cl-intro",
      "End-of-service cleaning is the line between a clean open and a re-clean the next morning. Four steps, in order, signed by the cook who closed the station.",
      "La limpieza de fin de servicio es la línea entre una apertura limpia y un re-limpieza a la mañana siguiente. Cuatro pasos, en orden, firmados por el cocinero que cerró la estación.",
    ),
    blockWarning(
      "cl-warn",
      "warn",
      "Bleach and quat-based sanitisers do not mix. Never add one to a surface still wet from the other — rinse first, then apply the second.",
      "El cloro y los sanitizantes a base de amonio cuaternario no se mezclan. Nunca añada uno sobre una superficie aún mojada con el otro — enjuague primero, luego aplique el segundo.",
    ),
    blockMethod("cl-method", cleaningSteps),
  ],
};

export const cleaningAck: ProcedureAcknowledgement = {
  versionLabel: "v2026.09",
  statement: {
    en: "I have read the end-of-shift cleaning protocol and will follow the four steps and sign the log every close.",
    es: "He leído el protocolo de limpieza de fin de turno y seguiré los cuatro pasos y firmaré la bitácora en cada cierre.",
  },
};

export const mockSops: Procedure[] = [
  {
    id: "sop-001",
    slug: "lettuce-wash",
    titleEn: "Lettuce wash",
    titleEs: "Lavado de lechuga",
    purposeEn: "Sanitise and dry whole-leaf lettuce for cold prep.",
    purposeEs:
      "Desinfectar y secar hojas enteras de lechuga para la preparación en frío.",
    category: {
      id: "cat-prep",
      slug: "prep",
      nameEn: "Prep",
      nameEs: "Preparación",
      isArchived: false,
      kind: "general",
    },
    status: "published",
    stationScope: { mode: "all", stationIds: [] },
    bodyEn: lettuceWashBody,
    bodyEs: lettuceWashBody,
    createdBy: "admin-001",
    createdAt: "2026-05-10T08:00:00Z",
    updatedAt: "2026-08-22T08:00:00Z",
  },
  {
    id: "sop-002",
    slug: "pasta-water-salinity",
    titleEn: "Pasta water: salinity & temperature",
    titleEs: "Agua de pasta: salinidad y temperatura",
    purposeEn:
      "The 1 % salt rule and the rolling-boil rule, with salinity verification.",
    purposeEs:
      "La regla del 1 % de sal y la regla del hervor fuerte, con verificación de salinidad.",
    category: {
      id: "cat-pasta",
      slug: "pasta",
      nameEn: "Pasta",
      nameEs: "Pasta",
      isArchived: false,
      kind: "general",
    },
    status: "published",
    stationScope: { mode: "all", stationIds: [] },
    bodyEn: pastaWaterBody,
    bodyEs: pastaWaterBody,
    createdBy: "admin-001",
    createdAt: "2026-04-18T08:00:00Z",
    updatedAt: "2026-07-30T08:00:00Z",
  },
  {
    id: "sop-003",
    slug: "fryer-oil-change",
    titleEn: "Fryer oil change",
    titleEs: "Cambio de aceite de freidora",
    purposeEn: "When to filter, when to top up, and when to discard.",
    purposeEs: "Cuándo filtrar, cuándo rellenar y cuándo desechar.",
    category: {
      id: "cat-fryer",
      slug: "fryer",
      nameEn: "Fryer",
      nameEs: "Freidora",
      isArchived: false,
      kind: "general",
    },
    status: "published",
    stationScope: { mode: "all", stationIds: [] },
    bodyEn: fryerOilBody,
    bodyEs: fryerOilBody,
    createdBy: "admin-001",
    createdAt: "2026-03-22T08:00:00Z",
    updatedAt: "2026-09-02T08:00:00Z",
  },
  {
    id: "sop-004",
    slug: "knife-sharpening-honing",
    titleEn: "Knife sharpening & honing",
    titleEs: "Afilado y mantenimiento de cuchillo",
    purposeEn: "Daily honing on the rod, weekly whetstoning, and after-strop.",
    purposeEs: "Afilado diario en varilla, piedra semanal y asentado en cuero.",
    category: {
      id: "cat-knives",
      slug: "knives",
      nameEn: "Knives",
      nameEs: "Cuchillos",
      isArchived: false,
      kind: "general",
    },
    status: "published",
    stationScope: { mode: "all", stationIds: [] },
    bodyEn: knifeSharpeningBody,
    bodyEs: knifeSharpeningBody,
    createdBy: "admin-001",
    createdAt: "2026-02-12T08:00:00Z",
    updatedAt: "2026-08-10T08:00:00Z",
  },
  {
    id: "sop-005",
    slug: "stock-rotation-fifo",
    titleEn: "Stock rotation (FIFO)",
    titleEs: "Rotación de stock (PEPS)",
    purposeEn: "Label, rotate, and discard: the three rules of FIFO.",
    purposeEs: "Etiquetar, rotar y desechar: las tres reglas del PEPS.",
    category: {
      id: "cat-stock",
      slug: "stock",
      nameEn: "Stock",
      nameEs: "Inventario",
      isArchived: false,
      kind: "general",
    },
    status: "published",
    stationScope: { mode: "all", stationIds: [] },
    bodyEn: stockRotationBody,
    bodyEs: stockRotationBody,
    createdBy: "admin-001",
    createdAt: "2026-01-30T08:00:00Z",
    updatedAt: "2026-06-20T08:00:00Z",
  },
];

// ---------------------------------------------------------------------------
// Courses — Procedures with attachedToTraining: true.
// ---------------------------------------------------------------------------
