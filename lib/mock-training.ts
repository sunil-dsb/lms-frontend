import { mockSops, mockTrainingAssignments, mockTrainingCourses, mockTrainingEmployees } from './mock-training-data';
export { mockSops, mockTrainingEmployees };
export type { MockEmployee } from './mock-training-data';
import type { MockEmployee } from './mock-training-data';
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
} from './types';

export function effectiveStatus(
  a: TrainingAssignment,
  now: Date = new Date(),
): TrainingAssignmentStatus {
  if (a.status === 'complete') return 'complete';
  if (new Date(a.dueAt).getTime() < now.getTime()) return 'overdue';
  return a.status;
}

export function listTrainingCourses(): Procedure[] {
  return mockTrainingCourses.filter((p) => p.attachedToTraining === true);
}

export function listTrainingAssignments(): TrainingAssignment[] {
  return mockTrainingAssignments;
}

export function listTrainingAssignmentsForCourse(courseId: string): TrainingAssignment[] {
  return mockTrainingAssignments.filter((a) => a.courseId === courseId);
}

export function listTrainingAssignmentsForEmployee(employeeId: string): TrainingAssignment[] {
  return mockTrainingAssignments.filter((a) => a.employeeId === employeeId);
}

export function getCourseById(id: string): Procedure | undefined {
  return mockTrainingCourses.find((c) => c.id === id);
}

export function getTrainingRowsForEmployee(
  employeeId: string,
  now: Date = new Date(),
): TrainingAssignmentRow[] {
  return listTrainingAssignmentsForEmployee(employeeId).flatMap((assignment) => {
    const course = getCourseById(assignment.courseId);
    if (!course) return [];
    return [
      {
        assignment,
        course,
        effectiveStatus: effectiveStatus(assignment, now),
      },
    ];
  });
}

export function getTrainingCourseRowsForAdmin(now: Date = new Date()): TrainingCourseRow[] {
  return listTrainingCourses().map((course) => {
    const assignments = listTrainingAssignmentsForCourse(course.id);
    return {
      course,
      assignmentCount: assignments.length,
      completeCount: assignments.filter((a) => a.status === 'complete').length,
      inProgressCount: assignments.filter((a) => {
        const s = effectiveStatus(a, now);
        return s === 'in_progress' || s === 'due';
      }).length,
      overdueCount: assignments.filter((a) => effectiveStatus(a, now) === 'overdue').length,
    };
  });
}

export function findMockEmployee(id: string): MockEmployee | undefined {
  return mockTrainingEmployees.find((e) => e.id === id);
}

/** Standalone SOPs an admin can link into a training course. Standalone
 *  means `attachedToTraining === false` (or undefined) — i.e. procedures
 *  that live in the library but are not on the Training tab. */
export function listAvailableSops(): Procedure[] {
  return mockSops.filter((p) => p.attachedToTraining !== true);
}

export function getSopById(id: string): Procedure | undefined {
  return mockSops.find((s) => s.id === id);
}

/** Resolve every SOP id in a course's `linkedSops` to its Procedure record.
 *  Missing ids are dropped (defensive — the admin could link a SOP that was
 *  later archived in the library). */
export function listLinkedSops(course: Procedure): Procedure[] {
  if (!course.linkedSops?.length) return [];
  const byId = new Map(mockSops.map((s) => [s.id, s]));
  return course.linkedSops
    .map((id) => byId.get(id))
    .filter((s): s is Procedure => Boolean(s));
}

/** Mark an assignment finished. Mock: changes the in-memory record the pages
 *  read, so Home, the Training tab and the admin side all see it until the dev
 *  server restarts. The backend will record date, score, attempts and the
 *  content version (PROJECT_OVERVIEW §02). */
export function completeAssignment(assignmentId: string, at: Date = new Date()): TrainingAssignment | null {
  const a = mockTrainingAssignments.find((x) => x.id === assignmentId);
  if (!a) return null;
  a.status = 'complete';
  a.acknowledgedAt = a.acknowledgedAt ?? at.toISOString();
  return a;
}

/** The steps a course asks the reader through: all its "Steps" blocks
 *  together, the ones the reader ticks off. What "2 of 5 steps" counts. */
export function courseStepCount(course: Procedure): number {
  const blocks = (course?.bodyEn?.blocks?.length ?? 0) > 0 ? course.bodyEn!.blocks : (course?.bodyEs?.blocks ?? []);
  return blocks.reduce((n, b) => n + (b.kind === 'method' ? b.steps?.length ?? 0 : 0), 0);
}

/** Tick or untick one step of a course. Mock: the in-memory record, like
 *  completeAssignment. A first tick moves a course from "not started" to "in
 *  progress". */
