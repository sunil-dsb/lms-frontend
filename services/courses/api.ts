import http from "@/lib/http";
import type { TrainingProgressData } from "@/lib/types";
import { COURSES_ENDPOINTS } from "./endpoints";
import type {
  BackendCourse,
  CreateCourseInput,
  UpdateCourseInput,
  CoursesFilterOptions,
  PaginatedCoursesResponse,
  EmployeeTrainingCourseDetail,
  EmployeeTrainingResponse,
  CourseAssignmentRow,
} from "./types";

function authHeaders(
  cookieHeader?: string,
): Record<string, string> | undefined {
  if (!cookieHeader) return undefined;
  const headers: Record<string, string> = { Cookie: cookieHeader };
  const tokenMatch = cookieHeader.match(/(?:^|;\s*)lms_token=([^;]+)/);
  if (tokenMatch) {
    headers.Authorization = `Bearer ${decodeURIComponent(tokenMatch[1])}`;
  }
  return headers;
}

/** Fetch only the current employee's assigned courses. */
export async function fetchMyTraining(
  cookieHeader?: string,
): Promise<EmployeeTrainingResponse> {
  const { data } = await http.get<{
    success: boolean;
    data: EmployeeTrainingResponse;
  }>(COURSES_ENDPOINTS.MY_TRAINING, {
    headers: authHeaders(cookieHeader),
  });
  return data.data;
}

/** Fetch chapter content and progress for one course assigned to this employee. */
export async function fetchMyTrainingCourse(
  courseId: string,
  cookieHeader?: string,
): Promise<EmployeeTrainingCourseDetail> {
  const { data } = await http.get<{
    success: boolean;
    data: EmployeeTrainingCourseDetail;
  }>(COURSES_ENDPOINTS.MY_TRAINING_COURSE(courseId), {
    headers: authHeaders(cookieHeader),
  });
  return data.data;
}

/** Load the quiz through the existing quiz endpoint for the quiz runner. */
export async function fetchEmployeeQuiz(
  quizId: string,
  cookieHeader?: string,
): Promise<any | null> {
  const { data } = await http.get<{
    success: boolean;
    data: { quiz: any };
  }>(`/api/v1/quizzes/${quizId}`, {
    headers: authHeaders(cookieHeader),
  });
  return data.data.quiz;
}

/** Mark the employee's current chapter quiz complete and advance progress. */
export async function completeMyTrainingChapter(
  courseId: string,
  chapterId: string,
  cookieHeader?: string,
): Promise<{
  courseId: string;
  completedChapterId: string;
  currentChapterId: string | null;
  courseCompletedAt: string | null;
}> {
  const { data } = await http.post<{
    success: boolean;
    data: {
      courseId: string;
      completedChapterId: string;
      currentChapterId: string | null;
      courseCompletedAt: string | null;
    };
  }>(
    COURSES_ENDPOINTS.COMPLETE_CHAPTER(courseId, chapterId),
    {},
    { headers: authHeaders(cookieHeader) },
  );
  return data.data;
}

export function isUuid(val: string | null | undefined): boolean {
  if (!val) return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    val,
  );
}

/**
 * GET /api/v1/courses — Lists courses with search, status filter, and pagination
 */
export async function fetchCourses(
  options: CoursesFilterOptions = {},
  cookieHeader?: string,
): Promise<PaginatedCoursesResponse> {
  const params: Record<string, string | number> = {};
  if (options.search) params.search = options.search;
  if (options.status) params.status = options.status;
  if (options.assignment) params.assignment = options.assignment;
  if (options.page) params.page = options.page;
  if (options.limit) params.limit = options.limit;

  const { data } = await http.get<{
    success: boolean;
    message: string;
    data: PaginatedCoursesResponse;
  }>(COURSES_ENDPOINTS.LIST, { params, headers: authHeaders(cookieHeader) });

  return data.data;
}

// In-memory course cache and in-flight request deduplication to prevent duplicate API hits
const courseCache = new Map<
  string,
  { data: BackendCourse; timestamp: number }
>();
const courseInFlight = new Map<string, Promise<BackendCourse>>();

export function setCachedCourse(course: BackendCourse): void {
  if (!course?.id) return;
  courseCache.set(course.id, { data: course, timestamp: Date.now() });
}

export function clearCourseCache(id?: string): void {
  if (id) {
    courseCache.delete(id);
    courseInFlight.delete(id);
  } else {
    courseCache.clear();
    courseInFlight.clear();
  }
}

/**
 * GET /api/v1/courses/:id — Fetches a course by UUID along with its ordered chapters
 */
