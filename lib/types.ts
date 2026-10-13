
export const ROLES = ['super_admin', 'manager', 'employee'] as const;
export type SystemRole = (typeof ROLES)[number];
export type EmployeeRole = (typeof ROLES)[number] | 'admin';
export type ClearanceLevel = 'general' | 'station' | 'confidential' | 'master';
export type LanguagePref = 'en' | 'es';
export type EmployeeStatus = 'pending' | 'active' | 'deactivated';
export type AccessLevel = 'employee' | 'manager';

export interface Employee {
  id: string;
  name: string;
  email?: string | null;
  locationId: string;
  accessLevel?: AccessLevel;
  roleIds: string[];
  jobIds?: string[];
  stationIds: string[];
  role: EmployeeRole;
  languagePref: LanguagePref;
  roleClearance?: ClearanceLevel | null;
  createdAt?: string;
  /** Denormalised names from GET /api/auth/me — prefer these over extra lookups. */
  stations?: Array<{ id: string; name: string }>;
  jobs?: Array<{ id: string; name: string }>;
}
export interface Role {
  id: string;
  name: string;
  clearanceLevel: ClearanceLevel;
  stationIds: string[];
  createdAt: string;
}

export interface Station {
  id: string;
  name: string;
  // Backend `stations` rows carry only `{ id, name }` — no location scoping,
  // sort order, or archive flag. The extras below are legacy UI-only fields
  // kept optional so older call sites still compile; new code must not rely
  // on them (fetchStations no longer fabricates them).
  locationId?: string;
  sortOrder?: number;
  isArchived?: boolean;
}

export interface Location {
  id: string;
  name: string;
}

export interface InviteResult {
  url: string;
  code: string;
  expiresAt: string;
}

export interface AdminEmployee extends Employee {
  employeeCode: string | null;
  status: EmployeeStatus;
  createdAt: string;
  deactivatedAt: string | null;
  locationName: string | null;
  /** Billed email. Optional because the create flow in
   *  `lib/api.ts → createEmployee` accepts an optional email — records
   *  seeded by the legacy mock layer carry no email until the next edit.
   *  The list page renders the value as a plain address when present and
   *  "No email on file" italic otherwise; the detail page falls back to `—`. */
  email?: string | null;
  /** Highest clearance level across all assigned job roles, surfaced in
   *  the admin list. `null` when the employee has no job roles. */
  roleClearance: ClearanceLevel | null;
}

export interface CreateEmployeeInput {
  name: string;
  email?: string | null;
  locationId: string;
  /** LMS access tier. Required. 'manager' implies elevated permissions;
   *  'admin' is not assignable through the employee invite flow. */
  accessLevel: AccessLevel;
  /** One or more job roles (Line Cook, Prep Cook, ...). The first entry
   *  is treated as the employee's primary role. */
  roleIds: string[];
  /** Zero or more station ids. Stations are scoped to `locationId`. */
  stationIds?: string[];
  employeeCode?: string | null;
  languagePref?: LanguagePref;
}

export interface ApiError {
  error: {
    code: string;
    message: string;
    lockedUntil?: string;
    /** Per-field validation details (paths + messages) returned by the
     *  backend on `INVALID_INPUT`. */
    details?: { path: string; message: string }[];
  };
}

// ============================================================================
// Settings CRUD inputs (mirror backend service input shapes)
// ============================================================================

export interface CreateStationInput {
  name: string;
  // Legacy UI-only extras — stripped before POST (backend accepts `{ name }`).
  locationId?: string;
  sortOrder?: number;
}

export interface UpdateStationInput {
  name?: string;
  // Legacy UI-only extras — never sent (backend PATCH accepts `{ name }`).
  sortOrder?: number;
  isArchived?: boolean;
}

export interface CreateRoleInput {
  name: string;
  // No backend equivalent (`jobs` carry `stationIds`, not a clearance tier).
  // Kept optional for backward compatibility; new code sends `stationIds`.
  clearanceLevel?: ClearanceLevel;
  /** Stations this role works on. Empty array = "any station". */
  stationIds?: string[];
}

export interface UpdateRoleInput {
  name?: string;
  clearanceLevel?: ClearanceLevel;
  stationIds?: string[];
}

