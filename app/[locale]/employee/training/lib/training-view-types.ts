export type TrainingTabFilter = "pending" | "completed";

export type TrainingContentType =
  "checklist" | "quiz" | "procedure" | "video" | "file";

export interface EmployeeTrainingItem {
  id: string;
  courseId: string;
  title: string;
  isRequired: boolean;
  /** Locked while any required course is incomplete: show the block, disable the link. */
  locked: boolean;
  purpose?: string;
  stationTag?: string;
  chapterCount: number;
  completedCount: number;
  progressPercent: number;
  nextChapterIndex: number | null;
  status: "not_started" | "in_progress" | "due_soon" | "overdue" | "complete";
  dueAt: string;
  completedAt?: string | null;
  hasRecipeChapter?: boolean;
  estimatedMinutes?: number;
  contentTypes?: TrainingContentType[];
}
