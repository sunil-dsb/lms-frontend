import type { TrainingAssignmentRow } from "@/lib/types";
import { courseStepCount } from "@/lib/mock-training";
import type { EmployeeTrainingItem } from "./training-view-types";

/**
 * Transforms backend TrainingAssignmentRow records into client-ready view models.
 * Decouples the UI components from specific backend entity shapes.
 */
export function mapTrainingAssignmentRows(
  rows: TrainingAssignmentRow[],
  locale: string,
): { pending: EmployeeTrainingItem[]; completed: EmployeeTrainingItem[] } {
  const isEs = locale === "es";

  // Deduplicate by courseId if the mock or API contains multiple assignments for the same course
  const seenCourses = new Map<string, TrainingAssignmentRow>();
  for (const r of rows) {
    const existing = seenCourses.get(r.course.id);
    if (!existing) {
      seenCourses.set(r.course.id, r);
    } else {
      // Prefer complete assignment, or later assignment
      if (
        r.effectiveStatus === "complete" &&
        existing.effectiveStatus !== "complete"
      ) {
        seenCourses.set(r.course.id, r);
      } else if (
        new Date(r.assignment.dueAt).getTime() >
        new Date(existing.assignment.dueAt).getTime()
      ) {
        seenCourses.set(r.course.id, r);
      }
    }
  }

  const items: EmployeeTrainingItem[] = Array.from(seenCourses.values()).map(
    (r) => {
      const c = r.course;
      const title =
        (isEs ? c.titleEs || c.titleEn : c.titleEn || c.titleEs) || c.slug;
      const purpose = (isEs ? c.purposeEs : c.purposeEn) || undefined;

      const rawStepCount = courseStepCount(c);
      const linkedCount = c.linkedSops?.length ?? 0;
      const chapterCount = Math.max(rawStepCount || linkedCount, 1);
      const completedCount = Math.min(
        r.assignment.completedStepIds.length,
        chapterCount,
      );

      const isComplete =
        r.effectiveStatus === "complete" || r.assignment.status === "complete";

      const progressPercent = isComplete
        ? 100
        : Math.round((completedCount / chapterCount) * 100);

      const nextChapterIndex =
        isComplete || progressPercent === 100
          ? null
          : Math.min(completedCount + 1, chapterCount);

      let status: EmployeeTrainingItem["status"];
      if (isComplete) {
        status = "complete";
      } else if (r.effectiveStatus === "overdue") {
        status = "overdue";
      } else if (completedCount > 0 || r.effectiveStatus === "in_progress") {
        status = "in_progress";
      } else {
        status = "not_started";
      }

      const hasRecipeChapter = Boolean(
        (c.bodyEn?.blocks ?? []).some((b) => b.kind === "recipe") ||
        (c.bodyEs?.blocks ?? []).some((b) => b.kind === "recipe"),
      );

      return {
        id: r.assignment.id,
        courseId: c.id,
        title,
        purpose,
        chapterCount,
        completedCount,
        progressPercent,
        nextChapterIndex,
        status,
        dueAt: r.assignment.dueAt,
        completedAt:
          r.assignment.acknowledgedAt ?? r.assignment.quizPassedAt ?? null,
        hasRecipeChapter,
      };
    },
  );

  const pending: EmployeeTrainingItem[] = [];
  const completed: EmployeeTrainingItem[] = [];

  for (const item of items) {
    if (item.status === "complete") {
      completed.push(item);
    } else {
      pending.push(item);
    }
  }

  // Sort pending: in_progress with highest percent first, then dueAt
  pending.sort((a, b) => {
    if (b.progressPercent !== a.progressPercent) {
      return b.progressPercent - a.progressPercent;
    }
    return new Date(a.dueAt).getTime() - new Date(b.dueAt).getTime();
  });

  // Sort completed: most recently completed first
  completed.sort((a, b) => {
    const atA = a.completedAt ? new Date(a.completedAt).getTime() : 0;
    const atB = b.completedAt ? new Date(b.completedAt).getTime() : 0;
    return atB - atA;
  });

  return { pending, completed };
}