export interface CreateLocationInput {
  name: string;
}

export interface UpdateLocationInput {
  name: string;
}

// ============================================================================
// Library — procedures (SOPs, recipes, training chapters)
// ============================================================================

export type ProcedureStatus = 'draft' | 'published';
export type ProcedureSeason = 'summer' | 'winter';
export type ActiveSeason = ProcedureSeason | null;

/** Manager-defined category. Slug is the stable handle (URL-safe, unique
 *  per location); `nameEn` / `nameEs` are the bilingual display labels.
 *  Soft archive via `isArchived` — procedures that referenced an archived
 *  category keep working and surface `null` on the read side. Icon lives
 *  in code, not here (see lib/category-icons.ts). */
export interface Subcategory {
  id: string;
  slug: string;
  nameEn: string;
  nameEs: string;
  categoryId?: string;
}

export interface Category {
  id: string;
  slug: string;
  nameEn: string;
  nameEs: string;
  icon?: string;
  isArchived: boolean;
  /** Whether the category applies to every station or is station-tied.
   *  `general` → subcategory procedures save with `stationScope: null`.
   *  `station-tied` → the procedure wizard's Access step pre-fills with the
   *  station the manager picked on the categories page. */
  kind: 'general' | 'station-tied';
  subcategories?: Subcategory[];
}

/** Text filled in for both languages. */
export interface Localised {
  en: string;
  es: string;
}

/** Same shape, each side optional (captions, alt text). */
export interface LocalisedOptional {
  en?: string;
  es?: string;
}

export interface CriticalLimit {
  label?: string;
  icon?: string;
  value: string;
  subtitle?: string;
  howToCheck: string;
  breachLabel: string;
  breachResponse: string;
}

export type ProcedureNoteKind = 'warn' | 'tip' | 'alt' | 'equip' | 'allergen';

/** A clip within a video file, pinned to a specific procedure step. */
export interface ProcedureVideoSegment {
  src: string;
  startSec: number;
  endSec: number;
}

/** Recipe internals — shared by recipe block and the legacy recipe shape. */
export interface ProcedureMethodStep {
  id?: string;
  body: Localised;
  critical?: boolean;
  criticalLimit?: CriticalLimit;
  videoSegment?: ProcedureVideoSegment;
  /**
   * Inline note attached to the step body — a warning that belongs to this
   * step (the avocado-stone knife warning sits inside step 2, the sesame
   * allergen note sits inside step 8), not a floating block at the foot of
   * the page. Renders as `.note-block` immediately after the step body.
   */
  note?: { severity: ProcedureNoteKind; body: Localised };
  /**
   * Photos attached directly to a single step. A photo of what the grill marks
   * should look like, a second angle of the plating — these are anchored to the
   * step that needs them, not floated somewhere else in the procedure. The
   * `images` array replaces the legacy single-slot `imageSrc`/`imageAlt`; the
   * renderer still reads the legacy fields so procedures written before the
   * array shipped keep rendering until they're re-saved.
   */
  images?: Array<{ src: string; alt: Localised; caption?: Localised }>;
  /** @deprecated Read by the renderer as the first image for back-compat. Use
   *  `images` instead. New writes go through `images`. */
  imageSrc?: string;
  /** @deprecated Read by the renderer as the first image's alt for back-compat. */
  imageAlt?: Localised;
  /** Optional phase label for the cook-mode eyebrow — e.g. "Prep", "Make",
   *  "Store". The cook-mode modal renders `{n} {phase}` instead of the bare
   *  `phaseFallback` label when this is set, so the cook can tell at a glance
   *  which section of the recipe they're in. The document view can also use
   *  it (e.g. a sub-heading) but it's primarily for cook mode. */
  phase?: Localised;
  /** Optional video attached to the step. Single-slot — a cook rarely needs two
   *  clips on the same step, and a second clip usually means it should be its
   *  own step. */
  videoSrc?: string;
  /** Short caption for the video (single string; bilingual is overkill here —
   *  the step body already carries the bilingual text). */
  videoCaption?: string;
  /** Optional timer the cook can start on this step. The chip floats in the
   *  header and the cook-mode screen while running; buzzes when it runs out.
   *  Persists across page reloads via the recipe block's localStorage slot. */
  timer?: { seconds: number; label: string };
  /** When true, the step's screen shows a "Labelled now, discard at …" label
   *  computed via Intl.DateTimeFormat for `now + discardAtHours`. */
  discardAt?: boolean;
  /** Number of hours from "now" until the batch must be discarded. Defaults
   *  to 48 when `discardAt: true` and this is omitted. */
  discardAtHours?: number;
  /** Pair of photos for a "right vs wrong" comparison. Renders as a side-by-
   *  side compare thumb in the document view and a side-by-side panel in
   *  cook mode, with the ok-half carrying a green bottom border and the
   *  no-half carrying a red one. Both photos still live in `images[]` for
   *  back-compat; this flag just groups them as a pair. */
  compareImages?: boolean;
}