export async function fetchCourseById(
  id: string,
  bypassCache = false,
): Promise<BackendCourse> {
  if (!id) throw new Error("Course ID is required");

  if (!bypassCache) {
    const cached = courseCache.get(id);
    if (cached && Date.now() - cached.timestamp < 10000) {
      return cached.data;
    }
    const inFlight = courseInFlight.get(id);
    if (inFlight) {
      return inFlight;
    }
  }

  const promise = (async () => {
    try {
      const { data } = await http.get<{
        success: boolean;
        message: string;
        data: { course: BackendCourse };
      }>(COURSES_ENDPOINTS.GET(id));

      const course = data.data.course;
      courseCache.set(id, { data: course, timestamp: Date.now() });
      return course;
    } finally {
      courseInFlight.delete(id);
    }
  })();

  courseInFlight.set(id, promise);
  return promise;
}

/**
 * POST /api/v1/courses — Creates a new course with optional initial chapters
 */
export async function createCourse(
  input: CreateCourseInput,
): Promise<BackendCourse> {
  const { data } = await http.post<{
    success: boolean;
    message: string;
    data: { course: BackendCourse };
  }>(COURSES_ENDPOINTS.CREATE, input);

  const course = data.data.course;
  setCachedCourse(course);
  return course;
}

/**
 * PATCH /api/v1/courses/:id — Updates a course and optionally replaces chapter set
 */
export async function updateCourse(
  id: string,
  input: UpdateCourseInput,
): Promise<BackendCourse> {
  const { data } = await http.patch<{
    success: boolean;
    message: string;
    data: { course: BackendCourse };
  }>(COURSES_ENDPOINTS.UPDATE(id), input);

  const course = data.data.course;
  setCachedCourse(course);
  return course;
}

/**
 * POST /api/v1/courses/:id/archive — Archives a course
 */
export async function archiveCourse(id: string): Promise<BackendCourse> {
  const { data } = await http.post<{
    success: boolean;
    message: string;
    data: { course: BackendCourse };
  }>(COURSES_ENDPOINTS.ARCHIVE(id), {});

  return data.data.course;
}

/**
 * POST /api/v1/courses/:id/unarchive — Restores an archived course to published
 */
export async function unarchiveCourse(id: string): Promise<BackendCourse> {
  const { data } = await http.post<{
    success: boolean;
    message: string;
    data: { course: BackendCourse };
  }>(COURSES_ENDPOINTS.UNARCHIVE(id), {});

  return data.data.course;
}

/**
 * DELETE /api/v1/courses/:id — Hard deletes a course and all its chapters
 */
export async function deleteCourse(id: string): Promise<void> {
  await http.delete(COURSES_ENDPOINTS.DELETE(id));
}

/**
 * POST /api/v1/courses/:id/assign — Assigns or updates assigned employees on a training course
 */
export async function assignCourseApi(
  courseId: string,
  employeeIds: string[],
  dueDate?: string,
  mode: "add" | "replace" = "add",
  isRequired = false,
  stationIds?: string[],
): Promise<{ courseId: string; assignedCount: number; assignUsers: string[] }> {
  const payload: {
    employeeIds: string[];
    mode: "add" | "replace";
    isRequired: boolean;
    dueDate?: string;
    stationIds?: string[];
  } = {
    employeeIds,
    mode,
    isRequired,
  };
  if (dueDate) {
    payload.dueDate = dueDate;
  }
  if (stationIds) {
    payload.stationIds = stationIds;
  }

  const { data } = await http.post<{
    success: boolean;
    message: string;
    data: { courseId: string; assignedCount: number; assignUsers: string[] };
  }>(COURSES_ENDPOINTS.ASSIGN(courseId), payload);

  return data.data;
}

/**
 * POST /api/v1/courses/:id/unassign — Unassigns employees from a training course
 */
export async function unassignCourseApi(
  courseId: string,
  employeeIds: string[],
): Promise<{
  courseId: string;
  unassignedCount: number;
  remainingCount: number;
}> {
  const { data } = await http.post<{
    success: boolean;
    message: string;
    data: {
      courseId: string;
      unassignedCount: number;
      remainingCount: number;
    };
  }>(COURSES_ENDPOINTS.UNASSIGN(courseId), { employeeIds });

  return data.data;
}

/**
 * PATCH /api/v1/courses/:id/assignments — Changes the due date on existing
 * assignment rows (progress and membership untouched).
 */
export async function updateAssignmentDueDatesApi(
  courseId: string,
  employeeIds: string[],
  dueDate: string,
): Promise<{
  courseId: string;
  dueDate: string;
  updatedCount: number;
}> {
  const { data } = await http.patch<{
    success: boolean;
    message: string;
    data: {
      courseId: string;
      dueDate: string;
      updatedCount: number;
    };
  }>(COURSES_ENDPOINTS.ASSIGNMENTS(courseId), { employeeIds, dueDate });

  return data.data;
}

