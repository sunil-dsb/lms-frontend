import type { TrainingProgressData } from "../types";
import { fetchTrainingProgressApi } from "@/services/courses/api";

export const TRAINING_PROGRESS_ENDPOINTS = {
  PROGRESS: "/api/v1/courses/admin/progress",
} as const;

export interface TrainingProgressResponse {
  success: boolean;
  data: TrainingProgressData;
}

const emptyProgress: TrainingProgressData = {
  summary: { completed: 0, inProgress: 0, overdue: 0 },
  employees: [],
  courses: [],
};

/**
 * The Progress tab's data: stat counts plus the by-employee and by-course
 * rows, straight from the backend. The mock fallback is gone — when the call
 * fails the caller sees an all-zero summary (and the empty table state) rather
 * than invented people.
 * `cookieHeader` (server components): forward the request cookies so the
 * backend call is actually authenticated.
 */
export async function fetchTrainingProgress(
  cookieHeader?: string,
): Promise<TrainingProgressResponse> {
  try {
    const data = await fetchTrainingProgressApi(cookieHeader);
    if (data && data.summary) {
      return { success: true, data };
    }
  } catch (err) {
    console.warn("Backend training progress notice:", err);
  }

  return { success: true, data: emptyProgress };
}