export interface ProcedureAllergen {
  summary: string;
  detail: string;
  /** Structured list of allergens present (e.g. ['milk', 'eggs']). The
   *  summary/detail stay as free-form supplementary copy. */
  selectedAllergens?: string[];
}

export interface ProcedureYieldItem {
  label: string;
  value: string;
  unit?: string;
  /** Does this number multiply with the batch? Batch weight and portion count do;
   *  portion size and time do not. Absent means it holds steady. */
  scales?: boolean;
}

export interface ProcedureIngredient {
  name: string;
  form?: string;
  allergen?: boolean;
  unit?: string;
  amounts: string[];
}

// ============================================================================
// Block discriminated union
// ============================================================================

export type ProcedureImageHint = 'photo' | 'diagram';

export type ProcedureBlock =
  | { id: string; kind: 'text'; body: Localised }
  | { id: string; kind: 'heading'; level: 1 | 2 | 3; text: Localised }
  | { id: string; kind: 'method'; steps: ProcedureMethodStep[] }
  | {
      id: string;
      kind: 'ingredients';
      audience?: string;
      allergen?: ProcedureAllergen;
      yieldItems?: ProcedureYieldItem[];
      factors?: number[];
      ingredients: ProcedureIngredient[];
    }
  | {
      id: string;
      kind: 'recipe';
      audience?: string;
      allergen?: ProcedureAllergen;
      yieldItems?: ProcedureYieldItem[];
      factors?: number[];
      ingredients?: ProcedureIngredient[];
      steps: ProcedureMethodStep[];
    }
  | {
      id: string;
      kind: 'image';
      src: string;
      alt: Localised;
      caption?: LocalisedOptional;
      hint: ProcedureImageHint;
    }
  | { id: string; kind: 'video'; src: string; caption?: LocalisedOptional }
  | { id: string; kind: 'warning'; severity: ProcedureNoteKind; body: Localised }
  | { id: string; kind: 'attachment'; title: Localised; href: string; meta?: string }
  | { id: string; kind: 'table'; headers: Localised[]; rows: Localised[][] }
  | {
      id: string;
      kind: 'checklist';
      title?: LocalisedOptional;
      items: { id: string; text: Localised }[];
    };

export type ProcedureBlockKind = ProcedureBlock['kind'];

export interface ProcedureBody {
  blocks: ProcedureBlock[];
}

/** One quiz question. Bilingual prompt and choices. `correctChoiceId`
 *  references the choice the admin marked as right. */
export interface ProcedureQuizQuestion {
  id: string;
  prompt: Localised;
  question?: Localised;
  choices: { id: string; label: Localised }[];
  correctChoiceId: string;
}

/** Quiz attached to a procedure. `attached` is the manual toggle set by
 *  the admin in the wizard; visibility on the reader side is the OR of
 *  `attached` and `procedure.attachedToTraining` (either path renders it). */
export interface ProcedureQuiz {
  questions: ProcedureQuizQuestion[];
  attached: boolean;
}

/** A quiz row in the centralised `quizzes` table — the single source of
 *  truth for quiz data. Referenced by `Procedure.quizId` and (stage 3)
 *  by `Course.quizId`. Quizzes are never shared across procedures or
 *  courses; if the admin wants the same questions in two places, they
 *  author once and duplicate. Mirrors the legacy `ProcedureQuiz` authoring
 *  shape so `QuizEditor` and `QuizReader` work unchanged — the wizard
 *  authors `ProcedureQuiz` locally, and on save creates a `Quiz` row and
 *  stamps its id back onto the procedure. */
