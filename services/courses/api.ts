import http from "@/lib/http";
import { COURSES_ENDPOINTS } from "./endpoints";
import type {
  BackendCourse,
  CreateCourseInput,
  UpdateCourseInput,
  CoursesFilterOptions,
  PaginatedCoursesResponse,
} from "./types";

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
  }>(COURSES_ENDPOINTS.LIST, { params });

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
  mode: "add" | "replace" = "add",
): Promise<{ courseId: string; assignedCount: number; assignUsers: string[] }> {
  const { data } = await http.post<{
    success: boolean;
    message: string;
    data: { courseId: string; assignedCount: number; assignUsers: string[] };
  }>(COURSES_ENDPOINTS.ASSIGN(courseId), { employeeIds, mode });

  return data.data;
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
      chapters: backendChapters,
    });
  }
}