export function toggleAssignmentStep(assignmentId: string, stepId: string, done: boolean): TrainingAssignment | null {
  const a = mockTrainingAssignments.find((x) => x.id === assignmentId);
  if (!a || a.status === 'complete') return a ?? null;
  const set = new Set(a.completedStepIds);
  if (done) set.add(stepId);
  else set.delete(stepId);
  a.completedStepIds = [...set];
  if (a.completedStepIds.length > 0 && a.status === 'due') a.status = 'in_progress';
  return a;
}

// ---------------------------------------------------------------------------
// Onboarding — the gate every new hire clears before procedures unlock.
// Chapters in order; `food-safety` collapses two courses (handwashing +
// allergen awareness) into one chapter because a cook completes them
// together in week one.
// ---------------------------------------------------------------------------

export const ONBOARDING_COURSE_IDS = {
  onboarding: ['course-004'],
  'food-safety': ['course-001', 'course-003'],
  cleaning: ['course-005'],
} as const;

export type OnboardingChapterKey = keyof typeof ONBOARDING_COURSE_IDS;

export interface OnboardingChapter {
  key: OnboardingChapterKey;
  titleEn: string;
  titleEs: string;
  courseIds: readonly string[];
  rows: TrainingAssignmentRow[];
  status: TrainingAssignmentStatus | 'locked';
  unblocked: boolean;
}

export interface OnboardingSummary {
  chapters: OnboardingChapter[];
  done: number;
  total: number;
  /** First chapter with status !== 'complete', or null when all complete. */
  next: {
    chapterKey: OnboardingChapterKey;
    courseId: string;
    href: string;
    titleEn: string;
    titleEs: string;
  } | null;
  onboardingDone: boolean;
}

/**
 * Group this employee's onboarding assignments into chapters and resolve each
 * chapter's status. Returns `onboardingDone: true` when every chapter is
 * complete (or has no assignments, which we treat as complete — the cook was
 * never issued orientation, so there is nothing to gate).
 */
export function getOnboardingChapters(
  employeeId: string,
  now: Date = new Date(),
): OnboardingSummary {
  const allRows = getTrainingRowsForEmployee(employeeId, now);
  const chapters: OnboardingChapter[] = [];

  let previousComplete = true;
  let done = 0;

  (Object.keys(ONBOARDING_COURSE_IDS) as OnboardingChapterKey[]).forEach((key, index) => {
    const courseIds = ONBOARDING_COURSE_IDS[key];
    const rows = allRows.filter((r) => (courseIds as readonly string[]).includes(r.course.id));

    // Resolve status. A chapter with zero assignments is "complete" (nothing
    // to gate) — the cook was never issued it, so don't block the surface.
    let status: OnboardingChapter['status'];
    if (rows.length === 0) {
      status = 'complete';
    } else if (!previousComplete) {
      // A chapter that comes after a not-complete one is locked until the
      // earlier one clears, even if the cook already finished it.
      status = 'locked';
    } else if (rows.every((r) => r.effectiveStatus === 'complete')) {
      status = 'complete';
    } else if (rows.some((r) => r.effectiveStatus === 'overdue')) {
      status = 'overdue';
    } else if (rows.some((r) => r.effectiveStatus === 'in_progress')) {
      status = 'in_progress';
    } else {
      status = 'due';
    }

    const unblocked = previousComplete;
    const titleEn = ONBOARDING_CHAPTER_TITLES[key].en;
    const titleEs = ONBOARDING_CHAPTER_TITLES[key].es;

    chapters.push({ key, titleEn, titleEs, courseIds, rows, status, unblocked });
    if (status === 'complete') done += 1;
    previousComplete = status === 'complete' && unblocked;

    // Touch index so eslint doesn't flag the unused param (it documents the
    // iteration order of `Object.keys`, which we rely on).
    void index;
  });

  // The "next" pointer is the first incomplete chapter's first course. We use
  // the first course id in the chapter as the canonical entry point — every
  // chapter reads top-down.
  const nextChapter = chapters.find((c) => c.status !== 'complete' && c.status !== 'locked');
  const next: OnboardingSummary['next'] = nextChapter
    ? (() => {
        const firstCourseId = nextChapter.courseIds[0];
        const course = getCourseById(firstCourseId);
        return {
          chapterKey: nextChapter.key,
          courseId: firstCourseId,
          href: `/employee/training/${firstCourseId}`,
          titleEn: course?.titleEn ?? firstCourseId,
          titleEs: course?.titleEs ?? firstCourseId,
        };
      })()
    : null;

  return {
    chapters,
    done,
    total: chapters.length,
    next,
    onboardingDone: chapters.every((c) => c.status === 'complete'),
  };
}

const ONBOARDING_CHAPTER_TITLES: Record<OnboardingChapterKey, { en: string; es: string }> = {
  onboarding: { en: 'Onboarding', es: 'Inducción' },
  'food-safety': { en: 'Food safety', es: 'Seguridad alimentaria' },
  cleaning: { en: 'Cleaning', es: 'Limpieza' },
};
