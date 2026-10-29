export type TrainingTabFilter = "pending" | "completed";

export type TrainingContentType =
  "checklist" | "quiz" | "procedure" | "video" | "file";

export interface EmployeeTrainingItem {
  id: string;
  courseId: string;
  title: string;
  purpose?: string;
  stationTag?: string;
  chapterCount: number;
  completedCount: number;
  progressPercent: number;
  nextChapterIndex: number | null;
  status: "not_started" | "in_progress" | "complete" | "overdue";
  dueAt: string;
  completedAt?: string | null;
  hasRecipeChapter?: boolean;
  estimatedMinutes?: number;
  contentTypes?: TrainingContentType[];
}