export interface Quiz {
  id: string;
  nameEn?: string;
  nameEs?: string;
  quizType?: string;
  questions: ProcedureQuizQuestion[];
  /** Manual toggle. Visibility on the read side is the OR of this flag
   *  and the parent procedure / course's training-attached flag. */
  attached: boolean;
  createdAt: string;
  updatedAt: string;
}

/** How the attached quiz surfaces on the employee side.
 *  - `'training'` (default): quiz only shows when the employee opens this SOP
 *    from inside its linked training course. Standalone reads hide it.
 *  - `'always'`: quiz surfaces on every read of the SOP, with completion
 *    state tracked per employee (stage 3 — collapse + completed badge UX).
 *  Ignored when `quizId` is null. */
export type ProcedureQuizMode = 'training' | 'always';

/** Which stations this procedure applies to. `mode: 'all'` means the
 *  procedure is shown to every station regardless of the cook's station
 *  assignment; `mode: 'specific'` with a non-empty `stationIds` narrows
 *  the audience to those stations only. The empty-arrays case
 *  (`mode: 'specific'`, `stationIds: []`) means "specific stations chosen
 *  later" — the wizard blocks submit when this state is reached for a
 *  station-specific subcategory. Mirrors the rule in the categories
 *  editor where a station-specific subcategory enforces at least one
 *  station when authored. */
/** Who can open a procedure. Everyone is the default and the usual case
 *  (PROJECT_OVERVIEW §02: "open to all employees by default. Restriction is a
 *  deliberate choice"). "some" admits anyone matching one of the lists. */
export interface ProcedureAudience {
  mode: 'everyone' | 'some';
  stationIds: string[];
  roleIds: string[];
  employeeIds: string[];
}

/** How closely a document is guarded. Confidential and master recipes carry
 *  the reader's watermark and log every view (§02 Recipe Confidentiality). */
export type ProcedureProtection = 'standard' | 'confidential' | 'master';

export interface ProcedureStationScope {
  mode: 'all' | 'specific';
  stationIds: string[];
}

