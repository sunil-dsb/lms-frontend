export type TrainingCourseStatus = "published" | "archived";

export interface BackendChapter {
  id: string;
  courseId: string;
  number: number;
  titleEn: string;
  titleEs: string;
  subtitleEn?: string;
  subtitleEs?: string;
  blocks: unknown[];
  procedureId?: string | null;
  quizId?: string | null;
  quiz?: any | null;
  minCorrectAnswers?: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface BackendCourse {
  id: string;
  titleEn: string;
  titleEs: string;
  purposeEn: string;
  purposeEs: string;
  status: TrainingCourseStatus;
  assignUsers?: string[] | null;
  assignedCount?: number;
  createdBy?: string | null;
  createdAt: string;
  updatedAt: string;
  chapterCount?: number;
  quizCount?: number;
  hasQuiz?: boolean;
  chapters?: BackendChapter[];
}

export interface EmployeeTrainingAssignment {
  assignmentId: string;
  courseId: string;
  titleEn: string;
  titleEs: string;
  purposeEn: string;
  purposeEs: string;
  courseStatus: TrainingCourseStatus;
  dueDate: string;
  assignedAt: string;
  currentChapterId: string | null;
  courseCompletedAt: string | null;
  currentChapterNumber: number | null;
  currentChapterTitleEn: string | null;
  currentChapterTitleEs: string | null;
  chapterCount: number;
  completedChapterCount: number;
  progressPercent: number;
  status: "complete" | "in_progress";
}

export interface EmployeeTrainingChapter extends Omit<
  BackendChapter,
  "createdAt" | "updatedAt"
> {
  hasVideo: boolean;
  hasChecklist: boolean;
  hasRecipe: boolean;
  hasProcedure: boolean;
  hasQuiz: boolean;
  quizQuestionsCount: number;
}

export interface EmployeeTrainingCourseDetail {
  assignment: {
    id: string;
    dueDate: string;
    assignedAt: string;
    currentChapterId: string | null;
    courseCompletedAt: string | null;
    completedChapterCount: number;
    totalChapters: number;
    progressPercent: number;
    status: "complete" | "in_progress";
  };
  course: Pick<
    BackendCourse,
    "id" | "titleEn" | "titleEs" | "purposeEn" | "purposeEs"
  > & {
    chapters: EmployeeTrainingChapter[];
  };
}

export interface ChapterInput {
  id?: string;
  number: number;
  titleEn: string;
  titleEs: string;
  subtitleEn?: string;
  subtitleEs?: string;
  blocks?: unknown[];
  procedureId?: string | null;
  quizId?: string | null;
  minCorrectAnswers?: number | null;
}

export interface CreateCourseInput {
  titleEn: string;
  titleEs: string;
  purposeEn: string;
  purposeEs: string;
  assignUsers?: string[];
  chapters?: ChapterInput[];
}

export interface UpdateCourseInput {
  titleEn?: string;
  titleEs?: string;
  purposeEn?: string;
  purposeEs?: string;
  assignUsers?: string[];
  chapters?: ChapterInput[];
}

export interface CoursesFilterOptions {
  search?: string;
  status?: TrainingCourseStatus | string;
  assignment?: "all" | "assigned" | "unassigned";
  page?: number;
  limit?: number;
}

export interface AssignCoursePayload {
  courseId: string;
  employeeIds: string[];
  mode?: "add" | "replace";
}

export interface PaginatedCoursesResponse {
  items: BackendCourse[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  /** Filter-chip counts across the whole course table (all buckets),
   *  computed server-side so the chips stay right while only the visible
   *  bucket's page is fetched. */
  counts?: {
    all: number;
    assigned: number;
    unassigned: number;
    archived: number;
  };
}

/** One row of GET /api/v1/courses/:id/assignments — an employee assigned to
 *  a specific training course, with derived per-person progress. Chapter
 *  counts come from the course itself; `currentChapterNumber` from the row's
 *  current chapter pointer. */
export interface CourseAssignmentRow {
  id: string;
  courseId: string;
  employeeId: string;
  /** "YYYY-MM-DD" soft deadline from the assignment. */
  dueDate: string;
  /** Same value as `dueDate` — the alias the older consumers read. */
  dueAt: string;
  /** ISO timestamp — when the course was assigned. */
  assignedAt: string;
  currentChapterId: string | null;
  currentChapterNumber: number | null;
  currentChapterTitleEn: string | null;
  currentChapterTitleEs: string | null;
  courseCompletedAt: string | null;
  chapterCount: number;
  completedChapterCount: number;
  progressPercent: number;
  /** `complete`, `in_progress`, or `overdue` (past due, unfinished) — note it
   *  does not collapse an untouched course into `due` like the per-employee
   *  endpoint does; the table highlights chapter progress instead. */
  status: "complete" | "in_progress" | "overdue";
  employee: {
    id: string;
    name: string;
    email: string;
    status: "pending" | "active" | "deactivated";
  };
}
