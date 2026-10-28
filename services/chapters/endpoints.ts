export const CHAPTERS_ENDPOINTS = {
  LIST: "/api/v1/chapters",
  BY_COURSE: (courseId: string) => `/api/v1/courses/${courseId}/chapters`,
  GET: (id: string) => `/api/v1/chapters/${id}`,
  GET_IN_COURSE: (courseId: string, id: string) =>
    `/api/v1/courses/${courseId}/chapters/${id}`,
  DELETE: (id: string) => `/api/v1/chapters/${id}`,
  DELETE_IN_COURSE: (courseId: string, id: string) =>
    `/api/v1/courses/${courseId}/chapters/${id}`,
  REORDER_IN_COURSE: (courseId: string) =>
    `/api/v1/courses/${courseId}/chapters/reorder`,
} as const;
