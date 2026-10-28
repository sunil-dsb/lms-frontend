import http from "@/lib/http";
import { CHAPTERS_ENDPOINTS } from "./endpoints";
import type { BackendChapter, ChapterOrderItem } from "./types";

/**
 * Lists chapters, optionally filtered by course ID.
 */
export async function fetchChapters(
  courseId?: string,
): Promise<BackendChapter[]> {
  const endpoint = courseId
    ? CHAPTERS_ENDPOINTS.BY_COURSE(courseId)
    : CHAPTERS_ENDPOINTS.LIST;

  const { data } = await http.get<{
    success: boolean;
    data: { chapters: BackendChapter[] };
  }>(endpoint);

  return data.data.chapters;
}

/**
 * Fetches a single chapter by ID or chapter number within a course.
 */
export async function fetchChapterById(
  id: string,
  courseId?: string,
): Promise<BackendChapter> {
  const endpoint = courseId
    ? CHAPTERS_ENDPOINTS.GET_IN_COURSE(courseId, id)
    : CHAPTERS_ENDPOINTS.GET(id);

  const { data } = await http.get<{
    success: boolean;
    data: { chapter: BackendChapter };
  }>(endpoint);

  return data.data.chapter;
}

/**
 * Deletes a chapter by ID.
 */
export async function deleteChapter(
  id: string,
  courseId?: string,
): Promise<void> {
  const endpoint = courseId
    ? CHAPTERS_ENDPOINTS.DELETE_IN_COURSE(courseId, id)
    : CHAPTERS_ENDPOINTS.DELETE(id);
  await http.delete(endpoint);
}

/**
 * Reorders chapters within a course.
 */
export async function reorderChapters(
  courseId: string,
  orders: ChapterOrderItem[],
): Promise<BackendChapter[]> {
  const { data } = await http.patch<{
    success: boolean;
    data: { chapters: BackendChapter[] };
  }>(CHAPTERS_ENDPOINTS.REORDER_IN_COURSE(courseId), { orders });

  return data.data.chapters;
}
