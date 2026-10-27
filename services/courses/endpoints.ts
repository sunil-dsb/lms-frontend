export const COURSES_ENDPOINTS = {
  LIST: "/api/v1/courses",
  GET: (id: string) => `/api/v1/courses/${id}`,
  CREATE: "/api/v1/courses",
  UPDATE: (id: string) => `/api/v1/courses/${id}`,
  ARCHIVE: (id: string) => `/api/v1/courses/${id}/archive`,
  UNARCHIVE: (id: string) => `/api/v1/courses/${id}/unarchive`,
  ASSIGN: (id: string) => `/api/v1/courses/${id}/assign`,
  DELETE: (id: string) => `/api/v1/courses/${id}`,
} as const;
