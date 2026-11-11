import type { EmployeeTrainingItem } from "./training-view-types";
import type { EmployeeTrainingAssignment } from "@/services/courses/types";

/** Maps the employee-scoped API response into the training card view model. */
export function mapEmployeeTrainingAssignments(
  assignments: EmployeeTrainingAssignment[],
  locale: string,
): { pending: EmployeeTrainingItem[]; completed: EmployeeTrainingItem[] } {
  const isEs = locale === "es";
  const today = new Date().toISOString().slice(0, 10);

  const items: EmployeeTrainingItem[] = assignments
    .filter((assignment) => assignment.courseStatus !== "archived")
    .map((assignment) => {
      const complete = assignment.status === "complete";
      const title = isEs
        ? assignment.titleEs || assignment.titleEn
        : assignment.titleEn || assignment.titleEs;
      const purpose = isEs
        ? assignment.purposeEs || assignment.purposeEn
        : assignment.purposeEn || assignment.purposeEs;

      const now = new Date();
      now.setHours(0, 0, 0, 0);
      const dueDateObj = new Date(assignment.dueDate);
      dueDateObj.setHours(0, 0, 0, 0);
      const diffDays = Math.ceil(
        (dueDateObj.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
      );

      return {
        id: assignment.assignmentId,
        courseId: assignment.courseId,
        title,
        isRequired: assignment.isRequired,
        locked: assignment.locked ?? false,
        purpose: purpose || undefined,
        chapterCount: assignment.chapterCount,
        completedCount: assignment.completedChapterCount,
        progressPercent: assignment.progressPercent,
        nextChapterIndex: complete
          ? null
          : (assignment.currentChapterNumber ?? 1),
        status: complete
          ? "complete"
          : assignment.dueDate < today
            ? "overdue"
            : diffDays >= 0 && diffDays <= 3
              ? "due_soon"
              : assignment.completedChapterCount > 0
                ? "in_progress"
                : "not_started",
        dueAt: assignment.dueDate,
        completedAt: assignment.courseCompletedAt,
        estimatedMinutes: assignment.chapterCount * 5,
      };
    });

  // Required courses always float to the top of both tabs, then the
  // existing order (most progress first, closest due date first).
  const requiredFirst = (
    a: EmployeeTrainingItem,
    b: EmployeeTrainingItem,
  ): number => Number(b.isRequired) - Number(a.isRequired);

  const pending = items
    .filter((item) => item.status !== "complete")
    .sort(
      (a, b) =>
        requiredFirst(a, b) ||
        b.progressPercent - a.progressPercent ||
        a.dueAt.localeCompare(b.dueAt),
    );
  const completed = items
    .filter((item) => item.status === "complete")
    .sort(
      (a, b) =>
        requiredFirst(a, b) ||
        (b.completedAt ?? "").localeCompare(a.completedAt ?? ""),
    );

  return { pending, completed };
}
