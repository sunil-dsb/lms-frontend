export const COURSES_ENDPOINTS = {
  LIST: "/api/v1/courses",
  MY_TRAINING: "/api/v1/courses/my-training",
  MY_TRAINING_COURSE: (id: string) => `/api/v1/courses/my-training/${id}`,
  COMPLETE_CHAPTER: (courseId: string, chapterId: string) =>
    `/api/v1/courses/${courseId}/chapters/${chapterId}/complete`,
  GET: (id: string) => `/api/v1/courses/${id}`,
  CREATE: "/api/v1/courses",
  UPDATE: (id: string) => `/api/v1/courses/${id}`,
  ARCHIVE: (id: string) => `/api/v1/courses/${id}/archive`,
  UNARCHIVE: (id: string) => `/api/v1/courses/${id}/unarchive`,
  ASSIGN: (id: string) => `/api/v1/courses/${id}/assign`,
  ASSIGNMENTS: (id: string) => `/api/v1/courses/${id}/assignments`,
  PROGRESS: "/api/v1/courses/admin/progress",
  DELETE: (id: string) => `/api/v1/courses/${id}`,
} as const;