/**
 * GET /api/v1/courses/:id/assignments — Lists all assigned employees for a training course
 */
export async function fetchCourseAssignmentsApi(
  courseId: string,
  cookieHeader?: string,
): Promise<CourseAssignmentRow[]> {
  const { data } = await http.get<{
    success: boolean;
    message: string;
    data: CourseAssignmentRow[];
  }>(COURSES_ENDPOINTS.ASSIGNMENTS(courseId), {
    headers: authHeaders(cookieHeader),
  });

  return data.data ?? [];
}

/**
 * GET /api/v1/courses/admin/progress — Aggregated training progress for Admin Progress tab
 */
export type TrainingProgressOptions = {
  status?:
    | "complete"
    | "in_progress"
    | "overdue"
    | "not_started"
    | "due_soon"
    | "restricted";
  groupBy?: "employee" | "course";
  page?: number;
  limit?: number;
  search?: string;
  includeAssignments?: boolean;
};

export async function fetchTrainingProgressApi(
  cookieHeaderOrOptions?: string | TrainingProgressOptions,
  maybeOptions?: TrainingProgressOptions,
): Promise<TrainingProgressData> {
  let cookieHeader: string | undefined;
  let options: TrainingProgressOptions = {};

  if (typeof cookieHeaderOrOptions === "string") {
    cookieHeader = cookieHeaderOrOptions;
    options = maybeOptions ?? {};
  } else if (
    cookieHeaderOrOptions &&
    typeof cookieHeaderOrOptions === "object"
  ) {
    options = cookieHeaderOrOptions;
  } else if (maybeOptions && typeof maybeOptions === "object") {
    options = maybeOptions;
  }

  const headers: Record<string, string> = {};

  // The axios auth interceptor only sees the browser's cookies — server
  // components pass the request's Cookie header here explicitly, the same
  // way every other server-capable call does (makeHeaders / authHeaders).
  if (cookieHeader) {
    headers["Cookie"] = cookieHeader;
    const tokenMatch = cookieHeader.match(/(?:^|;\s*)lms_token=([^;]+)/);
    if (tokenMatch) {
      headers["Authorization"] = `Bearer ${decodeURIComponent(tokenMatch[1])}`;
    }
  }

  const { data } = await http.get<{
    success: boolean;
    message: string;
    data: TrainingProgressData;
  }>(COURSES_ENDPOINTS.PROGRESS, {
    headers: Object.keys(headers).length ? headers : undefined,
    params: options,
  });

  return data.data;
}

/**
 * Downloads a CSV compliance report from GET /api/v1/courses/admin/progress/export
 */
