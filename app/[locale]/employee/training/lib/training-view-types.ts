export type TrainingTabFilter = "pending" | "completed";

export interface EmployeeTrainingItem {
  id: string;
  courseId: string;
  title: string;
  purpose?: string;
  chapterCount: number;
  completedCount: number;
  progressPercent: number;
  nextChapterIndex: number | null;
  status: "not_started" | "in_progress" | "complete" | "overdue";
  dueAt: string;
  completedAt?: string | null;
  hasRecipeChapter?: boolean;
}
