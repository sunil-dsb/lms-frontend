export const JOBS_ENDPOINTS = {
  LIST: "/api/v1/jobs",
  STATIONS: "/api/v1/jobs/stations",
  CREATE: "/api/v1/jobs",
  UPDATE: (id: string) => `/api/v1/jobs/${id}`,
  DELETE: (id: string) => `/api/v1/jobs/${id}`,
} as const;
