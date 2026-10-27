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
  chapters?: BackendChapter[];
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
}
