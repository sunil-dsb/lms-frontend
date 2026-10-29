import type { EmployeeTrainingItem } from "./training-view-types";
import type { EmployeeTrainingAssignment } from "@/services/courses/types";

/** Maps the employee-scoped API response into the training card view model. */
export function mapEmployeeTrainingAssignments(
  assignments: EmployeeTrainingAssignment[],
  locale: string,
): { pending: EmployeeTrainingItem[]; completed: EmployeeTrainingItem[] } {
  const isEs = locale === "es";
  const today = new Date().toISOString().slice(0, 10);

  const items: EmployeeTrainingItem[] = assignments.map((assignment) => {
    const complete = assignment.status === "complete";
    const title = isEs
      ? assignment.titleEs || assignment.titleEn
      : assignment.titleEn || assignment.titleEs;
    const purpose = isEs
      ? assignment.purposeEs || assignment.purposeEn
      : assignment.purposeEn || assignment.purposeEs;

    return {
      id: assignment.assignmentId,
      courseId: assignment.courseId,
      title,
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
          : assignment.completedChapterCount > 0
            ? "in_progress"
            : "not_started",
      dueAt: assignment.dueDate,
      completedAt: assignment.courseCompletedAt,
      estimatedMinutes: assignment.chapterCount * 5,
    };
  });

  const pending = items
    .filter((item) => item.status !== "complete")
    .sort(
      (a, b) =>
        b.progressPercent - a.progressPercent || a.dueAt.localeCompare(b.dueAt),
    );
  const completed = items
    .filter((item) => item.status === "complete")
    .sort((a, b) => (b.completedAt ?? "").localeCompare(a.completedAt ?? ""));

  return { pending, completed };
}
