import {
  courseStepCount,
  effectiveStatus,
  findMockEmployee,
  getCourseById,
  listTrainingAssignments,
  listTrainingCourses,
} from "./mock-training";
import type {
  CourseProgressRow,
  EmployeeProgressRow,
  Procedure,
  ProgressCourseRef,
  ProgressStatus,
  TrainingAssignment,
  TrainingProgressData,
  TrainingProgressSummary,
} from "./types";

/**
 * The data behind `/admin/training/progress`, read from the in-memory store —
 * the mock stand-in for `GET /training/progress`. Pure selection over the same
 * assignments the Courses tab and the employee side use, so all three surfaces
 * agree until the backend replaces this module wholesale.
 */

/** Behind first: this page exists to find who is stuck, so overdue rows lead
 *  every list and the reader never scrolls to the problem. */
const STATUS_RANK: Record<ProgressStatus, number> = {
  overdue: 0,
  in_progress: 1,
  complete: 2,
};

/** One assignment as a progress row sees it: resolved against its course with
 *  the due-date check already applied. */
interface ResolvedAssignment {
  assignment: TrainingAssignment;
  course: Procedure;
  status: ProgressStatus;
}

/** Collapse the four-state assignment status into the tab's three. */
function progressStatusOf(
  assignment: TrainingAssignment,
  now: Date,
): ProgressStatus {
  const status = effectiveStatus(assignment, now);
  if (status === "complete") return "complete";
  if (status === "overdue") return "overdue";
  return "in_progress";
}

function resolve(
  assignments: TrainingAssignment[],
  now: Date,
): ResolvedAssignment[] {
  return assignments.flatMap((assignment) => {
    const course = getCourseById(assignment.courseId);
    // A course id that no longer resolves (archived out from under the
    // assignment) is dropped rather than rendered as a broken row.
    if (!course) return [];
    return [{ assignment, course, status: progressStatusOf(assignment, now) }];
  });
}

/** Which chapter the reader is on: everything they have ticked plus the one
 *  they are in the middle of. Capped at the course's step count; a course
 *  with no steps still has a first chapter to sit on. */
function chapterOf(assignment: TrainingAssignment, course: Procedure): number {
  const chapterCount = Math.max(courseStepCount(course), 1);
  return Math.min(assignment.completedStepIds.length + 1, chapterCount);
}

function courseRef(course: Procedure): ProgressCourseRef {
  return { id: course.id, titleEn: course.titleEn, titleEs: course.titleEs };
}

/** One status for the whole row: finished only when every item is, overdue as
 *  soon as one is (the worst state wins — it is the one that needs a tap). */
function rowStatus(statuses: ProgressStatus[]): ProgressStatus {
  if (statuses.length > 0 && statuses.every((s) => s === "complete")) {
    return "complete";
  }
  if (statuses.includes("overdue")) return "overdue";
  return "in_progress";
}

function buildSummary(
  assignments: TrainingAssignment[],
  now: Date,
): TrainingProgressSummary {
  const summary = { completed: 0, inProgress: 0, overdue: 0 };
  for (const assignment of assignments) {
    const status = progressStatusOf(assignment, now);
    if (status === "complete") summary.completed += 1;
    else if (status === "overdue") summary.overdue += 1;
    else summary.inProgress += 1;
  }
  return summary;
}

function buildEmployeeRows(
  assignments: TrainingAssignment[],
  now: Date,
): EmployeeProgressRow[] {
  const byEmployee = new Map<string, TrainingAssignment[]>();
  for (const assignment of assignments) {
    const list = byEmployee.get(assignment.employeeId) ?? [];
    list.push(assignment);
    byEmployee.set(assignment.employeeId, list);
  }

  const rows: EmployeeProgressRow[] = [];
  for (const [employeeId, list] of byEmployee) {
    const employee = findMockEmployee(employeeId);
    // The roster could drop someone the store still assigns to — no person,
    // no row (the Courses tab reports the course side of that).
    if (!employee) continue;

    const resolved = resolve(list, now);
    if (resolved.length === 0) continue;

    // "Where they are" = the unfinished course whose clock runs out first.
    const next = resolved
      .filter((r) => r.status !== "complete")
      .sort(
        (a, b) =>
          new Date(a.assignment.dueAt).getTime() -
          new Date(b.assignment.dueAt).getTime(),
      )[0];

    rows.push({
      employeeId,
      name: employee.name,
      station: employee.station,
      coursesDone: resolved.filter((r) => r.status === "complete").length,
      coursesTotal: resolved.length,
      currentCourse: next ? courseRef(next.course) : null,
      currentChapter: next ? chapterOf(next.assignment, next.course) : null,
      status: rowStatus(resolved.map((r) => r.status)),
    });
  }

  return rows.sort(
    (a, b) =>
      STATUS_RANK[a.status] - STATUS_RANK[b.status] ||
      a.name.localeCompare(b.name),
  );
}

/** The chapter the unfinished readers sit on: the most common one, ties going
 *  to the earlier chapter (the group is only as far along as its middle). */
function representativeChapter(
  unfinished: ResolvedAssignment[],
): number | null {
  if (unfinished.length === 0) return null;

  const counts = new Map<number, number>();
  for (const row of unfinished) {
    const chapter = chapterOf(row.assignment, row.course);
    counts.set(chapter, (counts.get(chapter) ?? 0) + 1);
  }

  let best = Number.POSITIVE_INFINITY;
  let bestCount = -1;
  for (const [chapter, count] of counts) {
    if (count > bestCount || (count === bestCount && chapter < best)) {
      best = chapter;
      bestCount = count;
    }
  }
  return best;
}

function buildCourseRows(
  assignments: TrainingAssignment[],
  now: Date,
): CourseProgressRow[] {
  const rows: CourseProgressRow[] = [];

  for (const course of listTrainingCourses()) {
    const resolved = resolve(
      assignments.filter((a) => a.courseId === course.id),
      now,
    );
    // Nobody assigned → no progress to report here.
    if (resolved.length === 0) continue;

    const unfinished = resolved.filter((r) => r.status !== "complete");
    rows.push({
      course: courseRef(course),
      peopleDone: resolved.length - unfinished.length,
      peopleTotal: resolved.length,
      currentChapter: representativeChapter(unfinished),
      status: rowStatus(resolved.map((r) => r.status)),
    });
  }

  return rows.sort(
    (a, b) =>
      STATUS_RANK[a.status] - STATUS_RANK[b.status] ||
      a.course.titleEn.localeCompare(b.course.titleEn),
  );
}

/** The whole Progress tab in one call. `now` is pinned per call so the stat
 *  cards, the tables and the overdue filter can never disagree about a date. */
export function buildTrainingProgress(
  now: Date = new Date(),
): TrainingProgressData {
  const assignments = listTrainingAssignments();
  return {
    summary: buildSummary(assignments, now),
    employees: buildEmployeeRows(assignments, now),
    courses: buildCourseRows(assignments, now),
  };
}