export interface Procedure {
  id: string;
  slug: string;
  titleEn: string;
  titleEs: string;
  purposeEn: string;
  purposeEs: string;
  category: Category | null;
  status: ProcedureStatus;
  bodyEn: ProcedureBody;
  bodyEs: ProcedureBody;
  /** Per-procedure icon override. Stored as an R2 public URL when the
   *  backend persistence is wired; in the demo (no backend) it carries a
   *  session-scoped `blob:` URL. `null` means the category's default SVG
   *  art renders instead. */
  iconImageUrl?: string | null;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  /** FK to the subcategory under the chosen `category`. Two procedures
   *  in the same category can land in different subcategories (e.g.
   *  Food Safety → Hygiene vs Allergy). `null` means the procedure has
   *  no subcategory yet (legacy / draft before the wizard's 2-column
   *  picker landed). Backend will hold this as `subcategory_id text`
   *  (nullable). */
  subcategoryId?: string | null;
  /** Per-procedure station scope. The subcategory already carries a
   *  `stations?: string[]` hint — the procedure may narrow or widen it.
   *  Absent when the procedure is general (no station scope). */
  stationScope?: ProcedureStationScope | null;
  /** Monotonic publish version. Bumped server-side on every publish
   *  inside a SELECT FOR UPDATE transaction so two concurrent publishes
   *  don't both write N+1. Per PROJECT_OVERVIEW §02 SOP Library: "Every
   *  SOP prints cleanly for station posting, carrying a QR code that
   *  links back to the current version." Starts at 1. */
  version?: number;
  /** Soft-archive flag. Per PROJECT_OVERVIEW §02 Content Creation:
   *  "Content moves through draft, published and archived states."
   *  Archived procedures stay visible in the admin library under an
   *  opt-in filter for audit; the cook-side reader hides them. */
  isArchived?: boolean;
  /** Who can open it. Absent means everyone. */
  audience?: ProcedureAudience | null;
  /** Absent means standard. */
  protection?: ProcedureProtection;
  /** FK to the training course this SOP feeds into. `null` means the SOP
   *  is standalone — it is not part of any training plan and the employee
   *  only ever sees it via the library search. When non-null the linked
   *  training course is what gates quiz visibility per `quizMode`. The
   *  backend will add this column as `linked_training_id text` (nullable,
   *  no FK constraint yet — the `training_courses` table itself lands in
   *  stage 3, so the column stays free of the FK until then). */
  linkedTrainingId?: string | null;
  /** How the attached quiz surfaces on the employee side. Defaults to
   *  `'training'` for new procedures; ignored when `quizId` is null. See
   *  `ProcedureQuizMode` for the full rules. */
  quizMode?: ProcedureQuizMode;
  /** FK to the centralised `quizzes` table. `null` means no quiz attached.
   *  The wizard authors the quiz locally in form state, and on save
   *  creates a `Quiz` row via `createQuiz()` and stamps its id here. The
   *  backend persists this as `quiz_id text` (nullable). */
  quizId?: string | null;
  /** Station id this procedure is scoped to */
  stationId?: string | null;
  /** Denormalised station returned by backend */
  station?: { id: string; name: string } | null;
  /** Procedure cover/thumbnail image from backend */
  procedureImage?: string | null;
  /** Employee ids this procedure is directly assigned to (backend
   *  `assign_users`). Drives the "Assigned to you" section on the
   *  employee home and the matching browse filter. */
  assignUsers?: string[] | null;
  /** Server-computed flag: true when viewer is in assignUsers */
  isDirectlyAssigned?: boolean;
  /** Server-computed flag: true when viewer station matches stationId */
  isStationProcedure?: boolean;
  /** Whether this procedure is part of a training plan. Legacy field —
   *  kept until the training-course UI is reworked (employee phase). */
  attachedToTraining?: boolean;
  /** Procedure ids of SOPs / recipes this one references. Legacy
   *  training-course shape — kept until the Compliance / access model
   *  is finalised. Will become `linkedProcedureIds` for the SOP-only
   *  case once we decide whether SOPs link to other SOPs. */
  linkedSops?: string[];
  /** Acknowledgement gate at the end of a training course. Legacy —
   *  kept until training chapters own their own acknowledgement
   *  columns in the training-module slice (stage 3). */
  acknowledgement?: ProcedureAcknowledgement | null;
  /** Active seasons for seasonal recipes. */
  seasons?: ProcedureSeason[];
}

/** Course acknowledgement — the `I have read and understood` checkbox at
 *  the end of a regulated training chapter (DESIGN.md §3.4 `.ack` block). */
export interface ProcedureAcknowledgement {
  /** Human-readable version label, surfaced on the receipt (e.g. "v2026.09"). */
  versionLabel: string;
  /** Bilingual statement the employee is signing. */
  statement: Localised;
}

