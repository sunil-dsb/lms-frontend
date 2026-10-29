import type {
  AdminEmployee,
  Employee,
  EmployeeStatus,
  EmployeeRole,
  AccessLevel,
  CreateEmployeeInput,
  InviteResult,
} from "@/lib/types";

export type {
  AdminEmployee,
  Employee,
  EmployeeStatus,
  EmployeeRole,
  AccessLevel,
  CreateEmployeeInput,
  InviteResult,
};

export interface EmployeeFilterOptions {
  status?: EmployeeStatus | "all";
  q?: string;
}

export const EMPLOYEES_UPDATED_EVENT = "lms_employees_updated";

export interface UpdateEmployeeInput {
  name: string;
  email: string | null;
  locationId: string;
  accessLevel: AccessLevel;
  role: EmployeeRole;
  roleIds: string[];
  stationIds: string[];
}

/** One row of GET /api/v1/employees/:id/training — a training course the
 *  employee is assigned to, with derived per-course progress. `status` is
 *  the admin-facing state: `due` (assigned, nothing done), `in_progress`,
 *  `complete`, or `overdue` (`dueDate < today && !complete`). */
export interface EmployeeTrainingRow {
  assignmentId: string;
  courseId: string;
  titleEn: string;
  titleEs: string;
  purposeEn: string;
  purposeEs: string;
  courseStatus: "published" | "archived";
  /** "YYYY-MM-DD" soft deadline from the assignment. */
  dueDate: string;
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
  status: "due" | "in_progress" | "complete" | "overdue";
}