export async function downloadTrainingProgressCsvApi(options: {
  status?: string;
  groupBy?: "employee" | "course";
  search?: string;
}): Promise<void> {
  const params: Record<string, string> = {};
  if (options.status && options.status !== "all") {
    params.status = options.status;
  }
  if (options.groupBy) {
    params.groupBy = options.groupBy;
  }
  if (options.search) {
    params.search = options.search;
  }

  const response = await http.get<string>(
    `${COURSES_ENDPOINTS.PROGRESS}/export`,
    {
      params,
      responseType: "text",
    },
  );

  const blob = new Blob([response.data], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  const dateStr = new Date().toISOString().slice(0, 10);
  a.href = url;
  a.download = `training-compliance-${options.groupBy === "course" ? "courses" : "employees"}-${dateStr}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export interface SaveCourseChapterInput {
  id?: string;
  title: string;
  subtitle?: string;
  blocks?: any[];
  procedureSlug?: string;
  procedureId?: string | null;
  minCorrectAnswers?: number | null;
  quiz?: {
    attached?: boolean;
    minCorrectAnswers?: number;
    passingScorePercent?: number;
    questions?: any[];
  } | null;
  quizQuestions?: any[];
}

export interface SaveCourseInput {
  id?: string;
  name?: string;
  purpose?: string;
  titleEn?: string;
  titleEs?: string;
  purposeEn?: string;
  purposeEs?: string;
  assignUsers?: string[];
  stationIds?: string[];
  linkedSops?: string[];
  chapters?: SaveCourseChapterInput[];
}

/**
 * High-level save function: creates or updates a course and synchronizes its chapters.
 */
export async function saveCourse(
  input: SaveCourseInput,
): Promise<BackendCourse> {
  const cleanChapters = input.chapters
    ? JSON.parse(JSON.stringify(input.chapters))
    : [];

  // Persist any inline chapter quizzes so quiz questions are saved to the quiz API with quizType: 'course'
  for (const ch of cleanChapters) {
    if (ch.quiz?.questions && ch.quiz.questions.length > 0) {
      let targetQuizId = ch.quizId && isUuid(ch.quizId) ? ch.quizId : null;

      // Verify that targetQuizId does not belong to a procedure quiz
      if (targetQuizId) {
        try {
          const { getQuizById, fetchQuizById } =
            await import("@/lib/api/library");
          let existingQ = getQuizById(targetQuizId);
          if (!existingQ) {
            existingQ = await fetchQuizById(targetQuizId);
          }
          if (existingQ && existingQ.quizType === "procedure") {
            // NEVER overwrite a procedure quiz! Force new course quiz creation
            targetQuizId = null;
          }
        } catch {
          // ignore
        }
      }

      if (!targetQuizId) {
        try {
          const { createQuiz } = await import("@/lib/api/library");
          const { quiz: created } = await createQuiz({
            nameEn: `${ch.title || "Chapter"} Quiz`,
            nameEs: `${ch.title || "Capítulo"} Quiz`,
            quizType: "course",
            questions: ch.quiz.questions,
          });
          if (created?.id && isUuid(created.id)) {
            ch.quizId = created.id;
            if (ch.quiz) ch.quiz.id = created.id;
          }
        } catch (err) {
          console.warn("Failed to create inline chapter quiz:", err);
        }
      } else {
        try {
          const { updateQuiz } = await import("@/lib/api/library");
          await updateQuiz(targetQuizId, {
            nameEn: `${ch.title || "Chapter"} Quiz`,
            nameEs: `${ch.title || "Capítulo"} Quiz`,
            quizType: "course",
            questions: ch.quiz.questions,
          });
        } catch (err) {
          console.warn("Failed to update chapter quiz:", err);
        }
      }
    }
  }

  const backendChapters = cleanChapters.map((ch: any, idx: number) => ({
    ...(ch.id && isUuid(ch.id) ? { id: ch.id } : {}),
    number: idx + 1,
    titleEn: ch.title,
    titleEs: ch.title,
    subtitleEn: ch.subtitle || "",
    subtitleEs: ch.subtitle || "",
    blocks: ch.blocks || [],
    procedureId:
      ch.procedureId && isUuid(ch.procedureId) ? ch.procedureId : null,
    quizId:
      ch.quizId && isUuid(ch.quizId)
        ? ch.quizId
        : ch.quiz?.id && isUuid(ch.quiz.id)
          ? ch.quiz.id
          : null,
    minCorrectAnswers:
      ch.quiz?.minCorrectAnswers ?? ch.minCorrectAnswers ?? null,
  }));

  const titleEn = input.titleEn ?? input.name ?? "";
  const titleEs = input.titleEs ?? input.name ?? "";
  const purposeEn = input.purposeEn ?? input.purpose ?? "";
  const purposeEs = input.purposeEs ?? input.purpose ?? "";

  if (input.id && isUuid(input.id)) {
    return updateCourse(input.id, {
      titleEn,
      titleEs,
      purposeEn,
      purposeEs,
      ...(input.assignUsers !== undefined
        ? { assignUsers: input.assignUsers }
        : {}),
      ...(input.stationIds !== undefined
        ? { stationIds: input.stationIds }
        : {}),
      chapters: backendChapters,
    });
  } else {
    return createCourse({
      titleEn,
      titleEs,
      purposeEn,
      purposeEs,
      ...(input.assignUsers !== undefined
        ? { assignUsers: input.assignUsers }
        : {}),
      ...(input.stationIds !== undefined
        ? { stationIds: input.stationIds }
        : {}),
      chapters: backendChapters,
    });
  }
}

/**
 * Grants a temporary training override to unblock LMS access.
 */
export async function grantTrainingOverrideApi(
  employeeId: string,
  input: {
    overrideUntil: string;
    reason?: string;
    courseId?: string;
  },
): Promise<{
  success: boolean;
  overrideUntil: string;
  reason?: string | null;
}> {
  const { data } = await http.post<{
    success: boolean;
    data: { success: boolean; overrideUntil: string; reason?: string | null };
  }>(`/api/v1/courses/admin/override/${employeeId}`, input);
  return data.data;
}

/**
 * Revokes an active training override.
 */
export async function revokeTrainingOverrideApi(
  employeeId: string,
  courseId?: string,
): Promise<{ success: boolean }> {
  const { data } = await http.delete<{
    success: boolean;
    data: { success: boolean };
  }>(`/api/v1/courses/admin/override/${employeeId}`, {
    params: courseId ? { courseId } : undefined,
  });
  return data.data;
}
