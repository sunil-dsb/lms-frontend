import { buildTrainingProgress } from "../mock-training-progress";
import type { TrainingProgressData } from "../types";

export const TRAINING_PROGRESS_ENDPOINTS = {
  PROGRESS: "/training/progress",
} as const;

export interface TrainingProgressResponse {
  success: boolean;
  data: TrainingProgressData;
}

/**
 * The Progress tab's data: stat counts plus the by-employee and by-course
 * rows. Mock today — it reads the in-memory store — and shaped exactly like
 * the backend response, so integration swaps the body below and nothing else.
 */
export async function fetchTrainingProgress(): Promise<TrainingProgressResponse> {
  // When backend endpoint is active:
  // const { data } = await http.get<TrainingProgressResponse>(TRAINING_PROGRESS_ENDPOINTS.PROGRESS);
  // return data;

  return { success: true, data: buildTrainingProgress() };
}