export interface CreateProcedureInput {
  titleEn: string;
  titleEs: string;
  purposeEn: string;
  purposeEs: string;
  categoryId: string | null;
  /** FK to the subcategory under `categoryId`. Required when the chosen
   *  subcategory belongs to a category that defines subcategories;
   *  optional otherwise. */
  subcategoryId?: string | null;
  stationId?: string | null;
  /** Every station this procedure is allocated to. General-category
   *  procedures carry ALL station ids; station-specific ones carry the
   *  single picked id. Sent alongside `stationId` — the current backend
   *  (zod non-strict) strips the array until multi-station lands, then
   *  it lights up with no further frontend change. */
  stationIds?: string[];
  procedureImage?: string | null;
  assignUsers?: string[];
  /** Per-procedure station scope. The subcategory carries a default
   *  hint; the procedure may narrow or widen it. Omit when the
   *  procedure has no station scope (general / subcategory is general). */
  stationScope?: ProcedureStationScope | null;
  status?: ProcedureStatus;
  bodyEn: ProcedureBody;
  bodyEs: ProcedureBody;
  /** Publish version to stamp on creation. Defaults to 1 on the server
   *  when omitted; the backend bumps it inside SELECT FOR UPDATE on every
   *  subsequent publish. The wizard never sets this explicitly — the
   *  server-side default is the contract. */
  version?: number;
  /** Soft-archive flag. Defaults to false on creation. The wizard never
   *  sets this explicitly — archive is a separate admin action (⋯ kebab
   *  → Archive → modal confirm). */
  isArchived?: boolean;
  /** Per-procedure icon override. R2 public URL when backend is wired;
   *  session-scoped blob URL in the demo. `null` = use category default. */
  iconImageUrl?: string | null;
  /** Who can open it. Absent means everyone. */
  audience?: ProcedureAudience | null;
  /** Absent means standard. */
  protection?: ProcedureProtection;
  /** Training course this SOP feeds into. `null` / omitted means
   *  standalone — no training plan attached. The wizard's Training &
   *  Quiz step captures this; leaving it unset is the default. */
  linkedTrainingId?: string | null;
  /** How the attached quiz surfaces on the employee side. Defaults to
   *  `'training'`. Ignored when `quiz` is null. The wizard's Training &
   *  Quiz step captures this with a radio pair (Training only / Always). */
  quizMode?: ProcedureQuizMode;
  /** FK to a `Quiz` row to attach on save. `null` / omitted means no quiz
   *  yet. The wizard authors the quiz locally in form state, calls
   *  `createQuiz()` first to materialise the row, and passes the returned
   *  id here. The backend persists this as `quiz_id text` (nullable). */
  quizId?: string | null;
  /** Marks this procedure as a training course (vs an SOP / recipe).
   *  Surfaces it in the admin Training list, makes the employee Training
   *  tab its home, and gates the optional quiz block on read. */
  attachedToTraining?: boolean;
  /** Procedure ids of SOPs / recipes referenced from this course.
   *  Legacy training-course shape. */
  linkedSops?: string[];
  /** Acknowledgement statement shown on read; null/undefined disables.
   *  Legacy training-course shape. */
  acknowledgement?: ProcedureAcknowledgement | null;
  /** Active seasons for seasonal recipes. */
  seasons?: ProcedureSeason[];
}

// ============================================================================
// Training — admin-authored courses (procedures with attachedToTraining)
// and the assignment surface that connects a course to an employee.
// ============================================================================

/** Per-employee progress on a single training course. `overdue` is a
 *  derived status (dueAt < now && !complete) so it does not need to be
 *  persisted — the admin UI computes it from `dueAt` and `status`. */
export type TrainingAssignmentStatus = 'due' | 'in_progress' | 'complete' | 'overdue';

export interface TrainingAssignment {
  id: string;
  /** `procedure.id` of the course (a Procedure where attachedToTraining is true). */
  courseId: string;
  employeeId: string;
  /** ISO timestamp — when the admin assigned the course. */
  assignedAt: string;
  /** ISO timestamp — soft deadline; the employee sees a `pill-due` until it,
   *  `pill-overdue` once passed without `complete`. */
  dueAt: string;
  /** Last non-terminal status from the employee side. The admin list
   *  re-derives `overdue` from `dueAt` — see TrainingAssignmentRow below. */
  status: Exclude<TrainingAssignmentStatus, 'overdue'>;
  /** Procedure step ids the employee marked done. Empty array until they
   *  start; the per-step list lets the receipt show "X of Y steps done"
   *  without leaking an overall % (forbidden by DESIGN.md §8). */
  completedStepIds: string[];
  quizPassedAt: string | null;
  acknowledgedAt: string | null;
}

export interface CreateTrainingAssignmentInput {
  courseId: string;
  employeeId: string;
  dueAt: string;
}

/** Aggregated row used by `/admin/training`. Avoids recomputing counts on
 *  every render and pins the date math to server load. */
export interface TrainingCourseRow {
  course: Procedure;
  assignmentCount: number;
  completeCount: number;
  inProgressCount: number;
  overdueCount: number;
}

/** Aggregated row used by `/employee/training`. `effectiveStatus` lifts
 *  the `dueAt < now && status !== 'complete'` check out of every pill. */
export interface TrainingAssignmentRow {
  assignment: TrainingAssignment;
  course: Procedure;
  effectiveStatus: TrainingAssignmentStatus;
}

// ============================================================================
// AI extraction types lived here while the document-import wizard shipped.
// The "Import a document" entry points in the UI are gone — the underlying
// Gemini extraction pipeline is not part of this build — and the types are
// reintroduced with that slice.
// ============================================================================
